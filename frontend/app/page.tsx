"use client";

import { AppHeader } from "@/components/header/app-header";
import { Sidebar } from "@/components/sidebar/sidebar";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ContextViewer } from "@/components/context-viewer/context-viewer";
import { MobileNav } from "@/components/sidebar/mobile-nav";
import { useApp } from "@/store/app-context";

export default function HomePage() {
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 ease-out">
      <Sidebar />
      <div className="min-h-screen lg:pl-[280px]">
        <AppHeader />
        <main className="grid h-[calc(100vh-72px)] gap-4 p-3 pb-24 md:p-5 lg:grid-cols-[minmax(0,1fr)] lg:pb-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-6">
          <DocumentsPanel />
          <ChatPanel />
          <ContextViewer open={state.contextOpen} />
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
