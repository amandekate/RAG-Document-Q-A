import httpx
from app.utils.logger import get_logger

logger = get_logger(__name__)

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "llama3"

SYSTEM_PROMPT = """
You are a document question answering assistant.

You must answer ONLY from the provided context.
If the answer is not found in the context, say:
"I couldn't find relevant information in the uploaded documents."

Do not use outside knowledge.
Be concise and accurate.
"""

async def generate_answer(context: str, question: str) -> str:
    """
    Calls Ollama local API to generate answer from context.
    """

    prompt = f"""
Context:
{context}

Question:
{question}

Answer:
"""

    payload = {
        "model": MODEL_NAME,
        "prompt": SYSTEM_PROMPT + prompt,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)

        response.raise_for_status()

        data = response.json()

        return data.get("response", "").strip()

    except httpx.RequestError as e:
        logger.error(f"Ollama connection error: {str(e)}")
        return "LLM service unavailable."

    except Exception as e:
        logger.error(f"LLM generation failed: {str(e)}")
        return "An error occurred during answer generation."