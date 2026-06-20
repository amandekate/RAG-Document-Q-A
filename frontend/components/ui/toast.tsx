"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

export function Toast() {
  const { state, actions } = useApp();
  const toast = state.toast;
  const Icon = toast?.type === "error" ? XCircle : toast?.type === "success" ? CheckCircle2 : Info;

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            "fixed bottom-5 right-5 z-[80] flex min-h-16 w-[min(360px,calc(100vw-40px))] items-center gap-3 rounded-[20px] border bg-card px-5 py-4 text-sm shadow-soft",
            toast.type === "success" && "border-green-500/40 bg-green-500/10",
            toast.type === "error" && "border-red-500/40 bg-red-500/10"
          )}
          role="status"
        >
          <Icon
            className={cn(
              "h-5 w-5",
              toast.type === "success" && "text-green-500",
              toast.type === "error" && "text-red-500",
              toast.type === "info" && "text-primary"
            )}
          />
          <span className="flex-1">{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            className="rounded-md p-1 text-muted-foreground hover:bg-white/5"
            onClick={actions.dismissToast}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
