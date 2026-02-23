from app.utils.logger import get_logger

logger = get_logger(__name__)


class TextEmbedder:

    @staticmethod
    def embed_chunks(model, chunks: list):
        """
        Generates embeddings for chunked text.
        """
        if not chunks:
            raise ValueError("No chunks provided for embedding.")

        texts = [chunk["text"] for chunk in chunks]

        embeddings = model.encode(texts, show_progress_bar=False)

        if len(embeddings) != len(chunks):
            raise RuntimeError("Embedding count mismatch.")

        return embeddings