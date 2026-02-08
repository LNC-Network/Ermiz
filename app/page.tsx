"use client";

import React from "react";
import dynamic from "next/dynamic";
import { PropertyInspector } from "@/components/panels/PropertyInspector";

// Dynamic import for React Flow to avoid SSR issues
const FlowCanvas = dynamic(() => import("@/components/canvas/FlowCanvas"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* Top Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--panel)] bg-[var(--panel)] px-4">
        <div className="font-bold text-sm tracking-wide">ERMIZ</div>
        <div className="text-xs text-[var(--muted)]">Project: Untitled</div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Rail */}
        <aside className="w-64 shrink-0 border-r border-[var(--panel)] bg-[var(--panel)] p-4 flex flex-col gap-4">
          <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Navigation
          </div>
          {/* Placeholder for API/Process list */}
          <div className="flex flex-col gap-2 text-sm text-[var(--secondary)]">
            <div className="hover:text-[var(--foreground)] cursor-pointer">
              APIs
            </div>
            <div className="hover:text-[var(--foreground)] cursor-pointer">
              Processes
            </div>
            <div className="hover:text-[var(--foreground)] cursor-pointer">
              Databases
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative bg-[var(--background)]">
          <FlowCanvas />
        </main>

        {/* Right Inspector */}
        <PropertyInspector />
      </div>

      {/* Bottom Status Bar (optional) */}
      <footer className="h-6 shrink-0 bg-[var(--panel)] border-t border-[var(--panel)] flex items-center px-4 text-[10px] text-[var(--muted)]">
        Ready
      </footer>
    </div>
  );
}
