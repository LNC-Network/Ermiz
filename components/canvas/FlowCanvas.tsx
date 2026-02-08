"use client";

import React, { ComponentType, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  DefaultEdgeOptions,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore } from "@/store/useStore";
import { ProcessNode } from "./nodes/ProcessNode";
import { DatabaseNode } from "./nodes/DatabaseNode";
import { QueueNode } from "./nodes/QueueNode";
import { ApiBindingNode } from "./nodes/ApiBindingNode";
import { StepEdge } from "./edges/StepEdge";
import { ContextMenu } from "./ContextMenu";

const nodeTypes: NodeTypes = {
  process: ProcessNode as unknown as ComponentType<NodeProps>,
  database: DatabaseNode as unknown as ComponentType<NodeProps>,
  queue: QueueNode as unknown as ComponentType<NodeProps>,
  api_binding: ApiBindingNode as unknown as ComponentType<NodeProps>,
};

const edgeTypes: EdgeTypes = {
  step: StepEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "step",
  animated: false,
};

interface ContextMenuState {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
}

function FlowCanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } =
    useStore();
  const { screenToFlowPosition } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition,
      });
    },
    [screenToFlowPosition],
  );

  const handleAddNode = useCallback(
    (kind: string, position: { x: number; y: number }) => {
      addNode(kind as Parameters<typeof addNode>[0], position);
    },
    [addNode],
  );

  return (
    <div className="h-full w-full" onContextMenu={handleContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        colorMode="dark"
        snapToGrid={true}
        snapGrid={[20, 20]}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode={["Shift"]}
        onPaneClick={() => setContextMenu(null)}
      >
        <Background
          gap={20}
          size={1}
          style={{ background: "var(--background)" }}
        />
        <Controls
          style={{
            background: "var(--floating)",
            borderColor: "var(--border)",
          }}
        />
        <MiniMap
          style={{
            background: "var(--floating)",
            borderColor: "var(--border)",
          }}
          nodeColor={(node) => {
            if (node.data?.kind === "database") return "#336791";
            if (node.data?.kind === "queue") return "#facc15";
            if (node.data?.kind === "api_binding") return "#a78bfa";
            return "#7c6cff";
          }}
        />
      </ReactFlow>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          flowPosition={contextMenu.flowPosition}
          onClose={() => setContextMenu(null)}
          onAddNode={handleAddNode}
        />
      )}
    </div>
  );
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
