"use client";

import React from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";

export function PropertyInspector() {
  const { nodes, updateNodeData } = useStore(
    useShallow((state) => ({
      nodes: state.nodes,
      updateNodeData: state.updateNodeData,
    })),
  );

  // Find the single selected node
  const selectedNode = nodes.find((n) => n.selected);

  if (!selectedNode) {
    return (
      <aside className="w-72 shrink-0 border-l border-[var(--panel)] bg-[var(--panel)] p-4 hidden lg:block">
        <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
          Properties
        </div>
        <div className="mt-4 text-sm text-[var(--muted)] text-center">
          Select a node to edit
        </div>
      </aside>
    );
  }

  const { label, description } = selectedNode.data as any;

  return (
    <aside className="w-72 shrink-0 border-l border-[var(--panel)] bg-[var(--panel)] p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
        {selectedNode.type} Properties
      </div>

      {/* ID (Read-only) */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[var(--muted)] uppercase">ID</label>
        <code className="text-xs bg-[var(--background)] p-1.5 rounded">
          {selectedNode.id}
        </code>
      </div>

      {/* Label Input */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[var(--muted)] uppercase">
          Label
        </label>
        <input
          type="text"
          value={label || ""}
          onChange={(e) =>
            updateNodeData(selectedNode.id, { label: e.target.value })
          }
          className="bg-[var(--background)] border border-[var(--floating)] rounded p-1.5 text-sm active:border-[var(--primary)] focus:border-[var(--primary)] outline-none transition-colors"
        />
      </div>

      {/* Description Input */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[var(--muted)] uppercase">
          Description
        </label>
        <textarea
          value={description || ""}
          onChange={(e) =>
            updateNodeData(selectedNode.id, { description: e.target.value })
          }
          className="bg-[var(--background)] border border-[var(--floating)] rounded p-1.5 text-sm h-20 resize-none active:border-[var(--primary)] focus:border-[var(--primary)] outline-none transition-colors"
        />
      </div>

      {/* Node Specific Config (Placeholder) */}
      <div className="border-t border-[var(--floating)] my-2"></div>
      <div className="text-xs text-[var(--muted)]">
        Configuration specific to {selectedNode.type} will appear here.
      </div>

      {/* JSON Preview (Debug) */}
      <div className="mt-auto pt-4 border-t border-[var(--floating)]">
        <label className="text-[10px] text-[var(--muted)] uppercase">
          Node JSON
        </label>
        <pre className="text-[10px] bg-[var(--floating)] p-2 rounded overflow-auto max-h-40 text-[var(--muted)] font-mono mt-1">
          {JSON.stringify(selectedNode.data, null, 2)}
        </pre>
      </div>
    </aside>
  );
}
