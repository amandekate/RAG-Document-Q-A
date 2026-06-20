"use client";

import { useEffect, useState } from "react";
import { Moon, Plus, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { useApp } from "@/store/app-context";

export function AppHeader() {
  const { theme, setTheme } = useTheme();
  const { actions } = useApp();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? theme : "dark";
  const nextTheme = activeTheme === "light" ? "dark" : "light";
  const ThemeIcon = activeTheme === "dark" ? Moon : Sun;

  return (
    <header className="sticky top-0 z-50 flex h-[72px] items-center justify-between border-b panel-border bg-card/90 px-4 backdrop-blur-xl md:px-7">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold md:text-xl">
          RAG Document Q&A System
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          title={mounted ? `Theme: ${activeTheme}` : "Toggle theme"}
          onClick={() => setTheme(nextTheme)}
          className="rounded-full"
          suppressHydrationWarning
        >
          <ThemeIcon className="h-5 w-5" />
        </Button>

        <Button onClick={actions.clearChat} className="rounded-[14px]">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Session</span>
        </Button>
      </div>

      <Toast />
    </header>
  );
}
