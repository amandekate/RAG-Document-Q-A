export type Source = {
  file_name: string;
  page_number?: number | null;
};

export type ContextChunk = {
  text: string;
  file_name: string;
  page_number?: number | null;
  score: number;
};

export type QueryResponse = {
  answer: string;
  sources: Source[];
  context?: ContextChunk[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind?: "document" | "general" | "error";
  content: string;
  timestamp: string;
  question?: string;
  sources?: Source[];
  contextChunks?: ContextChunk[];
};

export type UploadedDocument = {
  name: string;
  type: "PDF" | "DOCX" | "TXT";
  indexed: boolean;
};

export type SystemStatus = {
  backend: "online" | "offline" | "checking";
  vectorIndex: "ready" | "not-ready" | "building";
  llm: "connected" | "unknown" | "error";
  documents: number;
  chunks: number;
  lastUpdated?: string;
};

export type BackendDocument = {
  name: string;
  type: "PDF" | "DOCX" | "TXT";
  indexed: boolean;
};

export type BackendSystemInfo = {
  backend: "online" | "offline";
  vector_index: boolean;
  llm: boolean;
  documents: number;
  chunks: number;
  last_updated: string;
};
