import { API_BASE_URL } from "@/lib/constants";
import type { BackendDocument, BackendSystemInfo, QueryResponse } from "@/lib/types";

async function parseError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.detail ?? fallback;
  } catch {
    return fallback;
  }
}

export async function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Upload failed."));
  }

  return response.json() as Promise<{ filename: string; message: string }>;
}

export async function getDocuments() {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load documents."));
  }

  return response.json() as Promise<BackendDocument[]>;
}

export async function getSystemInfo() {
  const response = await fetch(`${API_BASE_URL}/system-info`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load system information."));
  }

  return response.json() as Promise<BackendSystemInfo>;
}

export async function rebuildIndex() {
  const response = await fetch(`${API_BASE_URL}/build-index`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Index rebuild failed."));
  }

  return response.json() as Promise<{
    total_chunks_indexed: number;
    message: string;
  }>;
}

export async function askQuestion(question: string) {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question })
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to generate answer."));
  }

  return response.json() as Promise<QueryResponse>;
}

export async function askOllama(question: string, documentAnswer: string) {
  const response = await fetch(`${API_BASE_URL}/ask-ollama`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question, document_answer: documentAnswer })
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to generate Ollama explanation."));
  }

  return response.json() as Promise<{ answer: string }>;
}
