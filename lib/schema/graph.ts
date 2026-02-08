import { z } from "zod";
import { ProcessNodeSchema } from "./node";

export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.enum(["default", "step"]).default("default"), // 'step' for control flow
  animated: z.boolean().default(false),
});

export const GraphSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string().default("1.0.0"),
  nodes: z.array(ProcessNodeSchema),
  edges: z.array(EdgeSchema),
});

export type ProcessEdge = z.infer<typeof EdgeSchema>;
export type ProcessGraph = z.infer<typeof GraphSchema>;
