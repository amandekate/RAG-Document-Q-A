"use client";

import { BotMessageSquare, FileText, FolderOpen, Info, MessageSquare, RefreshCw, ScanSearch } from "lucide-react";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

const items = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "system", label: "System Info", icon: Info }
] as const;

export function Sidebar() {
  const { state, actions } = useApp();

  return (
    <aside className="fixed inset-y-0 left-0 z-[60] hidden w-[280px] border-r panel-border bg-[#020817] p-5 text-white lg:flex lg:flex-col">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary shadow-soft">
          <BotMessageSquare className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-semibold">DocQ AI</div>
          <div className="text-sm text-slate-300">RAG Document Q&A</div>
        </div>
      </div>

      <nav className="mt-10 space-y-3" aria-label="Main navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const active = state.activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => actions.setActiveView(item.id)}
              className={cn(
                "flex h-[52px] w-full items-center gap-4 rounded-[16px] px-4 text-left text-base font-medium transition-all duration-200 ease-out",
                active ? "bg-primary text-white shadow-soft" : "text-slate-300 hover:bg-white/5"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[20px] border panel-border bg-slate-900/70 p-4 text-white shadow-soft">
        <h2 className="text-base font-semibold">System Status</h2>
        <StatusLine label="Backend" value={state.status.backend === "online" ? "Online" : state.status.backend === "checking" ? "Checking" : "Offline"} active={state.status.backend === "online"} />
        <StatusLine label="Vector Index" value={state.status.vectorIndex === "ready" ? "Ready" : state.status.vectorIndex === "building" ? "Building" : "Not Ready"} active={state.status.vectorIndex === "ready"} />
        <StatusLine label="LLM (Ollama)" value={state.status.llm === "connected" ? "Connected" : state.status.llm === "error" ? "Offline" : "Unknown"} active={state.status.llm === "connected"} />
        <div className="my-5 h-px bg-slate-700/60" />
        <MetricLine icon={FileText} value={state.status.documents} label="Documents" />
        <MetricLine icon={ScanSearch} value={state.status.chunks} label="Chunks" />
        <div className="mt-5 flex items-center justify-between border-t border-slate-700/60 pt-4 text-xs text-slate-400">
          <span>Last Updated</span>
          <span className="flex items-center gap-2">
            {state.status.lastUpdated ?? "Not refreshed"}
            <button aria-label="Refresh system status" onClick={() => void actions.refreshSystemInfo()} className="rounded-md p-1 text-primary hover:bg-white/5">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      </div>
    </aside>
  );
}

function StatusLine({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-slate-100">{label}</span>
      <span className={cn("flex items-center gap-2", active ? "text-green-400" : "text-amber-400")}>
        <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-green-400" : "bg-amber-400")} />
        {value}
      </span>
    </div>
  );
}

function MetricLine({ icon: Icon, value, label }: { icon: typeof FileText; value: number; label: string }) {
  return (
    <div className="mt-4 flex items-center gap-3 text-sm text-slate-100">
      <Icon className="h-5 w-5 text-slate-300" />
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </div>
  );
}
