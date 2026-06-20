from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    APP_NAME,
    APP_VERSION,
    UPLOAD_DIR,
    MAX_FILE_SIZE_MB,
)
from app.utils.logger import get_logger
from app.schemas import (
    DocumentResponse,
    HealthResponse,
    OllamaRequest,
    OllamaResponse,
    QueryRequest,
    QueryResponse,
    SystemInfoResponse,
)
from app.rag.generator import GenerationError, check_ollama_available, generate_general_answer
from app.rag.pipeline import RAGPipeline
from app.ingestion.loader import DocumentLoader
from app.ingestion.chunker import TextChunker
from app.models.embedding_model import EmbeddingModel
from app.ingestion.embedder import TextEmbedder
from app.vectorstore.faiss_store import FAISSStore

import shutil
import os
from pathlib import Path
from datetime import datetime

logger = get_logger(__name__)


def document_type(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    if ext == ".pdf":
        return "PDF"
    if ext == ".docx":
        return "DOCX"
    return "TXT"


def indexed_file_names(store: FAISSStore | None) -> set[str]:
    if store is None:
        return set()

    names = set()
    for item in getattr(store, "metadata", []):
        metadata = item.get("metadata", {})
        source = metadata.get("source") or metadata.get("file_name")
        if source:
            names.add(Path(str(source)).name)
    return names


def chunk_count(store: FAISSStore | None) -> int:
    if store is None:
        return 0
    return len(getattr(store, "metadata", []))


def create_app() -> FastAPI:
    app = FastAPI(
        title=APP_NAME,
        version=APP_VERSION,
    )

    # Allow cross-origin requests from local development servers.
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://localhost:\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize application state variables.
    app.state.index_ready = False
    app.state.embedding_model = None
    app.state.vector_store = None

    # Load models and vector indexes during application startup.
    @app.on_event("startup")
    async def startup_event():
        logger.info("Starting RAG Document Q&A API...")

        model = EmbeddingModel.load_model()
        app.state.embedding_model = model

        store = FAISSStore()
        loaded = store.load()

        app.state.vector_store = store
        app.state.index_ready = loaded

        if loaded:
            logger.info("FAISS index loaded and ready.")
        else:
            logger.info("No FAISS index found. Build index first.")

        logger.info("System initialized successfully.")


    @app.get("/health", response_model=HealthResponse)
    async def health_check():
        return HealthResponse(
            status="ok",
            message="RAG backend is running",
        )

    @app.get("/documents", response_model=list[DocumentResponse])
    async def list_documents():
        indexed_names = indexed_file_names(app.state.vector_store)
        documents = []

        for file_path in sorted(UPLOAD_DIR.glob("*"), key=lambda item: item.name.lower()):
            if not file_path.is_file():
                continue
            documents.append(
                DocumentResponse(
                    name=file_path.name,
                    type=document_type(file_path),
                    indexed=file_path.name in indexed_names,
                )
            )

        return documents

    @app.get("/system-info", response_model=SystemInfoResponse)
    async def system_info():
        documents = [file_path for file_path in UPLOAD_DIR.glob("*") if file_path.is_file()]
        llm_online = await check_ollama_available()

        return SystemInfoResponse(
            backend="online",
            vector_index=bool(app.state.index_ready),
            llm=llm_online,
            documents=len(documents),
            chunks=chunk_count(app.state.vector_store),
            last_updated=datetime.now().strftime("%I:%M %p").lstrip("0"),
        )

    # Validate and save the uploaded document to disk.
    @app.post("/upload")
    async def upload_file(file: UploadFile = File(...)):
        logger.info(f"Received upload request: {file.filename}")

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file provided."
            )

        allowed_extensions = [".pdf", ".docx", ".txt"]
        file_ext = os.path.splitext(file.filename)[1].lower()

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Only PDF, DOCX, TXT allowed."
            )

        # Ensure the file size does not exceed the allowed limit.
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)

        max_size_bytes = MAX_FILE_SIZE_MB * 1024 * 1024

        if file_size > max_size_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size is {MAX_FILE_SIZE_MB}MB."
            )

        safe_filename = Path(file.filename).name
        save_path = UPLOAD_DIR / safe_filename

        try:
            with open(save_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            logger.info(
                f"File saved successfully: {safe_filename}"
            )

            return {
                "filename": safe_filename,
                "message": "File uploaded successfully."
            }

        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")

            raise HTTPException(
                status_code=500,
                detail="Internal server error during file upload."
            )

    
    # Build a fresh vector index from all uploaded documents.
    
    @app.post("/build-index")
    async def build_index():
        store = app.state.vector_store
        model = app.state.embedding_model

        if store is None or model is None:
            raise HTTPException(
                status_code=500,
                detail="System not initialized."
            )

        all_chunks = []

        for file_path in UPLOAD_DIR.glob("*"):
            try:
                documents = DocumentLoader.load(file_path)
                chunks = TextChunker.chunk_documents(documents)
                all_chunks.extend(chunks)

            except Exception as e:
                logger.warning(
                    f"Skipping file {file_path.name}: {str(e)}"
                )

        if not all_chunks:
            raise HTTPException(
                status_code=400,
                detail="No valid documents found."
            )

        embeddings = TextEmbedder.embed_chunks(
            model,
            all_chunks
        )

        store.create_index(
            embedding_dim=embeddings.shape[1]
        )

        store.add_embeddings(
            embeddings,
            all_chunks
        )

        store.save()

        app.state.index_ready = True

        return {
            "total_chunks_indexed": len(all_chunks),
            "message": "Index built successfully."
        }

    # Retrieve relevant document chunks and generate a grounded answer.
    @app.post("/query", response_model=QueryResponse)
    async def query_documents(
        request: QueryRequest
    ):
        if (
            not request.question
            or not request.question.strip()
        ):
            raise HTTPException(
                status_code=400,
                detail="Question cannot be empty."
            )

        if not app.state.index_ready:
            raise HTTPException(
                status_code=400,
                detail="Index not built yet."
            )

        model = app.state.embedding_model
        store = app.state.vector_store

        if store is None or model is None:
            raise HTTPException(
                status_code=500,
                detail="System not initialized."
            )

        try:
            result = await RAGPipeline.answer_question(
                request.question,
                model,
                store,
            )

            return QueryResponse(**result)

        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )

        except Exception as e:
            logger.error(
                f"Query failed: {str(e)}"
            )

            raise HTTPException(
                status_code=500,
                detail="Failed to process query."
            )

    @app.post("/ask-ollama", response_model=OllamaResponse)
    async def ask_ollama(request: OllamaRequest):
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")
        if not request.document_answer.strip():
            raise HTTPException(status_code=400, detail="Document answer cannot be empty.")

        try:
            answer = await generate_general_answer(
                request.question,
                request.document_answer,
            )
            return OllamaResponse(answer=answer)

        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        except GenerationError:
            raise HTTPException(status_code=500, detail="Failed to generate Ollama explanation.")

    return app


app = create_app()
