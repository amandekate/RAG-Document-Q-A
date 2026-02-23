from fastapi import FastAPI, UploadFile, File, HTTPException
from app.config import APP_NAME, APP_VERSION, UPLOAD_DIR, MAX_FILE_SIZE_MB
from app.utils.logger import get_logger
from app.schemas import HealthResponse
from app.rag.generator import generate_answer
from app.ingestion.loader import DocumentLoader
from pathlib import Path
from app.ingestion.chunker import TextChunker
from app.models.embedding_model import EmbeddingModel
from app.ingestion.embedder import TextEmbedder
from app.vectorstore.faiss_store import FAISSStore


import shutil
import os

logger = get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=APP_NAME,
        version=APP_VERSION
    )

    # Global state placeholders
    app.state.index_ready = False
    app.state.embedding_model = None
    app.state.vector_store = None

    # -------------------------
    # Startup Event
    # -------------------------
    @app.on_event("startup")
    async def startup_event():
        logger.info("Starting RAG Document Q&A API...")

        # Load embedding model
        model = EmbeddingModel.load_model()
        app.state.embedding_model = model

        # Initialize FAISS store
        store = FAISSStore()
        loaded = store.load()

        app.state.vector_store = store
        app.state.index_ready = loaded

        if loaded:
            logger.info("FAISS index loaded and ready.")
        else:
            logger.info("No FAISS index found. Build index first.")

        logger.info("System initialized successfully.")
    
    # -------------------------
    # Health Check
    # -------------------------
    @app.get("/health", response_model=HealthResponse)
    async def health_check():
        return HealthResponse(
            status="ok",
            message="RAG backend is running"
        )

    # -------------------------
    # File Upload Endpoint
    # -------------------------
    @app.post("/upload")
    async def upload_file(file: UploadFile = File(...)):
        logger.info(f"Received upload request: {file.filename}")

        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided.")

        allowed_extensions = [".pdf", ".docx", ".txt"]
        file_ext = os.path.splitext(file.filename)[1].lower()

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Only PDF, DOCX, TXT allowed."
            )

        # Check file size
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)

        max_size_bytes = MAX_FILE_SIZE_MB * 1024 * 1024

        if file_size > max_size_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size is {MAX_FILE_SIZE_MB}MB."
            )

        save_path = UPLOAD_DIR / file.filename

        try:
            with open(save_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            logger.info(f"File saved successfully: {file.filename}")

            return {
                "filename": file.filename,
                "message": "File uploaded successfully."
            }

        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Internal server error during file upload."
            )

    # -------------------------
    # Test LLM Route
    # -------------------------
    @app.get("/test-llm")
    async def test_llm():
        context = "Machine learning is a subset of artificial intelligence."
        question = "What is machine learning?"

        answer = await generate_answer(context, question)

        return {"answer": answer}

    @app.get("/test-loader/{filename}")
    async def test_loader(filename: str):
        file_path = UPLOAD_DIR / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found.")

        try:
            pages = DocumentLoader.load(file_path)

            preview = []
            for item in pages[:2]:  # first 2 sections
                preview.append({
                    "metadata": item["metadata"],
                    "preview_text": item["text"][:300]
                })

            return {
                "total_sections": len(pages),
                "preview": preview
            }

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    @app.get("/test-chunk/{filename}")
    async def test_chunk(filename: str):
        file_path = UPLOAD_DIR / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found.")

        try:
            documents = DocumentLoader.load(file_path)
            chunks = TextChunker.chunk_documents(documents)

            preview = []
            for chunk in chunks[:3]:
                preview.append({
                    "metadata": chunk["metadata"],
                    "preview_text": chunk["text"][:200]
                })

            return {
                "total_chunks": len(chunks),
                "preview": preview
            }

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
        
    @app.get("/test-embed/{filename}")
    async def test_embed(filename: str):
        file_path = UPLOAD_DIR / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found.")

        documents = DocumentLoader.load(file_path)
        chunks = TextChunker.chunk_documents(documents)

        model = app.state.embedding_model
        embeddings = TextEmbedder.embed_chunks(model, chunks)

        return {
            "total_chunks": len(chunks),
            "embedding_shape": list(embeddings.shape)
        }
    
    @app.get("/test-faiss/{filename}")
    async def test_faiss(filename: str):
        file_path = UPLOAD_DIR / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found.")

        documents = DocumentLoader.load(file_path)
        chunks = TextChunker.chunk_documents(documents)

        model = app.state.embedding_model
        embeddings = TextEmbedder.embed_chunks(model, chunks)

        # Initialize FAISS
        store = FAISSStore()
        store.create_index(embedding_dim=embeddings.shape[1])
        store.add_embeddings(embeddings, chunks)

        # Test search using first chunk as query
        query_embedding = embeddings[0]
        results = store.search(query_embedding, top_k=3)

        return {
            "total_chunks": len(chunks),
            "search_results": results
        }
        
    @app.post("/build-index")
    async def build_index():
        store = app.state.vector_store
        model = app.state.embedding_model

        if store is None or model is None:
            raise HTTPException(status_code=500, detail="System not initialized.")

        all_chunks = []

        # Load all files from uploads directory
        for file_path in UPLOAD_DIR.glob("*"):
            try:
                documents = DocumentLoader.load(file_path)
                chunks = TextChunker.chunk_documents(documents)
                all_chunks.extend(chunks)
            except Exception as e:
                logger.warning(f"Skipping file {file_path.name}: {str(e)}")

        if not all_chunks:
            raise HTTPException(status_code=400, detail="No valid documents found.")

        embeddings = TextEmbedder.embed_chunks(model, all_chunks)

        # Create fresh index
        store.create_index(embedding_dim=embeddings.shape[1])
        store.add_embeddings(embeddings, all_chunks)
        store.save()

        app.state.index_ready = True

        return {
            "total_chunks_indexed": len(all_chunks),
            "message": "Index built successfully."
        }

    return app


app = create_app()
