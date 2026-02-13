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
// Infra Resources (Terraform-aligned)
// ============================================
export const InfraProviderSchema = z.enum(["aws", "gcp", "azure", "generic"]);
export const InfraEnvironmentSchema = z.enum([
  "production",
  "staging",
  "preview",
  "dev",
]);

const InfraBaseSchema = z.object({
  kind: z.literal("infra"),
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  provider: InfraProviderSchema,
  environment: InfraEnvironmentSchema,
  region: z.string(),
  tags: z.array(z.string()).default([]),
});

export const InfraResourceTypeSchema = z.enum([
  "ec2",
  "lambda",
  "eks",
  "vpc",
  "s3",
  "rds",
  "load_balancer",
  "hpc",
]);

const Ec2ConfigSchema = z.object({
  instanceType: z.string(),
  ami: z.string(),
  count: z.number(),
  subnetIds: z.string(),
  securityGroups: z.string(),
  diskGb: z.number(),
  autoscalingMin: z.number(),
  autoscalingMax: z.number(),
});

const LambdaConfigSchema = z.object({
  runtime: z.string(),
  memoryMb: z.number(),
  timeoutSec: z.number(),
  handler: z.string(),
  source: z.string(),
  trigger: z.string(),
  environmentVars: z.string(),
});

const EksConfigSchema = z.object({
  version: z.string(),
  nodeType: z.string(),
  nodeCount: z.number(),
  minNodes: z.number(),
  maxNodes: z.number(),
  vpcId: z.string(),
  privateSubnets: z.string(),
  clusterLogs: z.string(),
});

const VpcConfigSchema = z.object({
  cidr: z.string(),
  publicSubnets: z.string(),
  privateSubnets: z.string(),
  natGateways: z.number(),
  flowLogs: z.boolean(),
});

const S3ConfigSchema = z.object({
  bucketName: z.string(),
  versioning: z.boolean(),
  encryption: z.string(),
  lifecycle: z.string(),
  publicAccess: z.string(),
});

const RdsConfigSchema = z.object({
  engine: z.string(),
  engineVersion: z.string(),
  instanceClass: z.string(),
  storageGb: z.number(),
  multiAz: z.boolean(),
  backupRetentionDays: z.number(),
  subnetGroup: z.string(),
});

const LoadBalancerConfigSchema = z.object({
  lbType: z.string(),
  scheme: z.string(),
  listeners: z.string(),
  targetGroup: z.string(),
  healthCheckPath: z.string(),
  tlsCertArn: z.string(),
});

const HpcConfigSchema = z.object({
  scheduler: z.string(),
  instanceType: z.string(),
  nodeCount: z.number(),
  maxNodes: z.number(),
  sharedStorage: z.string(),
  queue: z.string(),
});

const Ec2ResourceSchema = InfraBaseSchema.extend({
  resourceType: z.literal("ec2"),
  config: Ec2ConfigSchema,
});

const LambdaResourceSchema = InfraBaseSchema.extend({
  resourceType: z.literal("lambda"),
  config: LambdaConfigSchema,
});

const EksResourceSchema = InfraBaseSchema.extend({
  resourceType: z.literal("eks"),
  config: EksConfigSchema,
});

const VpcResourceSchema = InfraBaseSchema.extend({
  resourceType: z.literal("vpc"),
  config: VpcConfigSchema,
});

const S3ResourceSchema = InfraBaseSchema.extend({
  resourceType: z.literal("s3"),
  config: S3ConfigSchema,
});

const RdsResourceSchema = InfraBaseSchema.extend({
  resourceType: z.literal("rds"),
  config: RdsConfigSchema,
});

const LoadBalancerResourceSchema = InfraBaseSchema.extend({
  resourceType: z.literal("load_balancer"),
  config: LoadBalancerConfigSchema,
});

const HpcResourceSchema = InfraBaseSchema.extend({
  resourceType: z.literal("hpc"),
  config: HpcConfigSchema,
});

export const InfraBlockSchema = z.discriminatedUnion("resourceType", [
  Ec2ResourceSchema,
  LambdaResourceSchema,
  EksResourceSchema,
  VpcResourceSchema,
  S3ResourceSchema,
  RdsResourceSchema,
  LoadBalancerResourceSchema,
  HpcResourceSchema,
]);

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
export const NodeDataSchema = z.union([
  ProcessDefinitionSchema,
  DatabaseBlockSchema,
  QueueBlockSchema,
  InfraBlockSchema,
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
export type InfraBlock = z.infer<typeof InfraBlockSchema>;
export type InfraResourceType = z.infer<typeof InfraResourceTypeSchema>;
export type InfraProvider = z.infer<typeof InfraProviderSchema>;
export type InfraEnvironment = z.infer<typeof InfraEnvironmentSchema>;
export type ApiBinding = z.infer<typeof ApiBindingSchema>;
export type InputField = z.infer<typeof InputFieldSchema>;
export type OutputField = z.infer<typeof OutputFieldSchema>;
export type ProcessStep = z.infer<typeof ProcessStepSchema>;
export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;
