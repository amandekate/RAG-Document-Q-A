from app.config import CHUNK_SIZE, CHUNK_OVERLAP
from app.utils.logger import get_logger

logger = get_logger(__name__)


class TextChunker:

    @staticmethod
    def chunk_documents(documents: list) -> list:
        """
        Takes list of document sections from loader
        and returns list of chunked documents.
        """

        if not documents:
            raise ValueError("No documents provided for chunking.")

        chunks = []
        chunk_id = 0

        for doc in documents:
            text = doc["text"]
            metadata = doc["metadata"]

            start = 0
            text_length = len(text)

            if text_length <= CHUNK_SIZE:
                # Small document, keep as single chunk
                chunks.append({
                    "text": text,
                    "metadata": {
                        **metadata,
                        "chunk_id": chunk_id
                    }
                })
                chunk_id += 1
                continue

            step = CHUNK_SIZE - CHUNK_OVERLAP

            while start < text_length:
                end = start + CHUNK_SIZE
                chunk_text = text[start:end].strip()

                if chunk_text:
                    chunks.append({
                        "text": chunk_text,
                        "metadata": {
                            **metadata,
                            "chunk_id": chunk_id
                        }
                    })
                    chunk_id += 1

                start += step

        if not chunks:
            raise ValueError("Chunking produced no valid chunks.")

        logger.info(f"Total chunks created: {len(chunks)}")

        return chunks