"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from "react";
import type { ReactNode } from "react";
import { askOllama, askQuestion, getDocuments, getSystemInfo, rebuildIndex, uploadDocument } from "@/lib/api";
import type { ChatMessage, ContextChunk, SystemStatus, UploadedDocument } from "@/lib/types";

type AppState = {
  messages: ChatMessage[];
  documents: UploadedDocument[];
  status: SystemStatus;
  activeView: "chat" | "documents" | "system";
  contextOpen: boolean;
  activeContext: ContextChunk[];
  selectedChunkIndex: number | null;
  loading: boolean;
  askingOllamaForId?: string;
  uploading: boolean;
  buildingIndex: boolean;
  toast?: { type: "success" | "error" | "info"; message: string };
};

type Action =
  | { type: "set-documents"; documents: UploadedDocument[] }
  | { type: "set-view"; view: AppState["activeView"] }
  | { type: "set-context-open"; open: boolean }
  | { type: "set-active-context"; context: ContextChunk[] }
  | { type: "set-selected-chunk"; index: number | null }
  | { type: "set-loading"; loading: boolean }
  | { type: "set-asking-ollama"; messageId?: string }
  | { type: "set-uploading"; uploading: boolean }
  | { type: "set-building"; building: boolean }
  | { type: "add-message"; message: ChatMessage }
  | { type: "set-messages"; messages: ChatMessage[] }
  | { type: "set-status"; status: Partial<SystemStatus> }
  | { type: "toast"; toast?: AppState["toast"] };

const initialStatus: SystemStatus = {
  backend: "checking",
  vectorIndex: "not-ready",
  llm: "unknown",
  documents: 0,
  chunks: 0
};

const initialState: AppState = {
  messages: [],
  documents: [],
  status: initialStatus,
  activeView: "chat",
  contextOpen: true,
  activeContext: [],
  selectedChunkIndex: null,
  loading: false,
  uploading: false,
  buildingIndex: false
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "set-documents":
      return { ...state, documents: action.documents };
    case "set-view":
      return { ...state, activeView: action.view };
    case "set-context-open":
      return { ...state, contextOpen: action.open };
    case "set-active-context":
      return { ...state, activeContext: action.context, selectedChunkIndex: action.context.length > 0 ? 0 : null, contextOpen: true };
    case "set-selected-chunk":
      return { ...state, selectedChunkIndex: action.index };
    case "set-loading":
      return { ...state, loading: action.loading };
    case "set-asking-ollama":
      return { ...state, askingOllamaForId: action.messageId };
    case "set-uploading":
      return { ...state, uploading: action.uploading };
    case "set-building":
      return {
        ...state,
        buildingIndex: action.building,
        status: {
          ...state.status,
          vectorIndex: action.building ? "building" : state.status.vectorIndex
        }
      };
    case "add-message":
      return { ...state, messages: [...state.messages, action.message] };
    case "set-messages":
      return {
        ...state,
        messages: action.messages,
        activeContext: [],
        selectedChunkIndex: null,
        contextOpen: false
      };
    case "set-status":
      return { ...state, status: { ...state.status, ...action.status } };
    case "toast":
      return { ...state, toast: action.toast };
    default:
      return state;
  }
}

type AppContextValue = {
  state: AppState;
  actions: {
    refreshHealth: () => Promise<void>;
    refreshDocuments: () => Promise<void>;
    refreshSystemInfo: () => Promise<void>;
    uploadFile: (file: File) => Promise<void>;
    buildIndex: () => Promise<void>;
    sendQuestion: (question: string) => Promise<void>;
    askOllamaForMessage: (message: ChatMessage) => Promise<void>;
    clearChat: () => void;
    setActiveView: (view: AppState["activeView"]) => void;
    setContextOpen: (open: boolean) => void;
    setActiveContext: (context: ContextChunk[]) => void;
    setSelectedChunk: (index: number | null) => void;
    showToast: (toast: NonNullable<AppState["toast"]>) => void;
    dismissToast: () => void;
  };
};

const AppContext = createContext<AppContextValue | null>(null);

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!state.toast) return;
    const timeout = window.setTimeout(() => dispatch({ type: "toast" }), 2000);
    return () => window.clearTimeout(timeout);
  }, [state.toast]);

  const refreshDocuments = useCallback(async () => {
    try {
      const documents = await getDocuments();
      dispatch({ type: "set-documents", documents });
      dispatch({ type: "set-status", status: { documents: documents.length } });
    } catch (error) {
      dispatch({
        type: "toast",
        toast: { type: "error", message: error instanceof Error ? error.message : "Failed to load documents." }
      });
    }
  }, []);

  const refreshSystemInfo = useCallback(async () => {
    dispatch({ type: "set-status", status: { backend: "checking" } });
    try {
      const info = await getSystemInfo();
      dispatch({
        type: "set-status",
        status: {
          backend: info.backend,
          vectorIndex: info.vector_index ? "ready" : "not-ready",
          llm: info.llm ? "connected" : "error",
          documents: info.documents,
          chunks: info.chunks,
          lastUpdated: info.last_updated
        }
      });
    } catch {
      dispatch({
        type: "set-status",
        status: { backend: "offline", llm: "error", lastUpdated: now() }
      });
    }
  }, []);

  useEffect(() => {
    void refreshDocuments();
    void refreshSystemInfo();
  }, [refreshDocuments, refreshSystemInfo]);

  const refreshHealth = refreshSystemInfo;

  const uploadFile = useCallback(async (file: File) => {
    dispatch({ type: "set-uploading", uploading: true });
    try {
      const response = await uploadDocument(file);
      await refreshDocuments();
      await refreshSystemInfo();
      dispatch({ type: "toast", toast: { type: "success", message: `${response.filename} uploaded.` } });
    } catch (error) {
      dispatch({
        type: "toast",
        toast: { type: "error", message: error instanceof Error ? error.message : "Upload failed." }
      });
    } finally {
      dispatch({ type: "set-uploading", uploading: false });
    }
  }, [refreshDocuments, refreshSystemInfo]);

  const buildIndex = useCallback(async () => {
    dispatch({ type: "set-building", building: true });
    try {
      const response = await rebuildIndex();
      dispatch({
        type: "set-status",
        status: {
          vectorIndex: "ready",
          chunks: response.total_chunks_indexed,
          lastUpdated: now()
        }
      });
      await refreshDocuments();
      await refreshSystemInfo();
      dispatch({ type: "toast", toast: { type: "success", message: "Index rebuilt successfully." } });
    } catch (error) {
      dispatch({ type: "set-status", status: { vectorIndex: "not-ready" } });
      dispatch({
        type: "toast",
        toast: { type: "error", message: error instanceof Error ? error.message : "Index rebuild failed." }
      });
    } finally {
      dispatch({ type: "set-building", building: false });
    }
  }, [refreshDocuments, refreshSystemInfo]);

  const sendQuestion = useCallback(async (question: string) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    const userMessage: ChatMessage = {
      id: id(),
      role: "user",
      content: cleanQuestion,
      timestamp: now()
    };

    dispatch({ type: "add-message", message: userMessage });
    dispatch({ type: "set-loading", loading: true });

    try {
      const response = await askQuestion(cleanQuestion);
      const context = response.context ?? [];
      const assistantMessage: ChatMessage = {
        id: id(),
        role: "assistant",
        kind: "document",
        content: response.answer,
        timestamp: now(),
        question: cleanQuestion,
        sources: response.sources,
        contextChunks: context
      };

      dispatch({ type: "add-message", message: assistantMessage });
      dispatch({ type: "set-active-context", context });
      dispatch({
        type: "set-status",
        status: { llm: "connected", vectorIndex: "ready", lastUpdated: now() }
      });
    } catch (error) {
      dispatch({
        type: "add-message",
        message: {
          id: id(),
          role: "assistant",
          kind: "error",
          content: error instanceof Error ? error.message : "Failed to generate answer.",
          timestamp: now(),
          sources: [],
          contextChunks: []
        }
      });
      dispatch({ type: "set-status", status: { llm: "error", lastUpdated: now() } });
    } finally {
      dispatch({ type: "set-loading", loading: false });
    }
  }, []);

  const askOllamaForMessage = useCallback(async (message: ChatMessage) => {
    if (!message.question || !message.content || message.kind !== "document") return;

    dispatch({ type: "set-asking-ollama", messageId: message.id });
    try {
      const response = await askOllama(message.question, message.content);
      dispatch({
        type: "add-message",
        message: {
          id: id(),
          role: "assistant",
          kind: "general",
          content: response.answer,
          timestamp: now(),
          question: message.question
        }
      });
      dispatch({ type: "set-status", status: { llm: "connected", lastUpdated: now() } });
    } catch (error) {
      dispatch({
        type: "add-message",
        message: {
          id: id(),
          role: "assistant",
          kind: "error",
          content: error instanceof Error ? `Ollama could not generate a response: ${error.message}` : "Ollama could not generate a response.",
          timestamp: now(),
          question: message.question
        }
      });
      dispatch({
        type: "toast",
        toast: { type: "error", message: error instanceof Error ? error.message : "Failed to ask Ollama." }
      });
      dispatch({ type: "set-status", status: { llm: "error", lastUpdated: now() } });
    } finally {
      dispatch({ type: "set-asking-ollama" });
    }
  }, []);

  const clearChat = useCallback(() => {
    dispatch({ type: "set-messages", messages: [] });
    dispatch({ type: "toast", toast: { type: "info", message: "Chat history cleared." } });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      actions: {
        refreshHealth,
        refreshDocuments,
        refreshSystemInfo,
        uploadFile,
        buildIndex,
        sendQuestion,
        askOllamaForMessage,
        clearChat,
        setActiveView: (view) => dispatch({ type: "set-view", view }),
        setContextOpen: (open) => dispatch({ type: "set-context-open", open }),
        setActiveContext: (context) => dispatch({ type: "set-active-context", context }),
        setSelectedChunk: (index) => dispatch({ type: "set-selected-chunk", index }),
        showToast: (toast) => dispatch({ type: "toast", toast }),
        dismissToast: () => dispatch({ type: "toast" })
      }
    }),
    [askOllamaForMessage, buildIndex, clearChat, refreshDocuments, refreshHealth, refreshSystemInfo, sendQuestion, state, uploadFile]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
