from sentence_transformers import SentenceTransformer
from app.utils.logger import get_logger

logger = get_logger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"


class EmbeddingModel:
    _model = None

    @classmethod
    def load_model(cls):
        if cls._model is None:
            logger.info("Loading embedding model...")
            cls._model = SentenceTransformer(MODEL_NAME)
            logger.info("Embedding model loaded successfully.")
        return cls._model

    @classmethod
    def get_model(cls):
        if cls._model is None:
            raise RuntimeError("Embedding model not loaded.")
        return cls._model