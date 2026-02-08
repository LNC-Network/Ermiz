"use client";

import React, { useCallback } from "react";
import { ReactFlow, Background, Controls, NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore } from "@/store/useStore";
import { ProcessNode } from "./nodes/ProcessNode";
import { TriggerNode } from "./nodes/TriggerNode";

import { StepEdge } from "./edges/StepEdge";

const nodeTypes: NodeTypes = {
  process: ProcessNode as any,
  trigger: TriggerNode as any,
};

const edgeTypes = {
  step: StepEdge,
};

export default function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useStore();

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        colorMode="dark"
        snapToGrid={true}
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          type: "step",
          animated: false,
        }}
      >
        <Background color="#15151a" gap={20} />
        <Controls className="bg-[var(--floating)] border-none fill-[var(--foreground)]" />
      </ReactFlow>
    </div>
  );
}
