import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
INDEX_DIR = DATA_DIR / "index"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
INDEX_DIR.mkdir(parents=True, exist_ok=True)

APP_NAME = "RAG Document Q&A API"
APP_VERSION = "1.0.0"

MAX_FILE_SIZE_MB = 10
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

SIMILARITY_THRESHOLD = 1.5
TOP_K = 3

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")