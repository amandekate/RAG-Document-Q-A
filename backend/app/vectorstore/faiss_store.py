import faiss
import numpy as np
import pickle
from pathlib import Path
from app.config import INDEX_DIR
from app.utils.logger import get_logger

logger = get_logger(__name__)


class FAISSStore:

    def __init__(self):
        self.index = None
        self.metadata = []

        self.index_path = INDEX_DIR / "faiss.index"
        self.metadata_path = INDEX_DIR / "metadata.pkl"

    # --------------------------
    # Create New Index
    # --------------------------
    def create_index(self, embedding_dim: int):
        logger.info("Creating new FAISS index...")
        self.index = faiss.IndexFlatL2(embedding_dim)
        self.metadata = []

    # --------------------------
    # Add Embeddings
    # --------------------------
    def add_embeddings(self, embeddings, chunks):
        if self.index is None:
            raise RuntimeError("FAISS index not initialized.")

        embeddings = np.array(embeddings).astype("float32")

        self.index.add(embeddings)

        for chunk in chunks:
            self.metadata.append({
                "text": chunk["text"],
                "metadata": chunk["metadata"]
            })

        logger.info(f"Added {len(embeddings)} embeddings to FAISS index.")

    # --------------------------
    # Save Index to Disk
    # --------------------------
    def save(self):
        if self.index is None:
            raise RuntimeError("No index to save.")

        faiss.write_index(self.index, str(self.index_path))

        with open(self.metadata_path, "wb") as f:
            pickle.dump(self.metadata, f)

        logger.info("FAISS index saved to disk.")

    # --------------------------
    # Load Index from Disk
    # --------------------------
    def load(self):
        if not self.index_path.exists() or not self.metadata_path.exists():
            logger.warning("No existing FAISS index found.")
            return False

        try:
            self.index = faiss.read_index(str(self.index_path))

            with open(self.metadata_path, "rb") as f:
                self.metadata = pickle.load(f)

            logger.info("FAISS index loaded successfully.")
            return True

        except Exception as e:
            logger.error(f"Failed to load FAISS index: {str(e)}")
            return False

    # --------------------------
    # Search
    # --------------------------
    def search(self, query_embedding, top_k: int):
        if self.index is None:
            raise RuntimeError("FAISS index not initialized.")

        query_embedding = np.array([query_embedding]).astype("float32")

        distances, indices = self.index.search(query_embedding, top_k)

        results = []

        for i, idx in enumerate(indices[0]):
            if idx < len(self.metadata):
                results.append({
                    "metadata": self.metadata[idx],
                    "distance": float(distances[0][i])
                })

        return results