import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { ProcessNode as ProcessNodeType } from "@/lib/schema/node";

export const TriggerNode = memo(
  ({ data, selected }: NodeProps<ProcessNodeType>) => {
    const isTrigger = data.type === "trigger";
    const config = isTrigger ? data.config : { method: "GET", route: "/" };
    const method = config.method || "GET";
    const route = config.route || "/";

    const methodColor =
      method === "GET" ? "#60a5fa" : method === "POST" ? "#4ade80" : "#fb923c";

    return (
      <BaseNode
        selected={!!selected}
        type="TRIGGER"
        label={data.label}
        className={isTrigger ? "trigger-accent" : ""}
      >
        <div className="relative" style={{ minHeight: 40 }}>
          {isTrigger && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--floating)",
                padding: "6px 8px",
                borderRadius: 4,
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: methodColor,
                }}
              >
                {method}
              </span>
              <span
                style={{ fontFamily: "monospace", color: "var(--foreground)" }}
              >
                {route}
              </span>
            </div>
          )}

          <div
            style={{ fontSize: 10, color: "var(--muted)", padding: "0 4px" }}
          >
            {data.description || "API Entry Point"}
          </div>

          {/* Output Handle (Right) Only */}
          <Handle
            type="source"
            position={Position.Right}
            style={{
              width: 12,
              height: 12,
              background: "var(--primary)",
              border: "2px solid var(--panel)",
              right: -6,
            }}
          />
        </div>
      </BaseNode>
    );
  },
);

TriggerNode.displayName = "TriggerNode";
