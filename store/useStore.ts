import { create } from "zustand";
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from "@xyflow/react";
import { ProcessGraph } from "@/lib/schema/graph";

type RFState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateNodeData: (id: string, data: any) => void;
  setGraph: (graph: ProcessGraph) => void;
};

export const useStore = create<RFState>((set, get) => ({
  nodes: [
    {
      id: "1",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: {
        label: "GET /users",
        type: "trigger",
        config: { method: "GET", route: "/users" },
      },
    },
    {
      id: "2",
      type: "process",
      position: { x: 400, y: 100 },
      data: {
        label: "Validate Input",
        type: "process",
        description: "Checks if the user has permission",
        config: {},
      },
    },
    {
      id: "3",
      type: "process",
      position: { x: 700, y: 100 },
      data: {
        label: "Fetch from DB",
        type: "database",
        description: "Query the users collection",
        config: { operation: "read", collection: "users" },
      },
    },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2", animated: false, type: "step" },
    { id: "e2-3", source: "2", target: "3", animated: false, type: "step" },
  ],
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  updateNodeData: (id: string, data: any) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          // Merge data deeply or shallowly? Shallow for now.
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
  setGraph: (graph: ProcessGraph) => {
    // Transform Zod schema to React Flow format if needed
    // For now assuming 1:1 mapping but likely needs transformation
    set({
      nodes: graph.nodes as unknown as Node[], // Type assertion until we map fully
      edges: graph.edges as unknown as Edge[],
    });
  },
}));

// Helper functions (simplified from react-flow docs)
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
