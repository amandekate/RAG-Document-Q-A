"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BotMessageSquare, BookOpen, Brain, ChevronDown, Copy, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChatInput } from "@/components/chat/chat-input";
import { SystemInfoPanel } from "@/components/system-info/system-info-panel";
import { useApp } from "@/store/app-context";
import type { ChatMessage } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";

export function ChatPanel() {
  const { state } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    endRef.current?.scrollIntoView({ behavior, block: "end" });
    setShowScrollButton(false);
  }

  function updateScrollButton() {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setShowScrollButton(distanceFromBottom > 120);
  }

  useEffect(() => {
    scrollToBottom(state.messages.length > 1 ? "smooth" : "auto");
  }, [state.messages.length, state.loading, state.askingOllamaForId]);

  if (state.activeView === "system") {
    return <SystemInfoPanel />;
  }

  return (
    <section className={cn("relative flex min-h-0 flex-col rounded-[24px] border panel-border bg-card shadow-soft", state.activeView !== "chat" && "hidden")}>
      <div className="p-6">
        <h2 className="text-xl font-semibold">Chat with your documents</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask anything about your uploaded documents. Answers are grounded in the context.
        </p>
      </div>

      <div ref={scrollRef} onScroll={updateScrollButton} className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        {state.messages.length === 0 ? (
          <EmptyChat />
        ) : (
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {state.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {state.loading && <TypingIndicator />}
              {state.askingOllamaForId && <OllamaTypingIndicator />}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        )}
      </div>

      {showScrollButton && (
        <button
          aria-label="Scroll to latest message"
          onClick={() => scrollToBottom()}
          className="absolute bottom-32 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border panel-border bg-card/95 text-primary shadow-soft backdrop-blur hover:bg-white/5"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      <ChatInput />
    </section>
  );
}

function EmptyChat() {
  return (
    <div className="flex h-full min-h-72 items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-[#020817] shadow-soft">
          <BotMessageSquare className="h-10 w-10" />
        </div>
        <h3 className="mt-8 text-xl font-semibold">Ask anything about your documents</h3>
        <p className="mt-4 text-base text-muted-foreground">Your answer will appear here.</p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const { state, actions } = useApp();
  const isUser = message.role === "user";
  const sources = message.sources ?? [];
  const context = message.contextChunks ?? [];
  const ollamaOffline = state.status.llm !== "connected";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[#020817] sm:flex">
          {message.kind === "general" ? <Brain className="h-5 w-5" /> : <BotMessageSquare className="h-5 w-5" />}
        </div>
      )}
      <div className={cn("max-w-[75%] min-w-0", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-[20px] px-5 py-4 text-sm leading-6 shadow-soft",
            isUser
              ? "bg-primary text-primary-foreground"
              : message.kind === "general"
                ? "border border-fuchsia-500/35 bg-fuchsia-100/80 text-foreground dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10"
                : message.kind === "error"
                  ? "border border-red-500/30 bg-red-500/10 text-foreground"
                  : "border panel-border bg-slate-50 text-foreground dark:bg-[#071126]"
          )}
        >
          {message.kind === "general" && (
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-fuchsia-800 dark:text-fuchsia-300">
              <Brain className="h-3.5 w-3.5" />
              Generated by Ollama (General Knowledge)
            </p>
          )}
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="markdown">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          {!isUser && sources.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold">Sources:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sources.map((source, index) => (
                  <button
                    key={`${source.file_name}-${source.page_number}-${index}`}
                    onClick={() => actions.setActiveContext(context)}
                    className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15"
                  >
                    {index + 1}. {source.file_name}
                    {source.page_number ? ` (Page ${source.page_number})` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={cn("mt-3 flex items-center gap-2 text-xs text-muted-foreground", isUser && "justify-end")}>
          <span>{formatTime(message.timestamp)}</span>
          {isUser && (
            <button
              aria-label="Copy prompt"
              className="inline-flex items-center gap-1 rounded-lg border panel-border px-3 py-2 hover:bg-muted dark:hover:bg-white/5"
              onClick={() => {
                void navigator.clipboard.writeText(message.content);
                actions.showToast({ type: "success", message: "Copied to clipboard" });
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          )}
          {!isUser && (
            <>
              <button
                aria-label="Copy answer"
                className="inline-flex items-center gap-1 rounded-lg border panel-border px-3 py-2 hover:bg-muted dark:hover:bg-white/5"
                onClick={() => {
                  void navigator.clipboard.writeText(message.content);
                  actions.showToast({ type: "success", message: "Copied to clipboard" });
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
              {message.kind === "document" && (
                <>
                  <button
                    aria-label="View retrieved context"
                    className="inline-flex items-center gap-1 rounded-lg border panel-border px-3 py-2 hover:bg-muted dark:hover:bg-white/5"
                    onClick={() => actions.setActiveContext(context)}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    View Context
                  </button>
                  <button
                    aria-label="Ask Ollama"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border panel-border px-3 py-2 hover:bg-muted disabled:opacity-60 dark:hover:bg-white/5",
                      ollamaOffline && "border-amber-500/30 text-amber-500"
                    )}
                    disabled={state.askingOllamaForId === message.id}
                    onClick={() => {
                      if (ollamaOffline) {
                        actions.showToast({ type: "error", message: "Ollama is offline. Document retrieval still works." });
                        return;
                      }
                      void actions.askOllamaForMessage(message);
                    }}
                  >
                    {state.askingOllamaForId === message.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                    {state.askingOllamaForId === message.id ? "Responding..." : ollamaOffline ? "Ollama offline" : "Ask Ollama"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[#020817]">
        <BotMessageSquare className="h-5 w-5" />
      </div>
      <div className="rounded-[20px] border panel-border bg-slate-50 px-5 py-4 text-sm text-muted-foreground dark:bg-[#071126]">
        Thinking from retrieved context...
      </div>
    </motion.div>
  );
}

function OllamaTypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/90 text-white">
        <Brain className="h-5 w-5" />
      </div>
      <div className="rounded-[20px] border border-fuchsia-500/20 bg-fuchsia-500/10 px-5 py-4 text-sm text-muted-foreground">
        Asking Ollama for a general explanation...
      </div>
    </motion.div>
  );
}
