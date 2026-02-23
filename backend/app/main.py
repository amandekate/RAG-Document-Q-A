from fastapi import FastAPI, UploadFile, File, HTTPException
from app.config import APP_NAME, APP_VERSION, UPLOAD_DIR, MAX_FILE_SIZE_MB
from app.utils.logger import get_logger
from app.schemas import HealthResponse
from app.rag.generator import generate_answer
from app.ingestion.loader import DocumentLoader
from pathlib import Path
from app.ingestion.chunker import TextChunker

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

    return app


app = create_app()
