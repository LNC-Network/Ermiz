"use client";

import React, { useCallback, useEffect } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddNode: (kind: string, position: { x: number; y: number }) => void;
  flowPosition: { x: number; y: number };
}

export function ContextMenu({
  x,
  y,
  onClose,
  onAddNode,
  flowPosition,
}: ContextMenuProps) {
  const handleClick = useCallback(
    (kind: string) => {
      onAddNode(kind, flowPosition);
      onClose();
    },
    [flowPosition, onAddNode, onClose],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClickOutside = () => onClose();
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 8px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 11,
    color: "var(--secondary)",
  };

  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        padding: 6,
        minWidth: 140,
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main Options */}
      {[
        { kind: "process", label: "Process", icon: "⚙️", color: "#a78bfa" },
        { kind: "database", label: "Database", icon: "🗄️", color: "#4ade80" },
        { kind: "queue", label: "Queue", icon: "📬", color: "#facc15" },
      ].map((item) => (
        <div
          key={item.kind}
          style={itemStyle}
          onClick={() => handleClick(item.kind)}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "var(--floating)";
            e.currentTarget.style.color = item.color;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--secondary)";
          }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}

      <div
        style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
      />

      {/* API Methods - Compact Grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          padding: "2px 4px",
        }}
      >
        {[
          { kind: "api_get", label: "GET", color: "#4ade80" },
          { kind: "api_post", label: "POST", color: "#facc15" },
          { kind: "api_put", label: "PUT", color: "#60a5fa" },
          { kind: "api_delete", label: "DEL", color: "#ef4444" },
          { kind: "api_patch", label: "PATCH", color: "#a78bfa" },
        ].map((api) => (
          <div
            key={api.kind}
            onClick={() => handleClick(api.kind)}
            style={{
              padding: "3px 6px",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 9,
              fontFamily: "monospace",
              fontWeight: 600,
              color: api.color,
              background: "var(--background)",
              transition: "all 0.1s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = api.color;
              e.currentTarget.style.color = "#000";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "var(--background)";
              e.currentTarget.style.color = api.color;
            }}
          >
            {api.label}
          </div>
        ))}
      </div>
    </div>
  );
}
