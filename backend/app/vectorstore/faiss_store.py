import faiss
import numpy as np
import pickle
from app.config import INDEX_DIR
from app.utils.logger import get_logger

logger = get_logger(__name__)


class FAISSStore:

    def __init__(self):
        self.index = None
        self.metadata = []

        self.index_path = INDEX_DIR / "faiss.index"
        self.metadata_path = INDEX_DIR / "metadata.pkl"

    def create_index(self, embedding_dim: int):
        logger.info("Creating new FAISS index...")
        self.index = faiss.IndexFlatL2(embedding_dim)
        self.metadata = []

    def add_embeddings(self, embeddings, chunks):
        if self.index is None:
            raise RuntimeError("FAISS index not initialized.")

        embeddings = np.array(embeddings).astype("float32")
        
        # Normalize embeddings so similarity scores remain consistent.
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings)

        for chunk in chunks:
            self.metadata.append({
                "text": chunk["text"],
                "metadata": chunk["metadata"]
            })

        logger.info(f"Added {len(embeddings)} embeddings to FAISS index.")

    def save(self):
        if self.index is None:
            raise RuntimeError("No index to save.")

        faiss.write_index(self.index, str(self.index_path))

        with open(self.metadata_path, "wb") as f:
            pickle.dump(self.metadata, f)

        logger.info("FAISS index saved to disk.")

    def load(self):
        if not self.index_path.exists() or not self.metadata_path.exists():
            logger.warning("No existing FAISS index found.")
            return False

        try:
            self.index = faiss.read_index(str(self.index_path))

            # Load persisted metadata alongside the FAISS index.
            with open(self.metadata_path, "rb") as f:
                self.metadata = pickle.load(f)

            logger.info("FAISS index loaded successfully.")
            return True

        except Exception as e:
            logger.error(f"Failed to load FAISS index: {str(e)}")
            return False

    def search(self, query_embedding, top_k: int):
        if self.index is None:
            raise RuntimeError("FAISS index not initialized.")

        query_embedding = np.array([query_embedding]).astype("float32")
        faiss.normalize_L2(query_embedding)

        distances, indices = self.index.search(query_embedding, top_k)

        results = []

        for i, idx in enumerate(indices[0]):
            if idx < len(self.metadata):
                results.append({
                    "text": self.metadata[idx]["text"],
                    "metadata": self.metadata[idx]["metadata"],
                    "distance": float(distances[0][i])
                })

        return results
