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

    return (
      <BaseNode
        selected={!!selected}
        type="TRIGGER"
        label={data.label}
        className={isTrigger ? "border-l-4 border-l-[var(--primary)]" : ""}
      >
        <div className="relative min-h-[40px] flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--floating)] ${
                method === "GET"
                  ? "text-blue-400"
                  : method === "POST"
                    ? "text-green-400"
                    : method === "DELETE"
                      ? "text-red-400"
                      : "text-yellow-400"
              }`}
            >
              {method}
            </span>
            <span className="text-xs font-mono text-[var(--foreground)] truncate">
              {route}
            </span>
          </div>

          {/* Output Handle (Right Only) */}
          <div className="absolute -right-3 top-1/2 -translate-y-1/2">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)] pointer-events-none">
              REQ
            </span>
            <Handle
              type="source"
              position={Position.Right}
              className="!w-3 !h-3 !bg-[var(--primary)] !border-none hover:scale-125 transition-transform"
            />
          </div>
        </div>
      </BaseNode>
    );
  },
);

TriggerNode.displayName = "TriggerNode";
