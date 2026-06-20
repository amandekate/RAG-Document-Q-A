import fitz  # PyMuPDF
from docx import Document
from pathlib import Path
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DocumentLoader:

    @staticmethod
    def load(file_path: Path) -> list:
        """
        Loads document and returns list of pages/sections with metadata.
        """
        suffix = file_path.suffix.lower()

        if suffix == ".pdf":
            return DocumentLoader._load_pdf(file_path)

        elif suffix == ".docx":
            return DocumentLoader._load_docx(file_path)

        elif suffix == ".txt":
            return DocumentLoader._load_txt(file_path)

        else:
            raise ValueError("Unsupported file type")

    @staticmethod
    def _load_pdf(file_path: Path) -> list:
        try:
            doc = fitz.open(file_path)
            pages = []

            for page_number in range(len(doc)):
                page = doc.load_page(page_number)
                text = page.get_text().strip()

                if text:
                    pages.append({
                        "text": text,
                        "metadata": {
                            "file_name": file_path.name,
                            "page_number": page_number + 1,
                            "file_type": "pdf"
                        }
                    })

            doc.close()

            if not pages:
                raise ValueError("PDF contains no readable text.")

            return pages

        except Exception as e:
            logger.error(f"Failed to load PDF: {str(e)}")
            raise

    @staticmethod
    def _load_docx(file_path: Path) -> list:
        try:
            document = Document(file_path)
            full_text = "\n".join([para.text for para in document.paragraphs]).strip()

            if not full_text:
                raise ValueError("DOCX contains no readable text.")

            return [{
                "text": full_text,
                "metadata": {
                    "file_name": file_path.name,
                    "page_number": None,
                    "file_type": "docx"
                }
            }]

        except Exception as e:
            logger.error(f"Failed to load DOCX: {str(e)}")
            raise

    @staticmethod
    def _load_txt(file_path: Path) -> list:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read().strip()

            if not text:
                raise ValueError("TXT file is empty.")

            return [{
                "text": text,
                "metadata": {
                    "file_name": file_path.name,
                    "page_number": None,
                    "file_type": "txt"
                }
            }]

        except Exception as e:
            logger.error(f"Failed to load TXT: {str(e)}")
            raise