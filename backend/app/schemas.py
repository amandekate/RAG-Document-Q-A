from pydantic import BaseModel
from typing import List, Optional

class HealthResponse(BaseModel):
    status: str
    message: str

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    sources: Optional[List[str]] = None