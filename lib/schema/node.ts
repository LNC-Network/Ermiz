import { z } from "zod";

// ============================================
// Basic Types
// ============================================
export const NodeIdSchema = z.string();
export const PositionSchema = z.object({ x: z.number(), y: z.number() });

// ============================================
// Input/Output Field Schema (Supports Complex Types)
// ============================================
export const FieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "any",
]);

// Recursive schema for nested properties (object fields)
export type NestedProperty = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "any";
  required?: boolean;
  description?: string;
  // For object type: nested properties
  properties?: NestedProperty[];
  // For array type: item type
  items?: NestedProperty;
  // For string: validation
  format?: "email" | "uri" | "date" | "date-time" | "uuid" | "regex";
  pattern?: string;
  // For number: constraints
  minimum?: number;
  maximum?: number;
  // For string/array: length constraints
  minLength?: number;
  maxLength?: number;
};

export const NestedPropertySchema: z.ZodType<NestedProperty> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: FieldTypeSchema,
    required: z.boolean().optional(),
    description: z.string().optional(),
    properties: z.array(NestedPropertySchema).optional(),
    items: NestedPropertySchema.optional(),
    format: z
      .enum(["email", "uri", "date", "date-time", "uuid", "regex"])
      .optional(),
    pattern: z.string().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }),
);

export const InputFieldSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  required: z.boolean().default(true),
  description: z.string().optional(),
  // For object type: nested properties
  properties: z.array(NestedPropertySchema).optional(),
  // For array type: item type definition
  items: NestedPropertySchema.optional(),
  // For string: validation format
  format: z
    .enum(["email", "uri", "date", "date-time", "uuid", "regex"])
    .optional(),
  pattern: z.string().optional(),
  // For number: constraints
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  // For string/array: length constraints
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
});

export const OutputFieldSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  description: z.string().optional(),
  // For object type: nested properties
  properties: z.array(NestedPropertySchema).optional(),
  // For array type: item type definition
  items: NestedPropertySchema.optional(),
});

// ============================================
// Process Step Types
// ============================================
export const StepKindSchema = z.enum([
  "compute",
  "db_operation",
  "external_call",
  "condition",
  "transform",
  "ref",
]);

export const ProcessStepSchema = z.object({
  id: z.string(),
  kind: StepKindSchema,
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  ref: z.string().optional(),
});

// ============================================
// Process Definition (Core Unit)
// ============================================
export const ProcessTypeSchema = z.enum([
  "calculation",
  "database_workflow",
  "queue_consumer",
  "job",
  "orchestrated_workflow",
]);

export const ExecutionModeSchema = z.enum([
  "sync",
  "async",
  "scheduled",
  "event_driven",
]);

export const ProcessDefinitionSchema = z.object({
  kind: z.literal("process"),
  id: z.string(),
  label: z.string(),
  processType: ProcessTypeSchema,
  execution: ExecutionModeSchema,
  description: z.string().optional(),
  inputs: z.array(InputFieldSchema).default([]),
  outputs: z
    .object({
      success: z.array(OutputFieldSchema).default([]),
      error: z.array(OutputFieldSchema).default([]),
    })
    .default({ success: [], error: [] }),
  steps: z.array(ProcessStepSchema).default([]),
  schedule: z.string().optional(),
  trigger: z
    .object({
      queue: z.string().optional(),
      event: z.string().optional(),
    })
    .optional(),
});

// ============================================
// Database Block (Infrastructure)
// ============================================
export const DatabaseTypeSchema = z.enum(["sql", "nosql", "kv", "graph"]);

export const DatabaseCapabilitiesSchema = z.object({
  crud: z.boolean(),
  transactions: z.boolean(),
  joins: z.boolean(),
  aggregations: z.boolean(),
  indexes: z.boolean(),
  constraints: z.boolean(),
  pagination: z.boolean(),
});

export const DatabaseBlockSchema = z.object({
  kind: z.literal("database"),
  id: z.string(),
  label: z.string(),
  dbType: DatabaseTypeSchema,
  engine: z.string().optional(),
  capabilities: DatabaseCapabilitiesSchema,
  schemas: z.array(z.string()).default([]),
  description: z.string().optional(),
});

// ============================================
// Queue Block (Infrastructure)
// ============================================
export const QueueDeliverySchema = z.enum([
  "at_least_once",
  "at_most_once",
  "exactly_once",
]);

export const QueueRetrySchema = z.object({
  maxAttempts: z.number(),
  backoff: z.enum(["linear", "exponential"]),
});

export const QueueBlockSchema = z.object({
  kind: z.literal("queue"),
  id: z.string(),
  label: z.string(),
  delivery: QueueDeliverySchema,
  retry: QueueRetrySchema,
  deadLetter: z.boolean(),
  description: z.string().optional(),
});

// ============================================
// API Binding (Full OpenAPI/AsyncAPI Features)
// ============================================
export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
]);

export const SecuritySchemeSchema = z.object({
  type: z.enum(["none", "api_key", "bearer", "oauth2", "basic"]),
  headerName: z.string().optional(),
  scopes: z.array(z.string()),
});

export const RateLimitSchema = z.object({
  enabled: z.boolean(),
  requests: z.number(),
  window: z.enum(["second", "minute", "hour", "day"]),
});

export const RequestBodySchema = z.object({
  contentType: z.enum([
    "application/json",
    "multipart/form-data",
    "text/plain",
  ]),
  schema: z.array(InputFieldSchema),
});

export const RequestSchema = z.object({
  pathParams: z.array(InputFieldSchema),
  queryParams: z.array(InputFieldSchema),
  headers: z.array(InputFieldSchema),
  body: RequestBodySchema,
});

export const ResponseSchema = z.object({
  statusCode: z.number(),
  schema: z.array(OutputFieldSchema),
});

export const ApiBindingSchema = z.object({
  kind: z.literal("api_binding"),
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),

  // API Type
  apiType: z.enum(["openapi", "asyncapi"]),

  // Route Definition
  method: HttpMethodSchema,
  route: z.string(),

  // Request Schema
  request: RequestSchema,

  // Response Schemas
  responses: z.object({
    success: ResponseSchema,
    error: ResponseSchema,
  }),

  // Security
  security: SecuritySchemeSchema,

  // Rate Limiting
  rateLimit: RateLimitSchema,

  // Versioning
  version: z.string(),
  deprecated: z.boolean(),

  // Process Reference
  processRef: z.string(),
});

// ============================================
// Node Data - Union of all kinds
// ============================================
export const NodeDataSchema = z.discriminatedUnion("kind", [
  ProcessDefinitionSchema,
  DatabaseBlockSchema,
  QueueBlockSchema,
  ApiBindingSchema,
]);

// ============================================
// React Flow Node Wrapper
// ============================================
export const ProcessNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: PositionSchema,
  data: NodeDataSchema,
  selected: z.boolean().optional(),
});

// ============================================
// Type Exports
// ============================================
export type ProcessNode = z.infer<typeof ProcessNodeSchema>;
export type NodeData = z.infer<typeof NodeDataSchema>;
export type ProcessDefinition = z.infer<typeof ProcessDefinitionSchema>;
export type DatabaseBlock = z.infer<typeof DatabaseBlockSchema>;
export type QueueBlock = z.infer<typeof QueueBlockSchema>;
export type ApiBinding = z.infer<typeof ApiBindingSchema>;
export type InputField = z.infer<typeof InputFieldSchema>;
export type OutputField = z.infer<typeof OutputFieldSchema>;
export type ProcessStep = z.infer<typeof ProcessStepSchema>;
export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;
