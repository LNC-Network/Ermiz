import { z } from "zod";

// Basic Types
export const NodeIdSchema = z.string().uuid();
export const PositionSchema = z.object({ x: z.number(), y: z.number() });

// Input/Output Schema (Typed)
export const PortSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "object", "array", "any"]),
  required: z.boolean().default(true),
});

// Node Types
export const NodeTypeSchema = z.enum([
  "trigger", // API Entry Point
  "process", // General Logic
  "integration", // External Service
  "database", // DB Operation
  "flow", // Control Flow (If, Map, etc)
]);

// Base Node Data
export const BaseNodeDataSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  inputs: z.array(PortSchema).default([]),
  outputs: z.array(PortSchema).default([]),
});

// Specific Node Configs (Extensible)
export const TriggerConfigSchema = z.object({
  apiType: z.enum(["rest", "async"]),
  route: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
});

export const DatabaseConfigSchema = z.object({
  operation: z.enum(["create", "read", "update", "delete", "query"]),
  collection: z.string(),
});

// Discriminated Union for Node Data
export const NodeDataSchema = z.discriminatedUnion("type", [
  BaseNodeDataSchema.extend({
    type: z.literal("trigger"),
    config: TriggerConfigSchema,
  }),
  BaseNodeDataSchema.extend({
    type: z.literal("process"),
    config: z.record(z.string(), z.any()),
  }), // Generic for now
  BaseNodeDataSchema.extend({
    type: z.literal("database"),
    config: DatabaseConfigSchema,
  }),
  BaseNodeDataSchema.extend({
    type: z.literal("flow"),
    config: z.record(z.string(), z.any()),
  }),
  BaseNodeDataSchema.extend({
    type: z.literal("integration"),
    config: z.record(z.string(), z.any()),
  }),
]);

// Final Node Schema
export const ProcessNodeSchema = z.object({
  id: NodeIdSchema,
  type: NodeTypeSchema,
  position: PositionSchema,
  data: NodeDataSchema,
});

export type ProcessNode = z.infer<typeof ProcessNodeSchema>;
export type NodeData = z.infer<typeof NodeDataSchema>;
