"use client";

import { BookOpen, Paperclip, Send } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

export function ChatInput() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const { state, actions } = useApp();

  function resize() {
    const node = textRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  }

  function submit() {
    const question = value.trim();
    if (!question || state.loading) return;
    setValue("");
    if (textRef.current) textRef.current.style.height = "44px";
    void actions.sendQuestion(question);
  }

  return (
    <div className="p-4 md:p-6">
      <div
        className={cn(
          "min-h-24 rounded-[16px] border bg-slate-50 p-3 shadow-soft transition-all duration-200 ease-out dark:bg-[#071126]",
          focused ? "border-primary bg-white shadow-glow dark:bg-[#0a1730]" : "border-primary/70"
        )}
      >
        <textarea
          ref={textRef}
          value={value}
          rows={1}
          onChange={(event) => {
            setValue(event.target.value);
            resize();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Ask a question about your documents..."
          className="max-h-[200px] min-h-11 w-full resize-none rounded-[16px] border-0 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-0 focus:outline-none focus:ring-0"
          aria-label="Ask a question"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void actions.uploadFile(file);
                event.currentTarget.value = "";
              }}
            />
            <button
              aria-label="Upload document"
              title="Upload document"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              aria-label="Open retrieved context"
              title="Open retrieved context"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg border panel-border text-muted-foreground hover:bg-white/5",
                state.contextOpen && "border-primary text-primary"
              )}
              onClick={() => actions.setContextOpen(!state.contextOpen)}
            >
              <BookOpen className="h-5 w-5" />
            </button>
          </div>
          <Button size="icon" onClick={submit} disabled={!value.trim() || state.loading} className={cn(!value.trim() && "bg-primary/10 text-primary opacity-100 dark:bg-slate-800 dark:text-primary")}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
