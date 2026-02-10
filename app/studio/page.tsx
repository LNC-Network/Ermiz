"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PropertyInspector } from "@/components/panels/PropertyInspector";
import { useStore } from "@/store/useStore";

const FlowCanvas = dynamic(() => import("@/components/canvas/FlowCanvas"), {
  ssr: false,
});

type WorkspaceTab = "api" | "infra" | "database" | "agent" | "deploy";

const tabLabel: Record<WorkspaceTab, string> = {
  api: "API",
  infra: "Infra",
  database: "Database",
  agent: "Agent",
  deploy: "Deploy",
};

const STORAGE_KEYS = {
  activeTab: "ermiz.activeTab",
  leftSidebarCollapsed: "ermiz.leftSidebarCollapsed",
  rightSidebarCollapsed: "ermiz.rightSidebarCollapsed",
  leftSidebarWidth: "ermiz.leftSidebarWidth",
  inspectorWidth: "ermiz.inspectorWidth",
};

const DEFAULT_LEFT_WIDTH = 236;
const DEFAULT_INSPECTOR_WIDTH = 320;

type SidebarItem = {
  kind: Parameters<ReturnType<typeof useStore>["addNode"]>[0];
  label: string;
  icon: string;
  hoverColor: string;
  mono?: boolean;
  hint?: string;
};

type SidebarSection = {
  id: string;
  title: string;
  muted?: boolean;
  items: SidebarItem[];
};

function Workspace({
  sections,
}: {
  sections: SidebarSection[];
}) {
  const addNode = useStore((state) => state.addNode);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const resizeStateRef = useRef<{
    side: "left" | "right" | null;
    startX: number;
    startWidth: number;
  }>({
    side: null,
    startX: 0,
    startWidth: 0,
  });

  const sidebarItemStyle: React.CSSProperties = {
    cursor: "pointer",
    padding: "9px 12px",
    borderRadius: 10,
    transition: "all 0.18s ease",
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid transparent",
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const leftCollapsed = localStorage.getItem(STORAGE_KEYS.leftSidebarCollapsed) === "1";
      const rightCollapsed = localStorage.getItem(STORAGE_KEYS.rightSidebarCollapsed) === "1";
      const leftWidth = Number(localStorage.getItem(STORAGE_KEYS.leftSidebarWidth));
      const inspectorStored = Number(localStorage.getItem(STORAGE_KEYS.inspectorWidth));
      setIsLeftSidebarCollapsed(leftCollapsed);
      setIsInspectorCollapsed(rightCollapsed);
      setLeftSidebarWidth(Math.max(200, Math.min(420, leftWidth || DEFAULT_LEFT_WIDTH)));
      setInspectorWidth(Math.max(260, Math.min(520, inspectorStored || DEFAULT_INSPECTOR_WIDTH)));
    }

    const handleMouseMove = (event: MouseEvent) => {
      const state = resizeStateRef.current;
      if (!state.side) return;

      if (state.side === "left") {
        const nextWidth = Math.max(200, Math.min(420, state.startWidth + (event.clientX - state.startX)));
        setLeftSidebarWidth(nextWidth);
      } else {
        const nextWidth = Math.max(260, Math.min(520, state.startWidth + (state.startX - event.clientX)));
        setInspectorWidth(nextWidth);
      }
    };

    const handleMouseUp = () => {
      resizeStateRef.current.side = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.leftSidebarCollapsed,
        isLeftSidebarCollapsed ? "1" : "0",
      );
      localStorage.setItem(
        STORAGE_KEYS.rightSidebarCollapsed,
        isInspectorCollapsed ? "1" : "0",
      );
      localStorage.setItem(STORAGE_KEYS.leftSidebarWidth, String(leftSidebarWidth));
      localStorage.setItem(STORAGE_KEYS.inspectorWidth, String(inspectorWidth));
    } catch {
      // ignore storage errors
    }
  }, [isLeftSidebarCollapsed, isInspectorCollapsed, leftSidebarWidth, inspectorWidth]);

  useEffect(() => {
    const handleLayoutShortcuts = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        setIsLeftSidebarCollapsed((prev) => !prev);
      }
      if (key === "i") {
        event.preventDefault();
        setIsInspectorCollapsed((prev) => !prev);
      }
      if (key === "0") {
        event.preventDefault();
        setIsLeftSidebarCollapsed(false);
        setIsInspectorCollapsed(false);
        setLeftSidebarWidth(DEFAULT_LEFT_WIDTH);
        setInspectorWidth(DEFAULT_INSPECTOR_WIDTH);
      }
    };
    window.addEventListener("keydown", handleLayoutShortcuts);
    return () => {
      window.removeEventListener("keydown", handleLayoutShortcuts);
    };
  }, []);

  return (
    <>
      {isLeftSidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setIsLeftSidebarCollapsed(false)}
          aria-label="Expand left sidebar"
          style={{
            width: 22,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--panel) 92%, #0b0f16 8%)",
            color: "var(--muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ›
        </button>
      ) : (
        <div style={{ position: "relative", display: "flex", zIndex: 20 }}>
          <button
            type="button"
            onClick={() => setIsLeftSidebarCollapsed(true)}
            aria-label="Collapse left sidebar"
            style={{
              position: "absolute",
              top: "50%",
              right: -12,
              transform: "translateY(-50%)",
              zIndex: 30,
              border: "1px solid var(--border)",
              background: "var(--floating)",
              color: "var(--muted)",
              borderRadius: 8,
              width: 24,
              height: 24,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ‹
          </button>

          <aside
            style={{
              width: leftSidebarWidth,
              flexShrink: 0,
              height: "100%",
              minHeight: 0,
              borderRight: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--panel) 92%, #0b0f16 8%)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {sections.map((section) => (
              <div
                key={section.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--panel) 85%, #0b1018 15%)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 10px",
                    borderBottom: collapsedSections[section.id]
                      ? "none"
                      : "1px solid var(--border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedSections((prev) => ({
                        ...prev,
                        [section.id]: !prev[section.id],
                      }))
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>{collapsedSections[section.id] ? "▸" : "▾"}</span>
                    <span>{section.title}</span>
                  </button>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
                    {section.items.length}
                  </span>
                </div>
                {!collapsedSections[section.id] && (
                  <div style={{ padding: 8, display: "grid", gap: 6 }}>
                    {section.items.map((item, index) => (
                      <div
                        key={`${section.id}-${item.kind}-${item.label}-${index}`}
                        style={{
                          ...sidebarItemStyle,
                          color: section.muted ? "var(--muted)" : "var(--secondary)",
                        }}
                        onClick={() => addNode(item.kind)}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "var(--floating)";
                          e.currentTarget.style.color = item.hoverColor;
                          e.currentTarget.style.borderColor = "var(--border)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = section.muted
                            ? "var(--muted)"
                            : "var(--secondary)";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        <span style={{ fontSize: 12 }}>{item.icon}</span>
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontFamily: item.mono ? "monospace" : "inherit",
                              lineHeight: 1.2,
                            }}
                          >
                            {item.label}
                          </span>
                          {item.hint && (
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>
                              {item.hint}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>
        </div>
      )}

      {!isLeftSidebarCollapsed && (
        <div
          onMouseDown={(event) => {
            resizeStateRef.current = {
              side: "left",
              startX: event.clientX,
              startWidth: leftSidebarWidth,
            };
          }}
          style={{
            width: 6,
            cursor: "col-resize",
            flexShrink: 0,
            background: "transparent",
            borderRight: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
          }}
        />
      )}

      <main
        style={{
          flex: 1,
          position: "relative",
          background: "var(--background)",
        }}
      >
        <FlowCanvas />
      </main>

      {isInspectorCollapsed ? (
        <button
          type="button"
          onClick={() => setIsInspectorCollapsed(false)}
          aria-label="Expand inspector"
          style={{
            width: 22,
            flexShrink: 0,
            borderLeft: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--panel) 92%, #0b0f16 8%)",
            color: "var(--muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ‹
        </button>
      ) : (
        <div style={{ position: "relative", display: "flex" }}>
          <div
            onMouseDown={(event) => {
              resizeStateRef.current = {
                side: "right",
                startX: event.clientX,
                startWidth: inspectorWidth,
              };
            }}
            style={{
              width: 6,
              cursor: "col-resize",
              flexShrink: 0,
              background: "transparent",
              borderLeft: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
            }}
          />
          <button
            type="button"
            onClick={() => setIsInspectorCollapsed(true)}
            aria-label="Collapse inspector"
            style={{
              position: "absolute",
              top: "50%",
              left: -12,
              transform: "translateY(-50%)",
              zIndex: 2,
              border: "1px solid var(--border)",
              background: "var(--floating)",
              color: "var(--muted)",
              borderRadius: 8,
              width: 24,
              height: 24,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ›
          </button>
          <PropertyInspector width={inspectorWidth} />
        </div>
      )}
    </>
  );
}

function AgentWorkspace() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const [prompt, setPrompt] = useState(
    "Review the current graph design and generate an execution plan.",
  );

  const summary = useMemo(() => {
    const kindCount: Record<string, number> = {};
    for (const node of nodes) {
      const kind =
        typeof node.data === "object" &&
        node.data &&
        "kind" in node.data &&
        typeof node.data.kind === "string"
          ? node.data.kind
          : node.type || "unknown";
      kindCount[kind] = (kindCount[kind] || 0) + 1;
    }
    return kindCount;
  }, [nodes]);

  const executionPayload = useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        kind:
          typeof node.data === "object" &&
          node.data &&
          "kind" in node.data &&
          typeof node.data.kind === "string"
            ? node.data.kind
            : node.type || "unknown",
        label:
          typeof node.data === "object" &&
          node.data &&
          "label" in node.data &&
          typeof node.data.label === "string"
            ? node.data.label
            : node.id,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type || "default",
      })),
    }),
    [edges, nodes],
  );

  const handleExecute = () => {
    console.log("Agent execution payload:", executionPayload);
    window.alert("Agent execution started. Check console for payload.");
  };

  return (
    <main
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
        gap: 14,
        padding: 14,
        background: "var(--background)",
        overflow: "auto",
      }}
    >
      <section
        style={{
          border: "1px solid color-mix(in srgb, var(--border) 75%, #ffffff 25%)",
          background: "color-mix(in srgb, var(--panel) 90%, #0b0d12 10%)",
          borderRadius: 12,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600 }}>Agent</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>design mode</div>
        </div>

        <div
          style={{
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flex: 1,
          }}
        >
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 10,
              background: "color-mix(in srgb, var(--floating) 90%, #000 10%)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              System
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45 }}>
              I can inspect your flow design and generate an execution payload.
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 10,
              background: "color-mix(in srgb, var(--panel) 85%, #0f1117 15%)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              You
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45 }}>{prompt}</div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "4px 8px",
                color: "var(--muted)",
              }}
            >
              nodes {nodes.length}
            </span>
            <span
              style={{
                fontSize: 11,
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "4px 8px",
                color: "var(--muted)",
              }}
            >
              edges {edges.length}
            </span>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              resize: "vertical",
              border: "1px solid var(--border)",
              background: "var(--floating)",
              color: "var(--foreground)",
              borderRadius: 10,
              fontSize: 12,
              padding: 10,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleExecute}
            style={{
              border: "1px solid var(--border)",
              background: "var(--foreground)",
              color: "var(--background)",
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Execute From Design
          </button>
        </div>
      </section>

      <section
        style={{
          border: "1px solid color-mix(in srgb, var(--border) 75%, #ffffff 25%)",
          background: "color-mix(in srgb, var(--panel) 90%, #0b0d12 10%)",
          borderRadius: 12,
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600 }}>Preview</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            generated {executionPayload.generatedAt}
          </div>
        </div>

        <div style={{ padding: 12, overflow: "auto", display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 10,
              background: "color-mix(in srgb, var(--floating) 92%, #000 8%)",
            }}
          >
            <div style={{ fontSize: 12, marginBottom: 8 }}>Design Summary</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
              Nodes: {nodes.length} | Connections: {edges.length}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {Object.entries(summary).map(([kind, count]) => (
                <div key={kind} style={{ fontSize: 12 }}>
                  {kind}: {count}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 10,
              background: "color-mix(in srgb, var(--panel) 85%, #0f1117 15%)",
            }}
          >
            <div style={{ fontSize: 12, marginBottom: 8 }}>Execution Payload</div>
            <pre
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.45,
                color: "var(--secondary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 420,
                overflow: "auto",
              }}
            >
              {JSON.stringify(executionPayload, null, 2)}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}

function DeployWorkspace() {
  return (
    <main
      style={{
        flex: 1,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "var(--background)",
      }}
    >
      <section
        style={{
          width: "min(680px, 100%)",
          border: "1px solid var(--border)",
          background: "var(--panel)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Deploy</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
          Deployment controls can be configured here. This tab is ready for
          pipeline actions such as validate, build, and release.
        </p>
      </section>
    </main>
  );
}

export default function Home() {
  const loadGraphPreset = useStore((state) => state.loadGraphPreset);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    if (typeof window === "undefined") return "api";
    const savedTab = localStorage.getItem(STORAGE_KEYS.activeTab);
    if (
      savedTab === "api" ||
      savedTab === "infra" ||
      savedTab === "database" ||
      savedTab === "agent" ||
      savedTab === "deploy"
    ) {
      return savedTab;
    }
    return "api";
  });
  const [resetLayoutSignal, setResetLayoutSignal] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [commitStatus, setCommitStatus] = useState("Uncommitted changes");
  const [saveState, setSaveState] = useState("Unsaved");
  const profileRef = useRef<HTMLDivElement | null>(null);
  const creditLimit = 1200;
  const creditUsed = 744;
  const creditUsedPercent = Math.min(
    100,
    Math.round((creditUsed / creditLimit) * 100),
  );

  const apiSections: SidebarSection[] = [
    {
      id: "api-processes",
      title: "Processes",
      items: [
        {
          kind: "process",
          label: "New Process",
          icon: "⚙️",
          hoverColor: "#a78bfa",
          hint: "General workflow logic",
        },
        {
          kind: "process",
          label: "Auth Process",
          icon: "🛡️",
          hoverColor: "#7dd3fc",
          hint: "Token/session validation",
        },
        {
          kind: "process",
          label: "Async Worker",
          icon: "🧠",
          hoverColor: "#f9a8d4",
          hint: "Background orchestration",
        },
      ],
    },
    {
      id: "api-infra",
      title: "Infrastructure",
      items: [
        {
          kind: "database",
          label: "Database",
          icon: "🗄️",
          hoverColor: "#4ade80",
          hint: "Persistent storage",
        },
        {
          kind: "queue",
          label: "Queue",
          icon: "📬",
          hoverColor: "#facc15",
          hint: "Async event buffer",
        },
        {
          kind: "queue",
          label: "Dead Letter Queue",
          icon: "📦",
          hoverColor: "#f97316",
          hint: "Failed message sink",
        },
      ],
    },
    {
      id: "api-endpoints",
      title: "API Endpoints",
      items: [
        {
          kind: "api_get",
          label: "GET",
          icon: "🟢",
          hoverColor: "#4ade80",
          mono: true,
          hint: "Fetch resources",
        },
        {
          kind: "api_post",
          label: "POST",
          icon: "🟡",
          hoverColor: "#facc15",
          mono: true,
          hint: "Create resources",
        },
        {
          kind: "api_put",
          label: "PUT",
          icon: "🔵",
          hoverColor: "#60a5fa",
          mono: true,
          hint: "Replace resources",
        },
        {
          kind: "api_delete",
          label: "DELETE",
          icon: "🔴",
          hoverColor: "#ef4444",
          mono: true,
          hint: "Remove resources",
        },
        {
          kind: "api_patch",
          label: "PATCH",
          icon: "🟣",
          hoverColor: "#a78bfa",
          mono: true,
          hint: "Partial updates",
        },
        {
          kind: "api_post",
          label: "Webhook Endpoint",
          icon: "🪝",
          hoverColor: "#fb7185",
          hint: "Inbound third-party events",
        },
        {
          kind: "api_binding",
          label: "Custom API",
          icon: "🔗",
          hoverColor: "var(--secondary)",
          hint: "Manual endpoint schema",
        },
      ],
      muted: true,
    },
    {
      id: "api-templates",
      title: "Quick Templates",
      items: [
        {
          kind: "api_get",
          label: "Health Check",
          icon: "💚",
          hoverColor: "#4ade80",
          hint: "Service status endpoint",
        },
        {
          kind: "process",
          label: "Validation Pipeline",
          icon: "✅",
          hoverColor: "#22d3ee",
          hint: "Input and schema checks",
        },
      ],
    },
  ];

  const infraSections: SidebarSection[] = [
    {
      id: "infra-core",
      title: "Infrastructure",
      items: [
        {
          kind: "database",
          label: "Database",
          icon: "🗄️",
          hoverColor: "#4ade80",
          hint: "Primary data service",
        },
        {
          kind: "queue",
          label: "Queue",
          icon: "📬",
          hoverColor: "#facc15",
          hint: "Work distribution",
        },
        {
          kind: "queue",
          label: "Retry Queue",
          icon: "♻️",
          hoverColor: "#f59e0b",
          hint: "Retry/backoff channel",
        },
      ],
    },
    {
      id: "infra-flows",
      title: "Supporting Workflows",
      items: [
        {
          kind: "process",
          label: "Infra Process",
          icon: "⚙️",
          hoverColor: "#a78bfa",
          hint: "Provision/maintenance logic",
        },
        {
          kind: "process",
          label: "Migration Runner",
          icon: "🚚",
          hoverColor: "#38bdf8",
          hint: "Schema/data migrations",
        },
        {
          kind: "process",
          label: "Backup Job",
          icon: "🛟",
          hoverColor: "#34d399",
          hint: "Scheduled backup pipeline",
        },
      ],
    },
  ];

  const databaseSections: SidebarSection[] = [
    {
      id: "db-engines",
      title: "Databases",
      items: [
        {
          kind: "database",
          label: "Primary Database",
          icon: "🗄️",
          hoverColor: "#4ade80",
          hint: "Main OLTP store",
        },
        {
          kind: "database",
          label: "Read Replica",
          icon: "📚",
          hoverColor: "#60a5fa",
          hint: "Read-heavy workloads",
        },
        {
          kind: "database",
          label: "Analytics Store",
          icon: "📈",
          hoverColor: "#c084fc",
          hint: "Reporting & BI",
        },
      ],
    },
    {
      id: "db-pipelines",
      title: "Data Pipelines",
      items: [
        {
          kind: "queue",
          label: "Queue",
          icon: "📬",
          hoverColor: "#facc15",
          hint: "Ingestion stream",
        },
        {
          kind: "queue",
          label: "ETL Queue",
          icon: "🧪",
          hoverColor: "#f59e0b",
          hint: "Batch transformation tasks",
        },
        {
          kind: "process",
          label: "DB Process",
          icon: "⚙️",
          hoverColor: "#a78bfa",
          hint: "Data operation workflow",
        },
        {
          kind: "process",
          label: "Cleanup Job",
          icon: "🧹",
          hoverColor: "#22d3ee",
          hint: "Retention and archiving",
        },
      ],
    },
  ];

  const statusText =
    activeTab === "deploy"
      ? "Deploy workspace ready"
      : activeTab === "agent"
      ? "Agent view ready"
      : activeTab === "database"
        ? "Database workspace ready"
      : activeTab === "infra"
        ? "Infra workspace ready"
        : "API workspace ready";

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileRef.current &&
        event.target instanceof Node &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  const handleSaveChanges = () => {
    setSaveState("Saved");
  };

  const handleCommitChanges = () => {
    setCommitStatus("Committed");
  };

  const handleResetLayout = () => {
    setResetLayoutSignal((prev) => prev + 1);
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
          background: "color-mix(in srgb, var(--panel) 94%, #0c111a 6%)",
          padding: "0 18px",
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
          style={{
            fontFamily: "var(--font-poetic)",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "0.025em",
            lineHeight: 1,
            color: "color-mix(in srgb, var(--foreground) 94%, #ffffff 6%)",
          }}
        >
          Ermiz Studio
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: 80,
              borderRadius: 12,
              padding: 4,
            }}
          >
            {(Object.keys(tabLabel) as WorkspaceTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  border: "none",
                  borderRadius: 9,
                  padding: "7px 11px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  background:
                    activeTab === tab
                      ? "color-mix(in srgb, var(--panel) 85%, #111826 15%)"
                      : "transparent",
                  color:
                    activeTab === tab ? "var(--foreground)" : "var(--muted)",
                  boxShadow:
                    activeTab === tab
                      ? "inset 0 0 0 1px var(--border)"
                      : "none",
                }}
              >
                {tabLabel[tab]}
              </button>
            ))}
          </div>
        </div>
        <div
          ref={profileRef}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleSaveChanges}
            style={{
              border: "1px solid var(--border)",
              background: "var(--floating)",
              color: "var(--foreground)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={handleCommitChanges}
            style={{
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--primary) 20%, var(--panel) 80%)",
              color: "var(--foreground)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Commit
          </button>
          <button
            type="button"
            onClick={handleResetLayout}
            title="Reset panel layout (Ctrl/Cmd+0)"
            style={{
              border: "1px solid var(--border)",
              background: "var(--floating)",
              color: "var(--foreground)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset Layout
          </button>
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-label="Open profile menu"
            style={{
              width: 34,
              height: 34,
              border: "1px solid var(--border)",
              background: "var(--floating)",
              color: "var(--foreground)",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
            }}
          >
            JS
          </button>

          {isProfileOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 260,
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "color-mix(in srgb, var(--panel) 95%, #0a1018 5%)",
                boxShadow: "var(--shadow-float)",
                padding: 10,
                zIndex: 20,
              }}
            >
              <div
                style={{
                  padding: "4px 6px 10px 6px",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>Jitendra</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Ermiz Studio Workspace
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  loadGraphPreset("empty");
                  setSaveState("Unsaved");
                  setCommitStatus("Uncommitted changes");
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "1px solid var(--border)",
                  background: "var(--floating)",
                  color: "var(--foreground)",
                  padding: "8px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                + New Project
              </button>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 8,
                  marginBottom: 8,
                  display: "grid",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "1px solid var(--border)",
                    background: "var(--floating)",
                    color: "var(--foreground)",
                    padding: "7px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCommitChanges}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "1px solid var(--border)",
                    background:
                      "color-mix(in srgb, var(--primary) 18%, var(--panel) 82%)",
                    color: "var(--foreground)",
                    padding: "7px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Commit Changes
                </button>
                <button
                  type="button"
                  onClick={handleResetLayout}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "1px solid var(--border)",
                    background: "var(--floating)",
                    color: "var(--foreground)",
                    padding: "7px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Reset Layout
                </button>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Credit Limit View
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {creditUsed} / {creditLimit} credits used
                </div>
                <div
                  style={{
                    marginTop: 8,
                    width: "100%",
                    height: 6,
                    background: "var(--background)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${creditUsedPercent}%`,
                      height: "100%",
                      background: "var(--primary)",
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  window.alert("Upgrade flow can be connected here.");
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "1px solid var(--border)",
                  background: "color-mix(in srgb, var(--primary) 22%, var(--panel) 78%)",
                  color: "var(--foreground)",
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Buy Pro
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {activeTab === "agent" ? (
          <AgentWorkspace />
        ) : activeTab === "deploy" ? (
          <DeployWorkspace />
        ) : (
          <Workspace
            key={`workspace-${activeTab}-${resetLayoutSignal}`}
            sections={
              activeTab === "api"
                ? apiSections
                : activeTab === "infra"
                  ? infraSections
                  : databaseSections
            }
          />
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer
        style={{
          height: 28,
          flexShrink: 0,
          background: "color-mix(in srgb, var(--panel) 94%, #0c111a 6%)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          fontSize: 11,
          color: "var(--muted)",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>{statusText}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "2px 8px",
              color: "var(--secondary)",
            }}
          >
            Credits Used: {creditUsedPercent}%
          </span>
          <span
            style={{
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "2px 8px",
              color: "var(--secondary)",
            }}
          >
            Save: {saveState}
          </span>
          <span
            style={{
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "2px 8px",
              color: "var(--secondary)",
            }}
          >
            Commit: {commitStatus}
          </span>
        </div>
      </footer>
    </div>
  );
}
