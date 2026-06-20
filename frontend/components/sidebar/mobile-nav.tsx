"use client";

import { FolderOpen, Info, MessageSquare } from "lucide-react";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

const items = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "documents", label: "Docs", icon: FolderOpen },
  { id: "system", label: "Info", icon: Info }
] as const;

export function MobileNav() {
  const { state, actions } = useApp();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid h-[72px] grid-cols-3 rounded-[20px] border panel-border bg-card/90 p-1 shadow-soft backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const active = state.activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => actions.setActiveView(item.id)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-[16px] text-sm font-medium transition-all duration-200 ease-out",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
