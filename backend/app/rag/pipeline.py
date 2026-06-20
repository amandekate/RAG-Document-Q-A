from app.rag.generator import FALLBACK_ANSWER, GenerationError, generate_answer
from app.rag.retriever import Retriever


class RAGPipeline:
    @staticmethod
    async def answer_question(question: str, model, store) -> dict:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty.")

        retrieved_chunks = Retriever.retrieve(question, model, store)

        if not retrieved_chunks:
            return {
                "answer": FALLBACK_ANSWER,
                "sources": [],
                "context": []
            }

        sources = []
        seen_sources = set()

        for chunk in retrieved_chunks:
            metadata = chunk["metadata"]
            source = {
                "file_name": metadata.get("file_name"),
                "page_number": metadata.get("page_number")
            }
            source_key = (source["file_name"], source["page_number"])

            if source["file_name"] and source_key not in seen_sources:
                sources.append(source)
                seen_sources.add(source_key)

        context_chunks = []
        for chunk in retrieved_chunks:
            metadata = chunk["metadata"]
            distance = chunk["distance"]
            context_chunks.append({
                "text": chunk["text"],
                "file_name": metadata.get("file_name"),
                "page_number": metadata.get("page_number"),
                "score": max(0.0, round(1.0 - (distance / 2.0), 4))
            })

        context = "\n\n".join(chunk["text"] for chunk in retrieved_chunks)

        try:
            answer = await generate_answer(context=context, question=question)
        except GenerationError:
            answer = RAGPipeline.extractive_answer(retrieved_chunks)

        return {
            "answer": answer,
            "sources": sources,
            "context": context_chunks
        }

    @staticmethod
    def extractive_answer(retrieved_chunks: list[dict]) -> str:
        excerpts = []
        for chunk in retrieved_chunks[:2]:
            text = " ".join(chunk["text"].split())
            if text:
                excerpts.append(text[:700])

        if not excerpts:
            return FALLBACK_ANSWER

        return (
            "Ollama is offline, so I could not generate a natural-language summary. "
            "Here are the most relevant retrieved document excerpts:\n\n"
            + "\n\n".join(f"- {excerpt}" for excerpt in excerpts)
        )
