"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { PropertyInspector } from "@/components/panels/PropertyInspector";
import { DatabaseSchemaDesigner } from "@/components/panels/DatabaseSchemaDesigner";
import { DatabaseQueryBuilder } from "@/components/panels/DatabaseQueryBuilder";
import { supabaseClient } from "@/lib/supabase/client";
import { useStore } from "@/store/useStore";

const FlowCanvas = dynamic(() => import("@/components/canvas/FlowCanvas"), {
  ssr: false,
});

type WorkspaceTab =
  | "api"
  | "infra"
  | "database"
  | "functions"
  | "agent"
  | "deploy";

const tabLabel: Record<WorkspaceTab, string> = {
  api: "API",
  infra: "Infra",
  database: "Database",
  functions: "Functions",
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
  flatList = false,
  showSearch = false,
}: {
  sections: SidebarSection[];
  flatList?: boolean;
  showSearch?: boolean;
}) {
  const addNode = useStore((state) => state.addNode);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [componentSearch, setComponentSearch] = useState("");
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
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

  const flatItems = useMemo(
    () =>
      sections.flatMap((section) =>
        section.items.map((item, index) => ({
          ...item,
          key: `${section.id}-${item.kind}-${item.label}-${index}`,
          muted: section.muted ?? false,
        })),
      ),
    [sections],
  );

  const filteredFlatItems = useMemo(() => {
    if (!flatList) return flatItems;
    const query = componentSearch.trim().toLowerCase();
    if (!query) return flatItems;
    return flatItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.kind.toLowerCase().includes(query) ||
        (item.hint?.toLowerCase().includes(query) ?? false),
    );
  }, [componentSearch, flatItems, flatList]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const leftCollapsed = localStorage.getItem(STORAGE_KEYS.leftSidebarCollapsed) === "1";
      const rightCollapsed = localStorage.getItem(STORAGE_KEYS.rightSidebarCollapsed) === "1";
      const leftWidth = Number(localStorage.getItem(STORAGE_KEYS.leftSidebarWidth));
      const inspectorStored = Number(localStorage.getItem(STORAGE_KEYS.inspectorWidth));
      const isNarrow = window.matchMedia("(max-width: 1024px)").matches;
      setIsLeftSidebarCollapsed(isNarrow ? true : leftCollapsed);
      setIsInspectorCollapsed(isNarrow ? true : rightCollapsed);
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
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const updateViewport = (event?: MediaQueryListEvent) => {
      const isNarrow = event ? event.matches : mediaQuery.matches;
      setIsNarrowViewport(isNarrow);
    };
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
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
    <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
      {isNarrowViewport && (!isLeftSidebarCollapsed || !isInspectorCollapsed) && (
        <button
          type="button"
          aria-label="Close open panel"
          onClick={() => {
            setIsLeftSidebarCollapsed(true);
            setIsInspectorCollapsed(true);
          }}
          style={{
            position: "absolute",
            inset: 0,
            border: "none",
            margin: 0,
            padding: 0,
            background: "rgba(8, 12, 18, 0.48)",
            zIndex: 24,
            cursor: "pointer",
          }}
        />
      )}

      {isNarrowViewport && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            zIndex: 26,
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsLeftSidebarCollapsed((prev) => !prev);
              setIsInspectorCollapsed(true);
            }}
            style={{
              border: "1px solid var(--border)",
              background: "var(--floating)",
              color: "var(--foreground)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            {isLeftSidebarCollapsed ? "Open library" : "Close library"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsInspectorCollapsed((prev) => !prev);
              setIsLeftSidebarCollapsed(true);
            }}
            style={{
              border: "1px solid var(--border)",
              background: "var(--floating)",
              color: "var(--foreground)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            {isInspectorCollapsed ? "Open inspector" : "Close inspector"}
          </button>
        </div>
      )}

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
            display: isNarrowViewport ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ›
        </button>
      ) : (
        <div
          style={{
            position: isNarrowViewport ? "absolute" : "relative",
            top: isNarrowViewport ? 0 : undefined,
            left: 0,
            bottom: isNarrowViewport ? 0 : undefined,
            display: "flex",
            zIndex: isNarrowViewport ? 26 : 20,
          }}
        >
          <button
            type="button"
            onClick={() => setIsLeftSidebarCollapsed(true)}
            aria-label="Collapse left sidebar"
            style={{
              position: "absolute",
              top: "50%",
              right: isNarrowViewport ? 8 : -12,
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
              width: sidebarWidth,
              flexShrink: 0,
              height: "100%",
              minHeight: 0,
              borderRight: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--panel) 92%, #0b0f16 8%)",
              paddingTop: isNarrowViewport ? 52 : 12,
              paddingRight: 12,
              paddingBottom: 16,
              paddingLeft: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehaviorY: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {flatList ? (
              <>
                {showSearch && (
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      background: "var(--floating)",
                      padding: 8,
                    }}
                  >
                    <input
                      type="text"
                      value={componentSearch}
                      onChange={(e) => setComponentSearch(e.target.value)}
                      placeholder="Search components..."
                      style={{
                        width: "100%",
                        border: "1px solid var(--border)",
                        background: "var(--panel)",
                        color: "var(--foreground)",
                        borderRadius: 8,
                        padding: "7px 9px",
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                  </div>
                )}
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    background: "color-mix(in srgb, var(--panel) 85%, #0b1018 15%)",
                    padding: 8,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  {filteredFlatItems.map((item) => (
                    <div
                      key={item.key}
                      style={{
                        ...sidebarItemStyle,
                        color: item.muted ? "var(--muted)" : "var(--secondary)",
                      }}
                      onClick={() => addNode(item.kind)}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "var(--floating)";
                        e.currentTarget.style.color = item.hoverColor;
                        e.currentTarget.style.borderColor = "var(--border)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = item.muted
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
                  {filteredFlatItems.length === 0 && (
                    <div
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: "var(--muted)",
                        textAlign: "center",
                      }}
                    >
                      No components match your search.
                    </div>
                  )}
                </div>
              </>
            ) : (
              sections.map((section) => (
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
                            color: section.muted
                              ? "var(--muted)"
                              : "var(--secondary)",
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
              ))
            )}
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
            display: isNarrowViewport ? "none" : "block",
          }}
        />
      )}

      <main
        style={{
          flex: 1,
          position: "relative",
          background: "var(--background)",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <FlowCanvas />
        </div>
        {isDatabaseWorkspace && (
          <>
            <DatabaseSchemaDesigner />
            <DatabaseQueryBuilder />
          </>
        )}
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
            display: isNarrowViewport ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ‹
        </button>
      ) : (
        <div
          style={{
            position: isNarrowViewport ? "absolute" : "relative",
            top: isNarrowViewport ? 0 : undefined,
            right: 0,
            bottom: isNarrowViewport ? 0 : undefined,
            display: "flex",
            zIndex: isNarrowViewport ? 26 : undefined,
          }}
        >
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
              display: isNarrowViewport ? "none" : "block",
            }}
          />
          <button
            type="button"
            onClick={() => setIsInspectorCollapsed(true)}
            aria-label="Collapse inspector"
            style={{
              position: "absolute",
              top: "50%",
              left: isNarrowViewport ? 8 : -12,
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
          <PropertyInspector
            width={isNarrowViewport ? Math.min(inspectorWidth, 360) : inspectorWidth}
          />
        </div>
      )}
    </div>
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
  const [platform, setPlatform] = useState("vercel");
  const [credentialType, setCredentialType] = useState("oauth");
  const [billingMode, setBillingMode] = useState("platform");
  const [environment, setEnvironment] = useState("production");

  const platforms = [
    {
      id: "vercel",
      name: "Vercel",
      desc: "Next.js native, global edge + preview deploys",
    },
    {
      id: "aws",
      name: "AWS",
      desc: "ECS / Lambda with private networking controls",
    },
    {
      id: "gcp",
      name: "Google Cloud",
      desc: "Cloud Run + Artifact Registry pipelines",
    },
    {
      id: "render",
      name: "Render",
      desc: "Simple builds with managed Postgres",
    },
    {
      id: "fly",
      name: "Fly.io",
      desc: "Global regions with instant scaling",
    },
    {
      id: "railway",
      name: "Railway",
      desc: "Quick services with team billing",
    },
  ];

  const actionButtonStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    background: "var(--floating)",
    color: "var(--foreground)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <main
      style={{
        flex: 1,
        padding: "18px 20px 28px",
        background: "var(--background)",
        overflow: "auto",
      }}
    >
      <div
        style={{
          width: "min(1200px, 100%)",
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        <section
          style={{
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--panel) 92%, #0a0f16 8%)",
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Deployment</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Configure the platform, credentials, billing, and release pipeline.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={actionButtonStyle}>
              Validate
            </button>
            <button
              type="button"
              style={{
                ...actionButtonStyle,
                background:
                  "color-mix(in srgb, var(--primary) 20%, var(--panel) 80%)",
              }}
            >
              Build
            </button>
            <button
              type="button"
              style={{
                ...actionButtonStyle,
                background:
                  "color-mix(in srgb, var(--secondary) 18%, var(--panel) 82%)",
              }}
            >
              Deploy
            </button>
            <button type="button" style={actionButtonStyle}>
              Rollback
            </button>
          </div>
        </section>

        <section
          style={{
            border: "1px solid var(--border)",
            background: "var(--panel)",
            borderRadius: 14,
            padding: 16,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>Choose Platform</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 10,
            }}
          >
            {platforms.map((item) => {
              const isActive = platform === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlatform(item.id)}
                  style={{
                    border: "1px solid var(--border)",
                    background: isActive
                      ? "color-mix(in srgb, var(--primary) 18%, var(--panel) 82%)"
                      : "color-mix(in srgb, var(--floating) 94%, #0b0f16 6%)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: isActive ? "var(--shadow-soft)" : "none",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    {item.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                background: "var(--floating)",
              }}
            >
              <div style={{ fontSize: 12, marginBottom: 8 }}>Environment</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["production", "staging", "preview"].map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      padding: "5px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      background:
                        environment === env
                          ? "color-mix(in srgb, var(--panel) 80%, #141a24 20%)"
                          : "transparent",
                      color:
                        environment === env
                          ? "var(--foreground)"
                          : "var(--muted)",
                    }}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                background: "var(--floating)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12 }}>Region & Runtime</div>
              <select
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "var(--panel)",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
                defaultValue="iad"
              >
                <option value="iad">US East (IAD)</option>
                <option value="sfo">US West (SFO)</option>
                <option value="lon">EU West (LON)</option>
                <option value="sin">Asia Pacific (SIN)</option>
              </select>
              <select
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "var(--panel)",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
                defaultValue="node"
              >
                <option value="node">Node.js 20</option>
                <option value="edge">Edge Runtime</option>
                <option value="docker">Docker Container</option>
              </select>
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid var(--border)",
            background: "var(--panel)",
            borderRadius: 14,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Credentials & Billing
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "oauth", label: "OAuth Connection" },
              { id: "api_key", label: "API Key" },
              { id: "service_account", label: "Service Account" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCredentialType(item.id)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 11,
                  cursor: "pointer",
                  background:
                    credentialType === item.id
                      ? "color-mix(in srgb, var(--primary) 18%, var(--panel) 82%)"
                      : "transparent",
                  color:
                    credentialType === item.id
                      ? "var(--foreground)"
                      : "var(--muted)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {credentialType === "oauth" && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                background: "var(--floating)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12 }}>
                Connect {platforms.find((item) => item.id === platform)?.name}
              </div>
              <button
                type="button"
                style={{
                  ...actionButtonStyle,
                  width: "fit-content",
                }}
              >
                Authorize Workspace
              </button>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Last sync: not connected
              </div>
            </div>
          )}

          {credentialType === "api_key" && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                background: "var(--floating)",
                display: "grid",
                gap: 8,
              }}
            >
              <input
                placeholder="API Key"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "var(--panel)",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
              />
              <input
                placeholder="Account ID"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "var(--panel)",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
              />
              <input
                placeholder="Project ID"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "var(--panel)",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
              />
            </div>
          )}

          {credentialType === "service_account" && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                background: "var(--floating)",
                display: "grid",
                gap: 8,
              }}
            >
              <textarea
                placeholder="Paste service account JSON"
                rows={4}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px",
                  background: "var(--panel)",
                  color: "var(--foreground)",
                  fontSize: 12,
                  resize: "vertical",
                }}
              />
              <input
                placeholder="Project / Org"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "var(--panel)",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
              />
            </div>
          )}

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600 }}>Billing</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { id: "platform", label: "Use Platform Billing" },
                { id: "card", label: "Add Card" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBillingMode(item.id)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontSize: 11,
                    cursor: "pointer",
                    background:
                      billingMode === item.id
                        ? "color-mix(in srgb, var(--secondary) 18%, var(--panel) 82%)"
                        : "transparent",
                    color:
                      billingMode === item.id
                        ? "var(--foreground)"
                        : "var(--muted)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {billingMode === "card" && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--floating)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <input
                  placeholder="Cardholder Name"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    background: "var(--panel)",
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                />
                <input
                  placeholder="Card Number"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    background: "var(--panel)",
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    placeholder="MM / YY"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "6px 8px",
                      background: "var(--panel)",
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                  <input
                    placeholder="CVC"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "6px 8px",
                      background: "var(--panel)",
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            border: "1px solid var(--border)",
            background: "var(--panel)",
            borderRadius: 14,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>Deployment Pipeline</div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              "Generate OpenAPI / AsyncAPI",
              "Compile runtime artifacts",
              "Run database migrations",
              "Seed reference data",
              "Upload build to artifact registry",
              "Notify team on release",
            ].map((item) => (
              <label
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                <input type="checkbox" defaultChecked />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600 }}>Release Controls</div>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                "Zero-downtime deployment",
                "Auto rollback on failed health check",
                "Canary release (10% traffic)",
                "Enable preview deployments",
              ].map((item) => (
                <label
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  <input type="checkbox" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid var(--border)",
            background: "var(--panel)",
            borderRadius: 14,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Secrets, Domains, and Observability
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                background: "var(--floating)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>Secrets</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                DATABASE_URL, SUPABASE_KEY, STRIPE_SECRET
              </div>
              <button type="button" style={actionButtonStyle}>
                Add Secret
              </button>
            </div>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                background: "var(--floating)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>Custom Domain</div>
              <input
                placeholder="api.yourdomain.com"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "var(--panel)",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
              />
              <button type="button" style={actionButtonStyle}>
                Verify DNS
              </button>
            </div>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                background: "var(--floating)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                Observability
              </div>
              <label style={{ display: "flex", gap: 8, fontSize: 12 }}>
                <input type="checkbox" defaultChecked />
                Stream logs to dashboard
              </label>
              <label style={{ display: "flex", gap: 8, fontSize: 12 }}>
                <input type="checkbox" />
                Enable traces & metrics
              </label>
              <label style={{ display: "flex", gap: 8, fontSize: 12 }}>
                <input type="checkbox" />
                Alert on error spikes
              </label>
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid var(--border)",
            background: "var(--panel)",
            borderRadius: 14,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>Recent Deployments</div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              {
                id: "rel-322",
                status: "Live",
                meta: "Production · US East · 2m ago",
              },
              {
                id: "rel-321",
                status: "Rolled back",
                meta: "Production · EU West · 1d ago",
              },
              {
                id: "rel-320",
                status: "Preview",
                meta: "Staging · US West · 2d ago",
              },
            ].map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--floating)",
                }}
              >
                <div style={{ fontSize: 12 }}>
                  {item.id} · {item.status}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {item.meta}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  const router = useRouter();
  const setActiveWorkspaceTab = useStore((state) => state.setActiveTab);
  const loadGraphPreset = useStore((state) => state.loadGraphPreset);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("api");
  const [resetLayoutSignal, setResetLayoutSignal] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [commitStatus, setCommitStatus] = useState("Uncommitted changes");
  const [saveState, setSaveState] = useState("Unsaved");
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [user, setUser] = useState<{
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
    identities?: Array<{ identity_data?: Record<string, unknown> | null }> | null;
  } | null>(null);
  const creditLimit = 1200;
  const creditUsed = 744;
  const creditUsedPercent = Math.min(
    100,
    Math.round((creditUsed / creditLimit) * 100),
  );

  const apiSections: SidebarSection[] = [
    {
      id: "api-processes",
      title: "Function Block",
      items: [
        {
          kind: "process",
          label: "Function Block",
          icon: "⚙️",
          hoverColor: "#a78bfa",
          hint: "Single API block that imports from Functions tab",
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
      id: "api-interfaces",
      title: "Interface Blocks",
      items: [
        {
          kind: "api_rest",
          label: "REST Interface",
          icon: "🔗",
          hoverColor: "#60a5fa",
          hint: "Protocol-level REST contract",
        },
        {
          kind: "api_ws",
          label: "WebSocket Interface",
          icon: "🛰️",
          hoverColor: "#22d3ee",
          hint: "Raw WebSocket protocol",
        },
        {
          kind: "api_socketio",
          label: "Socket.IO Interface",
          icon: "🧩",
          hoverColor: "#38bdf8",
          hint: "Namespaces, rooms, events",
        },
        {
          kind: "api_webrtc",
          label: "WebRTC Interface",
          icon: "📹",
          hoverColor: "#f472b6",
          hint: "P2P sessions via signaling",
        },
        {
          kind: "api_graphql",
          label: "GraphQL Interface",
          icon: "🕸️",
          hoverColor: "#c084fc",
          hint: "Schema-driven queries and mutations",
        },
        {
          kind: "api_grpc",
          label: "gRPC Interface",
          icon: "📡",
          hoverColor: "#34d399",
          hint: "Protobuf service contract",
        },
        {
          kind: "api_sse",
          label: "SSE Interface",
          icon: "📣",
          hoverColor: "#f59e0b",
          hint: "Server-to-client event stream",
        },
        {
          kind: "api_webhook",
          label: "Webhook Interface",
          icon: "🪝",
          hoverColor: "#fb7185",
          hint: "Incoming callback endpoint",
        },
      ],
    },
  ];

  const infraSections: SidebarSection[] = [
    {
      id: "infra-compute",
      title: "Compute",
      items: [
        {
          kind: "infra_ec2",
          label: "EC2 Instance",
          icon: "🖥️",
          hoverColor: "#60a5fa",
          hint: "Virtual machines + autoscaling",
        },
        {
          kind: "infra_lambda",
          label: "Lambda Function",
          icon: "⚡",
          hoverColor: "#facc15",
          hint: "Serverless execution",
        },
        {
          kind: "infra_eks",
          label: "EKS Cluster",
          icon: "🧩",
          hoverColor: "#34d399",
          hint: "Managed Kubernetes",
        },
        {
          kind: "infra_hpc",
          label: "HPC Cluster",
          icon: "🚀",
          hoverColor: "#f472b6",
          hint: "Batch compute + schedulers",
        },
      ],
    },
    {
      id: "infra-network",
      title: "Networking",
      items: [
        {
          kind: "infra_vpc",
          label: "VPC Network",
          icon: "🧭",
          hoverColor: "#a78bfa",
          hint: "Subnets, routes, NAT",
        },
        {
          kind: "infra_lb",
          label: "Load Balancer",
          icon: "📡",
          hoverColor: "#22d3ee",
          hint: "ALB/NLB listeners + targets",
        },
      ],
    },
    {
      id: "infra-interfaces",
      title: "Interfaces",
      items: [
        {
          kind: "api_rest",
          label: "REST Interface",
          icon: "🔗",
          hoverColor: "#60a5fa",
          hint: "Expose infra-backed REST contract",
        },
        {
          kind: "api_ws",
          label: "WebSocket Interface",
          icon: "🛰️",
          hoverColor: "#22d3ee",
          hint: "Expose raw WebSocket contract",
        },
        {
          kind: "api_socketio",
          label: "Socket.IO Interface",
          icon: "🧩",
          hoverColor: "#38bdf8",
          hint: "Expose Socket.IO contract",
        },
        {
          kind: "api_webrtc",
          label: "WebRTC Interface",
          icon: "📹",
          hoverColor: "#f472b6",
          hint: "Expose WebRTC contract",
        },
        {
          kind: "api_graphql",
          label: "GraphQL Interface",
          icon: "🕸️",
          hoverColor: "#c084fc",
          hint: "Expose GraphQL contract",
        },
        {
          kind: "api_grpc",
          label: "gRPC Interface",
          icon: "📡",
          hoverColor: "#34d399",
          hint: "Expose gRPC service contract",
        },
        {
          kind: "api_sse",
          label: "SSE Interface",
          icon: "📣",
          hoverColor: "#f59e0b",
          hint: "Expose server-sent event stream",
        },
        {
          kind: "api_webhook",
          label: "Webhook Interface",
          icon: "🪝",
          hoverColor: "#fb7185",
          hint: "Expose callback endpoint contract",
        },
      ],
    },
    {
      id: "infra-storage",
      title: "Storage",
      items: [
        {
          kind: "infra_s3",
          label: "S3 Bucket",
          icon: "🪣",
          hoverColor: "#f97316",
          hint: "Object storage",
        },
        {
          kind: "infra_rds",
          label: "RDS Instance",
          icon: "🗄️",
          hoverColor: "#3b82f6",
          hint: "Managed relational DB",
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
      id: "db-interfaces",
      title: "Interfaces",
      items: [
        {
          kind: "api_rest",
          label: "REST Interface",
          icon: "🔗",
          hoverColor: "#60a5fa",
          hint: "Data-access contract via REST",
        },
        {
          kind: "api_ws",
          label: "WebSocket Interface",
          icon: "🛰️",
          hoverColor: "#22d3ee",
          hint: "Realtime data contract (raw WS)",
        },
        {
          kind: "api_socketio",
          label: "Socket.IO Interface",
          icon: "🧩",
          hoverColor: "#38bdf8",
          hint: "Realtime data contract (Socket.IO)",
        },
        {
          kind: "api_webrtc",
          label: "WebRTC Interface",
          icon: "📹",
          hoverColor: "#f472b6",
          hint: "Realtime media/signaling contract",
        },
        {
          kind: "api_graphql",
          label: "GraphQL Interface",
          icon: "🕸️",
          hoverColor: "#c084fc",
          hint: "Data-access contract via GraphQL",
        },
        {
          kind: "api_grpc",
          label: "gRPC Interface",
          icon: "📡",
          hoverColor: "#34d399",
          hint: "Data-access contract via gRPC",
        },
        {
          kind: "api_sse",
          label: "SSE Interface",
          icon: "📣",
          hoverColor: "#f59e0b",
          hint: "One-way event stream contract",
        },
        {
          kind: "api_webhook",
          label: "Webhook Interface",
          icon: "🪝",
          hoverColor: "#fb7185",
          hint: "Inbound callback contract",
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
          label: "Function Block",
          icon: "⚙️",
          hoverColor: "#a78bfa",
          hint: "Configurable function logic",
        },
      ],
    },
  ];

  const functionSections: SidebarSection[] = [
    {
      id: "functions-business-logic",
      title: "Business Logic",
      items: [
        {
          kind: "process",
          label: "Function Block",
          icon: "⚙️",
          hoverColor: "#a78bfa",
          hint: "Define reusable business function",
        },
      ],
    },
  ];

  const statusText =
    activeTab === "deploy"
      ? "Deploy workspace ready"
      : activeTab === "agent"
      ? "Agent view ready"
      : activeTab === "functions"
      ? "Functions workspace ready"
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
        setIsLoginOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.user_metadata, user?.email, user?.identities]);

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getUser();
        if (!isMounted) return;
        if (error) {
          setUser(null);
          return;
        }
        setUser(data.user ?? null);
      } catch {
        if (!isMounted) return;
        setUser(null);
      }
    };

    loadUser();

    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setIsProfileOpen(false);
    } else {
      setIsLoginOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTab = localStorage.getItem(STORAGE_KEYS.activeTab);
    if (
      savedTab === "api" ||
      savedTab === "infra" ||
      savedTab === "database" ||
      savedTab === "functions" ||
      savedTab === "agent" ||
      savedTab === "deploy"
    ) {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 1100px)");
    const updateViewport = (event?: MediaQueryListEvent) => {
      const isCompact = event ? event.matches : mediaQuery.matches;
      setIsCompactViewport(isCompact);
    };
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    setActiveWorkspaceTab(activeTab);
  }, [activeTab, setActiveWorkspaceTab]);

  const handleSaveChanges = () => {
    setSaveState("Saved");
  };

  const handleCommitChanges = () => {
    setCommitStatus("Committed");
  };

  const handleResetLayout = () => {
    setResetLayoutSignal((prev) => prev + 1);
  };

  const handleLogin = async () => {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/studio",
    )}`;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      // keep the modal open so the user can retry
      // optional: surface error in UI later
    }
  };

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch {
      // ignore auth errors
    }
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors
    }
    setIsProfileOpen(false);
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const identityData =
    (user?.identities?.[0]?.identity_data ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof userMetadata.full_name === "string" && userMetadata.full_name) ||
    (typeof userMetadata.name === "string" && userMetadata.name) ||
    (typeof identityData.full_name === "string" && identityData.full_name) ||
    (typeof identityData.name === "string" && identityData.name) ||
    user?.email ||
    "Profile";
  const displayEmail = user?.email ?? "";
  const avatarUrl =
    (typeof userMetadata.avatar_url === "string" && userMetadata.avatar_url) ||
    (typeof userMetadata.picture === "string" && userMetadata.picture) ||
    (typeof identityData.avatar_url === "string" && identityData.avatar_url) ||
    (typeof identityData.picture === "string" && identityData.picture) ||
    "";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

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
          minHeight: 48,
          alignItems: isCompactViewport ? "stretch" : "center",
          justifyContent: "space-between",
          flexWrap: isCompactViewport ? "wrap" : "nowrap",
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--panel) 94%, #0c111a 6%)",
          padding: isCompactViewport ? "8px 10px" : "0 18px",
          flexShrink: 0,
          gap: isCompactViewport ? 8 : 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCompactViewport ? 8 : 14,
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
          style={{
            fontFamily: "var(--font-poetic)",
            fontWeight: 700,
            fontSize: isCompactViewport ? 20 : 26,
            letterSpacing: "0.025em",
            lineHeight: 1,
            color: "color-mix(in srgb, var(--foreground) 94%, #ffffff 6%)",
            whiteSpace: "nowrap",
          }}
        >
          Ermiz Studio
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: isCompactViewport ? 0 : 80,
              borderRadius: 12,
              padding: 4,
              overflowX: "auto",
              minWidth: 0,
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
            gap: isCompactViewport ? 6 : 10,
            marginLeft: isCompactViewport ? "auto" : 0,
          }}
        >
          {!isCompactViewport && (
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
          )}
          {!isCompactViewport && (
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
          )}
          {!isCompactViewport && (
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
          )}
          {user ? (
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
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              {avatarUrl && !avatarFailed ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  onError={() => setAvatarFailed(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {initials}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginOpen((prev) => !prev)}
              style={{
                border: "1px solid var(--border)",
                background: "var(--floating)",
                color: "var(--foreground)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          )}

          {isProfileOpen && user && (
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
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {displayName}
                  </div>
                  {displayEmail ? (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {displayEmail}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Not signed in
                    </div>
                  )}
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
                onClick={handleLogout}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "1px solid var(--border)",
                  background: "var(--floating)",
                  color: "var(--foreground)",
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                Log out
              </button>

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

          {isLoginOpen && !user && (
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
                padding: 12,
                zIndex: 20,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Sign in
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginBottom: 10,
                }}
              >
                Continue with Google to access your workspace.
              </div>
              <button
                onClick={handleLogin}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  background: "var(--foreground)",
                  color: "#0a0a0a",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sign in with Google
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
                  : activeTab === "database"
                    ? databaseSections
                    : functionSections
            }
            flatList={activeTab === "api"}
            showSearch={activeTab === "api"}
          />
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer
        style={{
          minHeight: isCompactViewport ? 30 : 28,
          flexShrink: 0,
          background: "color-mix(in srgb, var(--panel) 94%, #0c111a 6%)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: isCompactViewport ? "4px 10px" : "0 16px",
          fontSize: 11,
          color: "var(--muted)",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {statusText}
        </div>
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
          {!isCompactViewport && (
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
          )}
          {!isCompactViewport && (
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
          )}
        </div>
      </footer>
    </div>
  );
}
