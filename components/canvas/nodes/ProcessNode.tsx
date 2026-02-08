import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { ProcessNode as ProcessNodeType } from "@/lib/schema/node";

// We wrap the component in memo to prevent unnecessary re-renders
export const ProcessNode = memo(
  ({ data, selected }: NodeProps<ProcessNodeType>) => {
    // Cast data safely knowing Zod validation happens elsewhere
    const config = data.type === "process" ? data.config : {};

    return (
      <BaseNode
        selected={!!selected}
        type="PROCESS"
        label={data.label}
        footer={
          <span className="flex items-center gap-1">
            Status: <span className="text-green-500">Ready</span>
          </span>
        }
      >
        <div className="relative min-h-[40px] flex flex-col justify-center">
          {/* Input Handle (Left) */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2">
            <Handle
              type="target"
              position={Position.Left}
              className="!w-3 !h-3 !bg-[var(--muted)] !border-none hover:!bg-[var(--primary)] transition-colors"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)] pointer-events-none">
              IN
            </span>
          </div>

          <div className="text-xs px-2 line-clamp-2">
            {data.description || "No description provided."}
          </div>

          {/* Output Handle (Right) */}
          <div className="absolute -right-3 top-1/2 -translate-y-1/2">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)] pointer-events-none">
              OUT
            </span>
            <Handle
              type="source"
              position={Position.Right}
              className="!w-3 !h-3 !bg-[var(--muted)] !border-none hover:!bg-[var(--primary)] transition-colors"
            />
          </div>
        </div>
      </BaseNode>
    );
  },
);

ProcessNode.displayName = "ProcessNode";
