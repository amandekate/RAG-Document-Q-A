import httpx
from app.utils.logger import get_logger

logger = get_logger(__name__)

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "llama3"
FALLBACK_ANSWER = "I could not find relevant information in the uploaded documents."

SYSTEM_PROMPT = """
You are a document question answering assistant.

Answer ONLY using the provided context.
If the answer cannot be found in the context, say:
"I could not find relevant information in the uploaded documents."
Do not use outside knowledge. Do not hallucinate.
"""

GENERAL_PROMPT = """
You are Ollama, providing optional general knowledge expansion after a
document-grounded answer has already been shown.

Explain the topic clearly using general knowledge. Do not claim that your
response is sourced from the user's documents, and do not modify or regenerate
the document answer.
"""

class GenerationError(RuntimeError):
    pass

async def check_ollama_available(timeout_seconds: float = 2.0) -> bool:
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.get("http://127.0.0.1:11434/api/tags")
        return response.status_code < 500
    except Exception:
        return False

async def _call_ollama(prompt: str, timeout_seconds: float = 120.0) -> str:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(OLLAMA_URL, json=payload)

        response.raise_for_status()

        try:
            data = response.json()
        except ValueError as e:
            raise GenerationError("Ollama returned an invalid payload.") from e

        answer = data.get("response")

        if not isinstance(answer, str) or not answer.strip():
            raise GenerationError("Ollama returned an empty or invalid response.")

        return answer.strip()

    except (httpx.RequestError, httpx.TimeoutException) as e:
        logger.error(f"Ollama connection error: {str(e)}")
        raise GenerationError("Ollama service unavailable.") from e

    except httpx.HTTPStatusError as e:
        logger.error(f"Ollama returned an error response: {str(e)}")
        raise GenerationError("Ollama returned an error response.") from e

    except GenerationError:
        raise

    except Exception as e:
        logger.error(f"LLM generation failed: {str(e)}")
        raise GenerationError("Failed to generate answer.") from e

async def generate_answer(context: str, question: str) -> str:
    """
    Calls Ollama local API to generate answer from context.
    """
    if not context or not context.strip():
        return FALLBACK_ANSWER

    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    prompt = f"""
Context:
{context}

Question:
{question}

Answer:
"""

    return await _call_ollama(SYSTEM_PROMPT + prompt)

async def generate_general_answer(question: str, document_answer: str) -> str:
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    if not document_answer or not document_answer.strip():
        raise ValueError("Document answer cannot be empty.")

    prompt = f"""
Original question:
{question}

Document-grounded answer already shown to the user:
{document_answer}

General knowledge explanation:
"""

    return await _call_ollama(GENERAL_PROMPT + prompt, timeout_seconds=180.0)
