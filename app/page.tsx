"use client";

import React from "react";
import dynamic from "next/dynamic";
import { PropertyInspector } from "@/components/panels/PropertyInspector";
import { useStore } from "@/store/useStore";

const FlowCanvas = dynamic(() => import("@/components/canvas/FlowCanvas"), {
  ssr: false,
});

export default function Home() {
  const addNode = useStore((state) => state.addNode);

  const sidebarItemStyle: React.CSSProperties = {
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 4,
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        background: "var(--background)",
        color: "var(--foreground)",
        overflow: "hidden",
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          display: "flex",
          height: 48,
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          background: "var(--panel)",
          padding: "0 16px",
          flexShrink: 0,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.05em" }}>
          ERMIZ
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Visual Backend Designer
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Rail */}
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            background: "var(--panel)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "auto",
          }}
        >
          {/* Processes */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              Processes
            </div>
            <div
              style={{ ...sidebarItemStyle, color: "var(--secondary)" }}
              onClick={() => addNode("process")}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--floating)";
                e.currentTarget.style.color = "#a78bfa";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--secondary)";
              }}
            >
              <span style={{ fontSize: 14 }}>⚙️</span>
              <span style={{ fontSize: 13 }}>New Process</span>
            </div>
          </div>

          {/* Infrastructure */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              Infrastructure
            </div>
            <div
              style={{ ...sidebarItemStyle, color: "var(--secondary)" }}
              onClick={() => addNode("database")}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--floating)";
                e.currentTarget.style.color = "#4ade80";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--secondary)";
              }}
            >
              <span style={{ fontSize: 14 }}>🗄️</span>
              <span style={{ fontSize: 13 }}>Database</span>
            </div>
            <div
              style={{ ...sidebarItemStyle, color: "var(--secondary)" }}
              onClick={() => addNode("queue")}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--floating)";
                e.currentTarget.style.color = "#facc15";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--secondary)";
              }}
            >
              <span style={{ fontSize: 14 }}>📬</span>
              <span style={{ fontSize: 13 }}>Queue</span>
            </div>
          </div>

          {/* Bindings */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              API Endpoints
            </div>
            {[
              { kind: "api_get", label: "GET", color: "#4ade80", icon: "🟢" },
              { kind: "api_post", label: "POST", color: "#facc15", icon: "🟡" },
              { kind: "api_put", label: "PUT", color: "#60a5fa", icon: "🔵" },
              {
                kind: "api_delete",
                label: "DELETE",
                color: "#ef4444",
                icon: "🔴",
              },
              {
                kind: "api_patch",
                label: "PATCH",
                color: "#a78bfa",
                icon: "🟣",
              },
            ].map((api) => (
              <div
                key={api.kind}
                style={{ ...sidebarItemStyle, color: "var(--secondary)" }}
                onClick={() =>
                  addNode(api.kind as Parameters<typeof addNode>[0])
                }
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "var(--floating)";
                  e.currentTarget.style.color = api.color;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--secondary)";
                }}
              >
                <span style={{ fontSize: 12 }}>{api.icon}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace" }}>
                  {api.label}
                </span>
              </div>
            ))}
            <div
              style={{
                ...sidebarItemStyle,
                color: "var(--muted)",
                marginTop: 4,
                fontSize: 11,
              }}
              onClick={() => addNode("api_binding")}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--floating)";
                e.currentTarget.style.color = "var(--secondary)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              <span style={{ fontSize: 12 }}>🔗</span>
              <span style={{ fontSize: 11 }}>Custom API</span>
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <main
          style={{
            flex: 1,
            position: "relative",
            background: "var(--background)",
          }}
        >
          <FlowCanvas />
        </main>

        {/* Right Inspector */}
        <PropertyInspector />
      </div>

      {/* Bottom Status Bar */}
      <footer
        style={{
          height: 24,
          flexShrink: 0,
          background: "var(--panel)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        Ready
      </footer>
    </div>
  );
}
