"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileSearch, Info, X } from "lucide-react";
import { FALLBACK_CONTEXT_MESSAGE } from "@/lib/constants";
import type { ContextChunk } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-context";

export function ContextViewer({ open }: { open: boolean }) {
  const { state, actions } = useApp();

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-3 bottom-20 z-40 max-h-[70vh] overflow-hidden rounded-[20px] border panel-border bg-card shadow-soft md:bottom-4 md:left-auto md:right-4 md:w-[360px] xl:static xl:max-h-none xl:w-auto"
        >
          <div className="flex items-start justify-between p-5">
            <div>
              <h2 className="text-lg font-semibold">RAG Context Viewer</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Document chunks retrieved and used to generate the answer.
              </p>
            </div>
            <button aria-label="Close context viewer" className="rounded-md p-2 hover:bg-white/5 xl:hidden" onClick={() => actions.setContextOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(70vh-112px)] space-y-4 overflow-y-auto p-5 scrollbar-thin xl:max-h-[calc(100vh-220px)]">
            {state.activeContext.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-slate-400">
                  <FileSearch className="h-10 w-10" />
                </div>
                <h3 className="mt-8 text-lg font-semibold">No relevant chunks found for this query.</h3>
                <p className="mt-4 max-w-60 text-sm leading-6 text-muted-foreground">{FALLBACK_CONTEXT_MESSAGE}</p>
              </div>
            ) : (
              state.activeContext.map((chunk, index) => (
                <ContextChunkCard
                  key={`${chunk.file_name}-${chunk.page_number}-${index}`}
                  chunk={chunk}
                  index={index}
                  selected={state.selectedChunkIndex === index}
                  onSelect={() => actions.setSelectedChunk(index)}
                />
              ))
            )}
          </div>

          <div className="flex items-center gap-2 p-5 text-xs text-muted-foreground">
            <Info className="h-4 w-4" />
            Click on a chunk to highlight it.
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function ContextChunkCard({
  chunk,
  index,
  selected,
  onSelect
}: {
  chunk: ContextChunk;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const relevance = relevanceMeta(chunk.score);

  return (
    <button
      type="button"
      className={cn(
        "block w-full rounded-[20px] border panel-border bg-slate-50 p-4 text-left shadow-soft transition-all duration-200 ease-out dark:bg-[#071126]",
        selected && "border-primary bg-blue-100/90 ring-2 ring-primary/25 shadow-glow dark:bg-primary/5"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">Chunk #{index + 1}</h3>
        <span
          title={relevance.tooltip}
          className={cn("rounded-full border px-3 py-1 text-xs font-medium tracking-wide", relevance.className)}
        >
          {relevance.label} - {chunk.score.toFixed(2)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        "{chunk.text.slice(0, 190)}{chunk.text.length > 190 ? "..." : ""}"
      </p>
      <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md bg-red-500 text-[10px] font-bold text-white">
          PDF
        </div>
        <div className="min-w-0">
          <p className="truncate">{chunk.file_name}</p>
          <p>{chunk.page_number ? `Page ${chunk.page_number}` : "Page unavailable"}</p>
        </div>
      </div>
    </button>
  );
}

function relevanceMeta(score: number) {
  if (score >= 0.85) {
    return {
      label: "HIGH",
      tooltip: "Very relevant to your question.",
      className: "border-green-500/20 bg-green-500/15 text-green-400"
    };
  }

  if (score >= 0.65) {
    return {
      label: "MEDIUM",
      tooltip: "Relevant to your question.",
      className: "border-yellow-500/20 bg-yellow-500/15 text-yellow-400"
    };
  }

  if (score >= 0.45) {
    return {
      label: "LOW",
      tooltip: "Partially relevant.",
      className: "border-orange-500/20 bg-orange-500/15 text-orange-400"
    };
  }

  return {
    label: "WEAK",
    tooltip: "Weak semantic match.",
    className: "border-red-500/20 bg-red-500/15 text-red-400"
  };
}
