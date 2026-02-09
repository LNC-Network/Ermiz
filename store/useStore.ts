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
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import { ProcessGraph } from "@/lib/schema/graph";
import {
  NodeData,
  InputField,
  OutputField,
  ProcessStep,
} from "@/lib/schema/node";

type NodeKind =
  | "process"
  | "database"
  | "queue"
  | "api_binding"
  | "api_get"
  | "api_post"
  | "api_put"
  | "api_delete"
  | "api_patch";

type GraphPreset = "empty" | "hello_world_api";

type RFState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  addNode: (kind: NodeKind, position?: { x: number; y: number }) => void;
  addInput: (nodeId: string, input: InputField) => void;
  removeInput: (nodeId: string, inputName: string) => void;
  updateInput: (nodeId: string, inputIndex: number, input: InputField) => void;
  updateOutput: (
    nodeId: string,
    outputIndex: number,
    output: OutputField,
    branch: "success" | "error",
  ) => void;
  addOutput: (
    nodeId: string,
    output: OutputField,
    branch: "success" | "error",
  ) => void;
  removeOutput: (
    nodeId: string,
    outputName: string,
    branch: "success" | "error",
  ) => void;
  addStep: (nodeId: string, step: ProcessStep) => void;
  removeStep: (nodeId: string, stepId: string) => void;
  setGraph: (graph: ProcessGraph) => void;
  loadGraphPreset: (preset: GraphPreset) => void;
};

const graphPresets: Record<GraphPreset, { nodes: Node[]; edges: Edge[] }> = {
  empty: {
    nodes: [],
    edges: [],
  },
  hello_world_api: {
    nodes: [
      {
        id: "hello-api",
        type: "api_binding",
        position: { x: 120, y: 120 },
        data: {
          kind: "api_binding",
          id: "helloWorldApi",
          label: "Hello World API",
          apiType: "openapi",
          method: "GET",
          route: "/api/hello",
          request: {
            pathParams: [],
            queryParams: [],
            headers: [],
            body: { contentType: "application/json", schema: [] },
          },
          responses: {
            success: {
              statusCode: 200,
              schema: [{ name: "message", type: "string" }],
            },
            error: { statusCode: 500, schema: [] },
          },
          security: { type: "none", scopes: [] },
          rateLimit: { enabled: false, requests: 100, window: "minute" },
          version: "v1",
          deprecated: false,
          processRef: "helloWorldProcess",
          description: "Returns a hello world message",
        },
      },
      {
        id: "hello-process",
        type: "process",
        position: { x: 460, y: 120 },
        data: {
          kind: "process",
          id: "helloWorldProcess",
          label: "Hello World Process",
          processType: "calculation",
          execution: "sync",
          description: "Produces a simple hello-world response",
          inputs: [],
          outputs: {
            success: [{ name: "message", type: "string" }],
            error: [{ name: "message", type: "string" }],
          },
          steps: [{ id: "step1", kind: "ref", ref: "returnHelloWorld" }],
        },
      },
    ],
    edges: [
      {
        id: "hello-edge-api-process",
        source: "hello-api",
        target: "hello-process",
        type: "step",
      },
    ],
  },
};

export const useStore = create<RFState>((set, get) => ({
  nodes: graphPresets.hello_world_api.nodes,
  edges: graphPresets.hello_world_api.edges,

  onNodesChange: (changes: NodeChange[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },

  updateNodeData: (id: string, data: Partial<NodeData>) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },

  deleteNode: (id: string) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter(
        (edge) => edge.source !== id && edge.target !== id,
      ),
    });
  },

  addNode: (kind: NodeKind, customPosition?: { x: number; y: number }) => {
    const nodes = get().nodes;
    const id = `node-${Date.now()}`;
    const lastNode = nodes[nodes.length - 1];
    const position =
      customPosition ||
      (lastNode
        ? { x: lastNode.position.x + 50, y: lastNode.position.y + 150 }
        : { x: 200, y: 200 });

    const nodeConfigs: Record<NodeKind, { type: string; data: NodeData }> = {
      process: {
        type: "process",
        data: {
          kind: "process",
          id: `process_${Date.now()}`,
          label: "New Process",
          processType: "calculation",
          execution: "sync",
          description: "",
          inputs: [],
          outputs: { success: [], error: [] },
          steps: [],
        },
      },
      database: {
        type: "database",
        data: {
          kind: "database",
          id: `db_${Date.now()}`,
          label: "New Database",
          dbType: "sql",
          engine: "postgres",
          capabilities: {
            crud: true,
            transactions: false,
            joins: false,
            aggregations: false,
            indexes: true,
            constraints: false,
            pagination: true,
          },
          schemas: [],
          description: "",
        },
      },
      queue: {
        type: "queue",
        data: {
          kind: "queue",
          id: `queue_${Date.now()}`,
          label: "New Queue",
          delivery: "at_least_once",
          retry: { maxAttempts: 3, backoff: "exponential" },
          deadLetter: true,
          description: "",
        },
      },
      api_binding: {
        type: "api_binding",
        data: {
          kind: "api_binding",
          id: `api_${Date.now()}`,
          label: "New API Endpoint",
          apiType: "openapi",
          method: "GET",
          route: "/api/resource",
          request: {
            pathParams: [],
            queryParams: [],
            headers: [],
            body: {
              contentType: "application/json",
              schema: [],
            },
          },
          responses: {
            success: {
              statusCode: 200,
              schema: [],
            },
            error: {
              statusCode: 400,
              schema: [],
            },
          },
          security: {
            type: "none",
            scopes: [],
          },
          rateLimit: {
            enabled: false,
            requests: 100,
            window: "minute",
          },
          version: "v1",
          deprecated: false,
          processRef: "",
          description: "",
        },
      },
      api_get: {
        type: "api_binding",
        data: {
          kind: "api_binding",
          id: `api_get_${Date.now()}`,
          label: "GET Endpoint",
          apiType: "openapi",
          method: "GET",
          route: "/api/resource",
          request: {
            pathParams: [],
            queryParams: [],
            headers: [],
            body: { contentType: "application/json", schema: [] },
          },
          responses: {
            success: { statusCode: 200, schema: [] },
            error: { statusCode: 404, schema: [] },
          },
          security: { type: "none", scopes: [] },
          rateLimit: { enabled: false, requests: 100, window: "minute" },
          version: "v1",
          deprecated: false,
          processRef: "",
          description: "",
        },
      },
      api_post: {
        type: "api_binding",
        data: {
          kind: "api_binding",
          id: `api_post_${Date.now()}`,
          label: "POST Endpoint",
          apiType: "openapi",
          method: "POST",
          route: "/api/resource",
          request: {
            pathParams: [],
            queryParams: [],
            headers: [],
            body: { contentType: "application/json", schema: [] },
          },
          responses: {
            success: { statusCode: 201, schema: [] },
            error: { statusCode: 400, schema: [] },
          },
          security: { type: "none", scopes: [] },
          rateLimit: { enabled: false, requests: 100, window: "minute" },
          version: "v1",
          deprecated: false,
          processRef: "",
          description: "",
        },
      },
      api_put: {
        type: "api_binding",
        data: {
          kind: "api_binding",
          id: `api_put_${Date.now()}`,
          label: "PUT Endpoint",
          apiType: "openapi",
          method: "PUT",
          route: "/api/resource/:id",
          request: {
            pathParams: [],
            queryParams: [],
            headers: [],
            body: { contentType: "application/json", schema: [] },
          },
          responses: {
            success: { statusCode: 200, schema: [] },
            error: { statusCode: 400, schema: [] },
          },
          security: { type: "none", scopes: [] },
          rateLimit: { enabled: false, requests: 100, window: "minute" },
          version: "v1",
          deprecated: false,
          processRef: "",
          description: "",
        },
      },
      api_delete: {
        type: "api_binding",
        data: {
          kind: "api_binding",
          id: `api_delete_${Date.now()}`,
          label: "DELETE Endpoint",
          apiType: "openapi",
          method: "DELETE",
          route: "/api/resource/:id",
          request: {
            pathParams: [],
            queryParams: [],
            headers: [],
            body: { contentType: "application/json", schema: [] },
          },
          responses: {
            success: { statusCode: 204, schema: [] },
            error: { statusCode: 404, schema: [] },
          },
          security: { type: "none", scopes: [] },
          rateLimit: { enabled: false, requests: 100, window: "minute" },
          version: "v1",
          deprecated: false,
          processRef: "",
          description: "",
        },
      },
      api_patch: {
        type: "api_binding",
        data: {
          kind: "api_binding",
          id: `api_patch_${Date.now()}`,
          label: "PATCH Endpoint",
          apiType: "openapi",
          method: "PATCH",
          route: "/api/resource/:id",
          request: {
            pathParams: [],
            queryParams: [],
            headers: [],
            body: { contentType: "application/json", schema: [] },
          },
          responses: {
            success: { statusCode: 200, schema: [] },
            error: { statusCode: 400, schema: [] },
          },
          security: { type: "none", scopes: [] },
          rateLimit: { enabled: false, requests: 100, window: "minute" },
          version: "v1",
          deprecated: false,
          processRef: "",
          description: "",
        },
      },
    };

    const config = nodeConfigs[kind];
    const newNode: Node = {
      id,
      type: config.type,
      position,
      data: config.data,
      selected: true,
    };

    set({
      nodes: [...nodes.map((n) => ({ ...n, selected: false })), newNode],
    });
  },

  addInput: (nodeId: string, input: InputField) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && node.data.kind === "process") {
          const processData = node.data as NodeData & { kind: "process" };
          return {
            ...node,
            data: {
              ...processData,
              inputs: [...processData.inputs, input],
            },
          };
        }
        return node;
      }),
    });
  },

  removeInput: (nodeId: string, inputName: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && node.data.kind === "process") {
          const processData = node.data as NodeData & { kind: "process" };
          return {
            ...node,
            data: {
              ...processData,
              inputs: processData.inputs.filter(
                (i: InputField) => i.name !== inputName,
              ),
            },
          };
        }
        return node;
      }),
    });
  },

  updateInput: (nodeId: string, inputIndex: number, input: InputField) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && node.data.kind === "process") {
          const processData = node.data as NodeData & { kind: "process" };
          const newInputs = [...processData.inputs];
          newInputs[inputIndex] = input;
          return {
            ...node,
            data: {
              ...processData,
              inputs: newInputs,
            },
          };
        }
        return node;
      }),
    });
  },

  updateOutput: (
    nodeId: string,
    outputIndex: number,
    output: OutputField,
    branch: "success" | "error",
  ) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && node.data.kind === "process") {
          const processData = node.data as NodeData & { kind: "process" };
          const newBranch = [...processData.outputs[branch]];
          newBranch[outputIndex] = output;
          return {
            ...node,
            data: {
              ...processData,
              outputs: {
                ...processData.outputs,
                [branch]: newBranch,
              },
            },
          };
        }
        return node;
      }),
    });
  },

  addOutput: (
    nodeId: string,
    output: OutputField,
    branch: "success" | "error",
  ) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && node.data.kind === "process") {
          const processData = node.data as NodeData & { kind: "process" };
          return {
            ...node,
            data: {
              ...processData,
              outputs: {
                ...processData.outputs,
                [branch]: [...processData.outputs[branch], output],
              },
            },
          };
        }
        return node;
      }),
    });
  },

  removeOutput: (
    nodeId: string,
    outputName: string,
    branch: "success" | "error",
  ) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && node.data.kind === "process") {
          const processData = node.data as NodeData & { kind: "process" };
          return {
            ...node,
            data: {
              ...processData,
              outputs: {
                ...processData.outputs,
                [branch]: processData.outputs[branch].filter(
                  (o: OutputField) => o.name !== outputName,
                ),
              },
            },
          };
        }
        return node;
      }),
    });
  },

  addStep: (nodeId: string, step: ProcessStep) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && node.data.kind === "process") {
          const processData = node.data as NodeData & { kind: "process" };
          return {
            ...node,
            data: {
              ...processData,
              steps: [...processData.steps, step],
            },
          };
        }
        return node;
      }),
    });
  },

  removeStep: (nodeId: string, stepId: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && node.data.kind === "process") {
          const processData = node.data as NodeData & { kind: "process" };
          return {
            ...node,
            data: {
              ...processData,
              steps: processData.steps.filter(
                (s: ProcessStep) => s.id !== stepId,
              ),
            },
          };
        }
        return node;
      }),
    });
  },

  setGraph: (graph: ProcessGraph) => {
    set({
      nodes: graph.nodes as unknown as Node[],
      edges: graph.edges as unknown as Edge[],
    });
  },

  loadGraphPreset: (preset: GraphPreset) => {
    const selectedPreset = graphPresets[preset];
    set({
      nodes: selectedPreset.nodes.map((node) => ({
        ...node,
        data: { ...(node.data as object) },
      })) as Node[],
      edges: selectedPreset.edges.map((edge) => ({ ...edge })),
    });
  },
}));
