"use client";

import { FileText, MoreVertical, RefreshCw, Upload } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/app-context";
import type { UploadedDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DocumentsPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, actions } = useApp();

  return (
    <section className={cn("min-h-0 overflow-hidden rounded-[24px] border panel-border bg-card p-5 shadow-soft xl:col-span-2", state.activeView !== "documents" && "hidden")}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Uploaded Documents</h2>
        <button
          aria-label="Refresh documents"
          onClick={() => {
            void actions.refreshDocuments();
            void actions.refreshSystemInfo();
          }}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted dark:hover:bg-white/5"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-5 flex h-[calc(100%-56px)] min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
          {state.documents.length === 0 ? (
            <div className="flex h-full min-h-48 items-center justify-center rounded-[20px] border border-dashed border-slate-700 p-6 text-center text-sm text-muted-foreground">
              Upload your first document.
            </div>
          ) : (
            state.documents.map((doc) => <DocumentCard key={doc.name} document={doc} />)
          )}
        </div>

        <div className="mt-4 space-y-3">
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void actions.uploadFile(file);
              event.currentTarget.value = "";
            }}
          />
          <Button className="w-full" onClick={() => inputRef.current?.click()} disabled={state.uploading}>
            <Upload className="h-4 w-4" />
            {state.uploading ? "Uploading..." : "Upload Document"}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => void actions.buildIndex()} disabled={state.buildingIndex}>
            <RefreshCw className={cn("h-4 w-4", state.buildingIndex && "animate-spin")} />
            {state.buildingIndex ? "Building index..." : "Rebuild Index"}
          </Button>
          <p className="text-sm leading-6 text-muted-foreground">
            Documents are fetched from the backend. Rebuild the index after upload to update retrieval.
          </p>
        </div>
      </div>
    </section>
  );
}

function DocumentCard({ document }: { document: UploadedDocument }) {
  const tone = document.type === "PDF" ? "bg-red-600" : document.type === "DOCX" ? "bg-blue-600" : "bg-slate-600";

  return (
    <article className="flex items-center gap-3 rounded-[20px] border panel-border bg-slate-50 p-4 shadow-soft dark:bg-[#071126]">
      <div className={cn("flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white", tone)}>
        {document.type}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{document.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{document.type}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          {document.indexed ? "Indexed for retrieval" : "Uploaded, not indexed"}
        </p>
      </div>
      <button aria-label={`More actions for ${document.name}`} className="rounded-md p-2 text-muted-foreground hover:bg-muted dark:hover:bg-white/5">
        <MoreVertical className="h-4 w-4" />
      </button>
    </article>
  );
}
