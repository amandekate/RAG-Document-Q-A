import numpy as np
import faiss
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

        # Encode query
        query_embedding = model.encode([query])[0].astype("float32")

        # Convert to 2D numpy array
        query_embedding = np.array([query_embedding])

        # Normalize query embedding (must match normalized index)
        faiss.normalize_L2(query_embedding)

        # Search FAISS
        distances, indices = store.index.search(
            query_embedding,
            TOP_K
        )

        results = []

        for i, idx in enumerate(indices[0]):
            if idx >= len(store.metadata):
                continue

            distance = float(distances[0][i])

            # Apply similarity threshold
            if distance <= SIMILARITY_THRESHOLD:
                results.append({
                    "text": store.metadata[idx]["text"],
                    "metadata": store.metadata[idx]["metadata"],
                    "distance": distance
                })

        if not results:
            logger.info("No relevant chunks found above threshold.")
            return None

        return results