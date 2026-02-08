import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { DatabaseBlock } from "@/lib/schema/node";

export const DatabaseNode = memo(({ data, selected }: NodeProps) => {
  const dbData = data as unknown as DatabaseBlock;

  const engineColors: Record<string, string> = {
    postgres: "#336791",
    mysql: "#4479A1",
    mongodb: "#4DB33D",
    redis: "#DC382D",
    sqlite: "#003B57",
  };

  const enabledCapabilities = Object.entries(dbData.capabilities)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  return (
    <div
      style={{
        background: "var(--panel)",
        border: selected
          ? "2px solid var(--primary)"
          : "1px solid var(--border)",
        borderRadius: 8,
        minWidth: 240,
        boxShadow: selected
          ? "0 0 0 2px rgba(124, 108, 255, 0.2)"
          : "0 4px 12px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          background: engineColors[dbData.engine || ""] || "var(--floating)",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <span style={{ fontSize: 14 }}>🗄️</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            color: "white",
            letterSpacing: "0.05em",
          }}
        >
          {dbData.dbType.toUpperCase()}
        </span>
        {dbData.engine && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
            {dbData.engine}
          </span>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--foreground)",
          }}
        >
          {dbData.label}
        </div>
        {dbData.description && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            {dbData.description}
          </div>
        )}
      </div>

      {/* Capabilities */}
      {enabledCapabilities.length > 0 && (
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--muted)",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Capabilities
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 8px",
            }}
          >
            {enabledCapabilities.map((cap) => {
              const icons: Record<string, string> = {
                crud: "📝",
                transactions: "🔄",
                joins: "🔗",
                aggregations: "📊",
                indexes: "🔍",
                constraints: "🔐",
                pagination: "📖",
              };
              return (
                <span
                  key={cap}
                  style={{
                    fontSize: 10,
                    color: "var(--secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>{icons[cap] || "✓"}</span>
                  <span style={{ textTransform: "capitalize" }}>{cap}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Schemas */}
      {dbData.schemas.length > 0 && (
        <div style={{ padding: "8px 12px" }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--muted)",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Schemas
          </div>
          {dbData.schemas.map((schema, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "var(--secondary)",
                fontFamily: "monospace",
                marginBottom: 2,
              }}
            >
              📋 {schema}
            </div>
          ))}
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          background: "var(--muted)",
          border: "2px solid var(--panel)",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          background: engineColors[dbData.engine || ""] || "var(--primary)",
          border: "2px solid var(--panel)",
        }}
      />
    </div>
  );
});

DatabaseNode.displayName = "DatabaseNode";
