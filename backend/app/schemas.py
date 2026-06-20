from pydantic import BaseModel, Field
from typing import List, Optional

class HealthResponse(BaseModel):
    status: str
    message: str

class DocumentResponse(BaseModel):
    name: str
    type: str
    indexed: bool = False

class SystemInfoResponse(BaseModel):
    backend: str
    vector_index: bool
    llm: bool
    documents: int
    chunks: int
    last_updated: str

class QueryRequest(BaseModel):
    question: str

class OllamaRequest(BaseModel):
    question: str
    document_answer: str

class OllamaResponse(BaseModel):
    answer: str

class SourceResponse(BaseModel):
    file_name: str
    page_number: Optional[int] = None

class ContextChunkResponse(BaseModel):
    text: str
    file_name: str
    page_number: Optional[int] = None
    score: float

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceResponse] = Field(default_factory=list)
    context: List[ContextChunkResponse] = Field(default_factory=list)
