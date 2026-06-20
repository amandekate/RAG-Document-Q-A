from app.config import SIMILARITY_THRESHOLD, TOP_K
from app.utils.logger import get_logger

logger = get_logger(__name__)


class Retriever:

    @staticmethod
    def retrieve(query: str, model, store):
        """
        Retrieve top-k relevant chunks from FAISS index
        based on similarity threshold.
        """

        if not query or not query.strip():
            raise ValueError("Query cannot be empty.")

        if store.index is None:
            raise RuntimeError("Vector index not initialized.")

        query_embedding = model.encode([query])[0].astype("float32")
        search_results = store.search(query_embedding, TOP_K)

        results = []

        for item in search_results:
            distance = item["distance"]

            if distance <= SIMILARITY_THRESHOLD:
                results.append({
                    "text": item["text"],
                    "metadata": item["metadata"],
                    "distance": distance
                })

        if not results:
            logger.info("No relevant chunks found above threshold.")
            return None

        return results
