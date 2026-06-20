"use client";

import { Activity, Bot, Database, FileText, RefreshCw, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/app-context";

export function SystemInfoPanel() {
  const { state, actions } = useApp();

  const cards = [
    { label: "Backend", value: statusLabel(state.status.backend), icon: Activity, good: state.status.backend === "online" },
    { label: "Vector Index", value: statusLabel(state.status.vectorIndex), icon: Database, good: state.status.vectorIndex === "ready" },
    { label: "LLM (Ollama)", value: state.status.llm === "error" ? "Offline" : statusLabel(state.status.llm), icon: Bot, good: state.status.llm === "connected" },
    { label: "Documents", value: String(state.status.documents), icon: FileText, good: state.status.documents > 0 },
    { label: "Chunks", value: String(state.status.chunks), icon: ScanSearch, good: state.status.chunks > 0 }
  ];

  return (
    <section className="min-h-0 overflow-y-auto rounded-[24px] border panel-border bg-card p-6 shadow-soft scrollbar-thin xl:col-span-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">System Info</h2>
          <p className="mt-2 text-sm text-muted-foreground">Read-only status for the RAG backend and local Ollama pipeline.</p>
        </div>
        <Button variant="secondary" onClick={() => void actions.refreshSystemInfo()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-[20px] border panel-border bg-slate-50 p-4 shadow-soft dark:bg-[#071126]">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-primary" />
                <span className={card.good ? "h-2.5 w-2.5 rounded-full bg-green-400" : "h-2.5 w-2.5 rounded-full bg-amber-400"} />
              </div>
              <p className="mt-5 text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 break-words text-lg font-semibold">{card.value}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-[20px] border panel-border bg-slate-50 p-4 text-sm text-muted-foreground dark:bg-[#071126]">
        Last Updated: {state.status.lastUpdated ?? "Not refreshed yet"}
      </div>
    </section>
  );
}

function statusLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
