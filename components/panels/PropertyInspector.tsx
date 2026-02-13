"use client";

import React, { useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import {
  NodeData,
  ProcessDefinition,
  DatabaseBlock,
  DatabaseMigration,
  DatabaseRelationshipSchema,
  DatabaseSeed,
  DatabaseSeedSchema,
  DatabaseTableSchema,
  DatabaseTable,
  DatabaseTableField,
  QueueBlock,
  InfraBlock,
  InfraResourceType,
  ApiBinding,
  InputField,
  OutputField,
} from "@/lib/schema/node";
import { analyzeDBConnections } from "@/lib/schema/graph";
import { TypeSchemaEditor } from "./TypeSchemaEditor";
import { QueryEditor } from "./QueryEditor";
import {
  databaseTemplates,
  getDatabaseTemplateById,
} from "@/lib/templates/database-templates";
import { estimateDatabaseMonthlyCost } from "@/lib/cost-estimator";
import { DatabaseERDViewer } from "./DatabaseERDViewer";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  padding: "6px 8px",
  fontSize: 12,
  color: "var(--foreground)",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--muted)",
  textTransform: "uppercase",
  marginBottom: 4,
};

const sectionStyle: React.CSSProperties = {
  borderTop: "1px solid var(--border)",
  paddingTop: 12,
  marginTop: 8,
};

const infraFieldSets: Record<
  InfraResourceType,
  {
    title: string;
    fields: Array<{
      key: string;
      label: string;
      type: "text" | "number" | "boolean" | "select";
      placeholder?: string;
      options?: string[];
    }>;
  }
> = {
  ec2: {
    title: "EC2 Configuration",
    fields: [
      { key: "instanceType", label: "Instance type", type: "text" },
      { key: "ami", label: "AMI", type: "text" },
      { key: "count", label: "Instance count", type: "number" },
      { key: "subnetIds", label: "Subnet IDs", type: "text" },
      { key: "securityGroups", label: "Security groups", type: "text" },
      { key: "diskGb", label: "Root disk (GB)", type: "number" },
      { key: "autoscalingMin", label: "Autoscaling min", type: "number" },
      { key: "autoscalingMax", label: "Autoscaling max", type: "number" },
    ],
  },
  lambda: {
    title: "Lambda Configuration",
    fields: [
      { key: "runtime", label: "Runtime", type: "text" },
      { key: "memoryMb", label: "Memory (MB)", type: "number" },
      { key: "timeoutSec", label: "Timeout (sec)", type: "number" },
      { key: "handler", label: "Handler", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "trigger", label: "Trigger", type: "text" },
      { key: "environmentVars", label: "Environment vars", type: "text" },
    ],
  },
  eks: {
    title: "EKS Configuration",
    fields: [
      { key: "version", label: "K8s version", type: "text" },
      { key: "nodeType", label: "Node type", type: "text" },
      { key: "nodeCount", label: "Node count", type: "number" },
      { key: "minNodes", label: "Min nodes", type: "number" },
      { key: "maxNodes", label: "Max nodes", type: "number" },
      { key: "vpcId", label: "VPC ID", type: "text" },
      { key: "privateSubnets", label: "Private subnets", type: "text" },
      { key: "clusterLogs", label: "Cluster logs", type: "text" },
    ],
  },
  vpc: {
    title: "VPC Configuration",
    fields: [
      { key: "cidr", label: "CIDR block", type: "text" },
      { key: "publicSubnets", label: "Public subnets", type: "text" },
      { key: "privateSubnets", label: "Private subnets", type: "text" },
      { key: "natGateways", label: "NAT gateways", type: "number" },
      { key: "flowLogs", label: "Enable flow logs", type: "boolean" },
    ],
  },
  s3: {
    title: "S3 Configuration",
    fields: [
      { key: "bucketName", label: "Bucket name", type: "text" },
      { key: "versioning", label: "Versioning", type: "boolean" },
      { key: "encryption", label: "Encryption", type: "text" },
      { key: "lifecycle", label: "Lifecycle policy", type: "text" },
      { key: "publicAccess", label: "Public access", type: "text" },
    ],
  },
  rds: {
    title: "RDS Configuration",
    fields: [
      { key: "engine", label: "Engine", type: "text" },
      { key: "engineVersion", label: "Engine version", type: "text" },
      { key: "instanceClass", label: "Instance class", type: "text" },
      { key: "storageGb", label: "Storage (GB)", type: "number" },
      { key: "multiAz", label: "Multi-AZ", type: "boolean" },
      { key: "backupRetentionDays", label: "Backup retention (days)", type: "number" },
      { key: "subnetGroup", label: "Subnet group", type: "text" },
    ],
  },
  load_balancer: {
    title: "Load Balancer Configuration",
    fields: [
      {
        key: "lbType",
        label: "Type",
        type: "select",
        options: ["ALB", "NLB", "GLB"],
      },
      {
        key: "scheme",
        label: "Scheme",
        type: "select",
        options: ["internet-facing", "internal"],
      },
      { key: "listeners", label: "Listeners", type: "text" },
      { key: "targetGroup", label: "Target group", type: "text" },
      { key: "healthCheckPath", label: "Health check path", type: "text" },
      { key: "tlsCertArn", label: "TLS cert ARN", type: "text" },
    ],
  },
  hpc: {
    title: "HPC Configuration",
    fields: [
      { key: "scheduler", label: "Scheduler", type: "text" },
      { key: "instanceType", label: "Instance type", type: "text" },
      { key: "nodeCount", label: "Node count", type: "number" },
      { key: "maxNodes", label: "Max nodes", type: "number" },
      { key: "sharedStorage", label: "Shared storage", type: "text" },
      { key: "queue", label: "Queue", type: "text" },
    ],
  },
};

export function PropertyInspector({ width = 320 }: { width?: number }) {
  const {
    nodes,
    activeTab,
    graphs,
    updateNodeData,
    deleteNode,
    addInput,
    removeInput,
    updateInput,
    updateOutput,
    addOutput,
    removeOutput,
  } = useStore(
    useShallow((state) => ({
      nodes: state.nodes,
      activeTab: state.activeTab,
      graphs: state.graphs,
      updateNodeData: state.updateNodeData,
      deleteNode: state.deleteNode,
      addInput: state.addInput,
      removeInput: state.removeInput,
      updateInput: state.updateInput,
      updateOutput: state.updateOutput,
      addOutput: state.addOutput,
      removeOutput: state.removeOutput,
    })),
  );

  const [newInputName, setNewInputName] = useState("");
  const [newOutputName, setNewOutputName] = useState("");
  const [expandedTables, setExpandedTables] = useState<Record<number, boolean>>(
    {},
  );
  const [isBackupExpanded, setIsBackupExpanded] = useState(true);
  const [backupRegionDraft, setBackupRegionDraft] = useState("");
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(true);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isMigrationsExpanded, setIsMigrationsExpanded] = useState(true);
  const [isSchemaDesignerExpanded, setIsSchemaDesignerExpanded] = useState(true);
  const [isSeedingExpanded, setIsSeedingExpanded] = useState(true);
  const [expandedSeeds, setExpandedSeeds] = useState<Record<number, boolean>>({});
  const [fixtureDrafts, setFixtureDrafts] = useState<Record<number, string>>({});
  const [expandedMigrations, setExpandedMigrations] = useState<
    Record<number, boolean>
  >({});
  const [isMonitoringExpanded, setIsMonitoringExpanded] = useState(true);
  const [showERD, setShowERD] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    databaseTemplates[0]?.id || "",
  );
  const [roleNameDraft, setRoleNameDraft] = useState("");
  const [rolePermDraft, setRolePermDraft] = useState("");
  const [allowedIpDraft, setAllowedIpDraft] = useState("");
  const [alertConditionDraft, setAlertConditionDraft] = useState("");
  const [alertChannelDraft, setAlertChannelDraft] = useState("email");
  const [alertRecipientsDraft, setAlertRecipientsDraft] = useState("");
  const [schemaToastMessage, setSchemaToastMessage] = useState("");
  const [schemaToastType, setSchemaToastType] = useState<"success" | "error">(
    "success",
  );
  const schemaImportInputRef = useRef<HTMLInputElement | null>(null);
  const [requestTab, setRequestTab] = useState<"body" | "headers" | "query">(
    "body",
  );

  const selectedNode = nodes.find((n) => n.selected);

  const panelStyle: React.CSSProperties = {
    width,
    flexShrink: 0,
    borderLeft: "1px solid var(--border)",
    background: "var(--panel)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflowY: "auto",
  };

  if (!selectedNode) {
    return (
      <aside style={panelStyle}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          Properties
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            textAlign: "center",
            marginTop: 32,
          }}
        >
          Select a node to edit its properties
        </div>
      </aside>
    );
  }

  const nodeData = selectedNode.data as NodeData;
  const kind = nodeData.kind;
  const apiNode = kind === "api_binding" ? (nodeData as ApiBinding) : null;
  const apiProtocol =
    apiNode?.protocol ?? (apiNode?.apiType === "asyncapi" ? "ws" : "rest");
  const isRestProtocol = apiProtocol === "rest";
  const isWsProtocol = apiProtocol === "ws";
  const isSocketIOProtocol = apiProtocol === "socket.io";
  const isWebRtcProtocol = apiProtocol === "webrtc";
  const isGraphqlProtocol = apiProtocol === "graphql";
  const isGrpcProtocol = apiProtocol === "grpc";
  const isSseProtocol = apiProtocol === "sse";
  const isWebhookProtocol = apiProtocol === "webhook";
  const functionDefinitions = (graphs.functions?.nodes || [])
    .map((node) => node.data as NodeData)
    .filter((data): data is ProcessDefinition => data.kind === "process")
    .map((process) => ({
      id: process.id,
      label: process.label || process.id,
    }));
  const importedFunctionIds =
    kind === "process" && activeTab === "api"
      ? (nodeData as ProcessDefinition).steps
          .filter((step) => step.kind === "ref" && Boolean(step.ref))
          .map((step) => step.ref as string)
      : [];

  const handleUpdate = (updates: Partial<NodeData>) => {
    updateNodeData(selectedNode.id, updates);
  };

  const databaseNodeData =
    kind === "database" ? (nodeData as DatabaseBlock) : null;
  const databasePerformance =
    databaseNodeData?.performance || {
      connectionPool: { min: 2, max: 20, timeout: 30 },
      readReplicas: { count: 0, regions: [] },
      caching: { enabled: false, strategy: "", ttl: 300 },
      sharding: { enabled: false, strategy: "", partitionKey: "" },
    };
  const databaseBackup =
    databaseNodeData?.backup || {
      schedule: "",
      retention: { days: 7, maxVersions: 30 },
      pointInTimeRecovery: false,
      multiRegion: { enabled: false, regions: [] },
    };
  const databaseSecurity =
    databaseNodeData?.security || {
      roles: [],
      encryption: { atRest: false, inTransit: false },
      network: { vpcId: "", allowedIPs: [] },
      auditLogging: false,
    };
  const databaseCostEstimation =
    databaseNodeData?.costEstimation || {
      storageGb: 0,
      estimatedIOPS: 0,
      backupSizeGb: 0,
      replicaCount: 0,
    };
  const databaseMigrations = databaseNodeData?.migrations || [];
  const databaseSeeds = databaseNodeData?.seeds || [];
  const databaseMonitoring =
    databaseNodeData?.monitoring || {
      thresholds: {
        cpuPercent: 80,
        memoryPercent: 80,
        connectionCount: 200,
        queryLatencyMs: 250,
      },
      alerts: [],
      slaTargets: {
        uptimePercent: 99.9,
        maxLatencyMs: 300,
      },
    };
  const databaseMonthlyCost = estimateDatabaseMonthlyCost(
    databaseNodeData?.engine,
    databaseCostEstimation,
  );
  const dbConnectionSummary =
    kind === "database"
      ? analyzeDBConnections({
          nodes: nodes as Array<{
            id: string;
            type?: string;
            data?: Record<string, unknown>;
          }>,
          edges: edges as Array<{ source: string; target: string }>,
        })[selectedNode.id] || null
      : null;

  const updateDatabaseTables = (tables: DatabaseTable[]) => {
    if (!databaseNodeData) return;
    handleUpdate({
      tables,
      schemas: tables.map((table) => table.name).filter(Boolean),
    } as Partial<DatabaseBlock>);
  };

  const addTable = () => {
    if (!databaseNodeData) return;
    const tables = databaseNodeData.tables || [];
    updateDatabaseTables([
      ...tables,
      {
        name: `table_${tables.length + 1}`,
        fields: [],
        indexes: [],
      },
    ]);
  };

  const loadDatabaseTemplate = () => {
    if (!databaseNodeData) return;
    const template = getDatabaseTemplateById(selectedTemplateId);
    if (!template) return;

    const stamp = `${selectedTemplateId}_template`;
    const tableIdMap = new Map<string, string>();
    const fieldIdMap = new Map<string, string>();

    const clonedTables = template.tables.map((table) => {
      const nextTableId = `${table.id || table.name}_${stamp}`;
      if (table.id) {
        tableIdMap.set(table.id, nextTableId);
      }
      const fields = (table.fields || []).map((field) => {
        const nextFieldId = `${field.id || `${table.name}_${field.name}`}_${stamp}`;
        if (field.id) {
          fieldIdMap.set(field.id, nextFieldId);
        }
        return {
          ...field,
          id: nextFieldId,
        };
      });
      return {
        ...table,
        id: nextTableId,
        fields,
      };
    });

    const clonedRelationships = (template.relationships || []).map((relationship) => ({
      ...relationship,
      id: `${relationship.id}_${stamp}`,
      fromTableId: tableIdMap.get(relationship.fromTableId) || relationship.fromTableId,
      toTableId: tableIdMap.get(relationship.toTableId) || relationship.toTableId,
      fromFieldId: relationship.fromFieldId
        ? fieldIdMap.get(relationship.fromFieldId) || relationship.fromFieldId
        : undefined,
      toFieldId: relationship.toFieldId
        ? fieldIdMap.get(relationship.toFieldId) || relationship.toFieldId
        : undefined,
    }));

    handleUpdate({
      tables: clonedTables,
      relationships: clonedRelationships,
      schemas: clonedTables.map((table) => table.name),
      loadedTemplate: template.label,
    } as Partial<DatabaseBlock>);
    setIsTemplatePickerOpen(false);
  };

  const updateDatabaseMigrations = (migrations: DatabaseMigration[]) => {
    if (!databaseNodeData) return;
    handleUpdate({ migrations } as Partial<DatabaseBlock>);
  };

  const updateDatabaseSeeds = (seeds: DatabaseSeed[]) => {
    if (!databaseNodeData) return;
    handleUpdate({ seeds } as Partial<DatabaseBlock>);
  };

  const mockValueForField = (field: DatabaseTableField, index: number) => {
    const safeName = (field.name || "field").toLowerCase();
    if (field.type === "number") return index + 1;
    if (field.type === "int" || field.type === "bigint") return index + 1;
    if (field.type === "float" || field.type === "decimal") return Number(`${index + 1}.5`);
    if (field.type === "boolean") return index % 2 === 0;
    if (field.type === "date" || field.type === "datetime") {
      return `2026-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00Z`;
    }
    if (field.type === "json") return { sample: safeName, index };
    if (field.type === "uuid") return `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    return `${safeName}_${index + 1}`;
  };

  const buildRandomSeedPreview = (seed: DatabaseSeed) => {
    const table = (databaseNodeData?.tables || []).find(
      (candidate) => candidate.name === seed.tableName,
    );
    if (!table) return [];
    const sampleCount = Math.min(Math.max(seed.rowCount || 1, 1), 3);
    return Array.from({ length: sampleCount }).map((_, rowIndex) => {
      const row: Record<string, unknown> = {};
      (table.fields || []).forEach((field) => {
        row[field.name] = mockValueForField(field, rowIndex);
      });
      return row;
    });
  };

  const showSchemaToast = (message: string, type: "success" | "error") => {
    setSchemaToastMessage(message);
    setSchemaToastType(type);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setSchemaToastMessage(""), 2200);
    }
  };

  const triggerSchemaExport = () => {
    if (!databaseNodeData || typeof window === "undefined") return;
    const payload = {
      dbType: databaseNodeData.dbType,
      engine: databaseNodeData.engine || "",
      schemas: databaseNodeData.schemas || [],
      tables: databaseNodeData.tables || [],
      relationships: databaseNodeData.relationships || [],
      capabilities: databaseNodeData.capabilities,
      performance: databaseNodeData.performance,
      backup: databaseNodeData.backup,
      security: databaseNodeData.security,
      monitoring: databaseNodeData.monitoring,
      costEstimation: databaseNodeData.costEstimation,
      seeds: databaseNodeData.seeds || [],
      migrations: databaseNodeData.migrations || [],
      queries: databaseNodeData.queries || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${databaseNodeData.label || "database"}-schema.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showSchemaToast("Schema exported.", "success");
  };

  const mapFieldTypeToSql = (
    fieldType: string,
    dialect: "postgresql" | "mysql" | "sqlite",
  ): string => {
    if (dialect === "sqlite") {
      if (fieldType === "boolean") return "INTEGER";
      if (fieldType === "json") return "TEXT";
      if (fieldType === "date") return "TEXT";
      if (fieldType === "number") return "REAL";
      if (fieldType === "int" || fieldType === "bigint") return "INTEGER";
      return "TEXT";
    }
    if (dialect === "mysql") {
      if (fieldType === "number") return "DOUBLE";
      if (fieldType === "date") return "DATETIME";
      if (fieldType === "json") return "JSON";
      if (fieldType === "string") return "VARCHAR(255)";
      if (fieldType === "boolean") return "BOOLEAN";
      if (fieldType === "int") return "INT";
      if (fieldType === "bigint") return "BIGINT";
      if (fieldType === "float") return "FLOAT";
      if (fieldType === "decimal") return "DECIMAL(10,2)";
      if (fieldType === "uuid") return "CHAR(36)";
      return "TEXT";
    }
    if (fieldType === "number") return "DOUBLE PRECISION";
    if (fieldType === "date") return "TIMESTAMP";
    if (fieldType === "json") return "JSONB";
    if (fieldType === "string") return "VARCHAR(255)";
    if (fieldType === "boolean") return "BOOLEAN";
    if (fieldType === "int") return "INTEGER";
    if (fieldType === "bigint") return "BIGINT";
    if (fieldType === "float") return "REAL";
    if (fieldType === "decimal") return "DECIMAL(10,2)";
    if (fieldType === "uuid") return "UUID";
    return "TEXT";
  };

  const triggerDDLExport = () => {
    if (!databaseNodeData || typeof window === "undefined") return;

    const dbType = databaseNodeData.dbType;
    const engine = (databaseNodeData.engine || "").toLowerCase();
    const dialect: "postgresql" | "mysql" | "sqlite" = engine.includes("mysql")
      ? "mysql"
      : engine.includes("sqlite")
        ? "sqlite"
        : "postgresql";

    let output = "";
    if (dbType === "sql") {
      const tables = databaseNodeData.tables || [];
      output = tables
        .map((table) => {
          const fieldLines = (table.fields || []).map((field) => {
            const parts: string[] = [
              `"${field.name}"`,
              mapFieldTypeToSql(String(field.type || "string"), dialect),
            ];
            if (field.nullable === false) parts.push("NOT NULL");
            if (field.defaultValue) parts.push(`DEFAULT ${field.defaultValue}`);
            return parts.join(" ");
          });
          const primaryKeys = (table.fields || [])
            .filter((field) => field.isPrimaryKey)
            .map((field) => `"${field.name}"`);
          if (primaryKeys.length > 0) {
            fieldLines.push(`PRIMARY KEY (${primaryKeys.join(", ")})`);
          }
          return `CREATE TABLE "${table.name}" (\n  ${fieldLines.join(",\n  ")}\n);`;
        })
        .join("\n\n");
    } else if (dbType === "nosql") {
      output = (databaseNodeData.tables || [])
        .map((table) => {
          const fields = (table.fields || [])
            .map((field) => `  ${field.name}: ${field.type}`)
            .join("\n");
          return `collection ${table.name} {\n${fields}\n}`;
        })
        .join("\n\n");
    } else if (dbType === "kv") {
      output = (databaseNodeData.tables || [])
        .map((table) => `keyspace ${table.name} // fields: ${(table.fields || []).map((f) => f.name).join(", ")}`)
        .join("\n");
    } else {
      output = (databaseNodeData.relationships || [])
        .map(
          (rel) =>
            `(${rel.fromTableId})-[:${rel.type.toUpperCase()}]->(${rel.toTableId})`,
        )
        .join("\n");
    }

    const blob = new Blob([output || "-- No schema data --"], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      dbType === "sql"
        ? `${databaseNodeData.label || "database"}-${dialect}.sql`
        : `${databaseNodeData.label || "database"}-schema.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    showSchemaToast("Schema exported as DDL.", "success");
  };

  const handleSchemaImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const tablesCandidate = parsed.tables;
        const relationshipsCandidate = parsed.relationships;
        const seedsCandidate = parsed.seeds;
        const tableValidation = DatabaseTableSchema.array().safeParse(
          tablesCandidate,
        );
        if (!tableValidation.success) {
          showSchemaToast("Invalid schema: tables validation failed.", "error");
          return;
        }
        const relationshipValidation = DatabaseRelationshipSchema.array().safeParse(
          relationshipsCandidate || [],
        );
        if (!relationshipValidation.success) {
          showSchemaToast(
            "Invalid schema: relationships validation failed.",
            "error",
          );
          return;
        }
        const seedValidation = DatabaseSeedSchema.array().safeParse(
          seedsCandidate || [],
        );
        if (!seedValidation.success) {
          showSchemaToast("Invalid schema: seeds validation failed.", "error");
          return;
        }
        handleUpdate({
          tables: tableValidation.data,
          relationships: relationshipValidation.data,
          seeds: seedValidation.data,
          schemas: tableValidation.data.map((table) => table.name),
        } as Partial<DatabaseBlock>);
        showSchemaToast("Schema imported.", "success");
      } catch {
        showSchemaToast("Invalid JSON file.", "error");
      }
    };
    reader.readAsText(file);
  };

  const exportMigrationsAsFiles = () => {
    if (typeof window === "undefined") return;
    const migrations = databaseMigrations || [];
    if (migrations.length === 0) return;

    migrations.forEach((migration) => {
      const version = migration.version || "v_unknown";
      const upFile = new Blob([migration.upScript || "-- up script"], {
        type: "text/sql;charset=utf-8",
      });
      const downFile = new Blob([migration.downScript || "-- down script"], {
        type: "text/sql;charset=utf-8",
      });
      const upUrl = URL.createObjectURL(upFile);
      const downUrl = URL.createObjectURL(downFile);

      const upAnchor = document.createElement("a");
      upAnchor.href = upUrl;
      upAnchor.download = `${version}__up.sql`;
      upAnchor.click();
      URL.revokeObjectURL(upUrl);

      const downAnchor = document.createElement("a");
      downAnchor.href = downUrl;
      downAnchor.download = `${version}__down.sql`;
      downAnchor.click();
      URL.revokeObjectURL(downUrl);
    });
  };

  return (
    <aside style={panelStyle}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          {kind} Properties
        </div>
      </div>

      {/* Common: Label */}
      <div>
        <div style={labelStyle}>Label</div>
        <input
          type="text"
          value={nodeData.label || ""}
          onChange={(e) =>
            handleUpdate({ label: e.target.value } as Partial<NodeData>)
          }
          style={inputStyle}
        />
      </div>

      {/* Common: Description */}
      <div>
        <div style={labelStyle}>Description</div>
        <textarea
          value={nodeData.description || ""}
          onChange={(e) =>
            handleUpdate({ description: e.target.value } as Partial<NodeData>)
          }
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
        />
      </div>

      {/* Process-specific fields */}
      {kind === "process" && (
        <>
          <div style={sectionStyle}>
            <div style={labelStyle}>Process Type</div>
            <input
              type="text"
              value="Function Block"
              disabled
              style={{ ...inputStyle, opacity: 0.85, cursor: "not-allowed" }}
            />
          </div>

          <div>
            <div style={labelStyle}>Execution</div>
            <select
              value={(nodeData as ProcessDefinition).execution}
              onChange={(e) =>
                handleUpdate({
                  execution: e.target.value,
                } as Partial<ProcessDefinition>)
              }
              style={selectStyle}
            >
              <option value="sync">Sync</option>
              <option value="async">Async</option>
              <option value="scheduled">Scheduled</option>
              <option value="event_driven">Event Driven</option>
            </select>
          </div>

          {activeTab === "api" && (
            <div style={sectionStyle}>
              <div
                style={{
                  ...labelStyle,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span>Imported Functions</span>
                <span style={{ color: "var(--secondary)" }}>
                  {importedFunctionIds.length}
                </span>
              </div>
              {functionDefinitions.length === 0 ? (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    fontStyle: "italic",
                  }}
                >
                  No functions found. Add function blocks in the Functions tab.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {functionDefinitions.map((fn) => {
                    const checked = importedFunctionIds.includes(fn.id);
                    return (
                      <label
                        key={fn.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          fontSize: 11,
                          color: "var(--secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "6px 8px",
                          background: "var(--floating)",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fn.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const currentRefs = new Set(importedFunctionIds);
                            if (event.target.checked) {
                              currentRefs.add(fn.id);
                            } else {
                              currentRefs.delete(fn.id);
                            }
                            const nextSteps = Array.from(currentRefs).map(
                              (ref, index) => ({
                                id: `import_${index + 1}_${ref}`,
                                kind: "ref" as const,
                                ref,
                                description: `Import ${ref}`,
                              }),
                            );
                            handleUpdate({
                              steps: nextSteps,
                            } as Partial<ProcessDefinition>);
                          }}
                          style={{ accentColor: "var(--primary)" }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
                API Function Block imports reusable logic from Functions tab.
              </div>
            </div>
          )}

          {/* Inputs Section */}
          <div style={sectionStyle}>
            <div
              style={{
                ...labelStyle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span>Inputs</span>
              <span style={{ color: "var(--secondary)" }}>
                {(nodeData as ProcessDefinition).inputs.length}
              </span>
            </div>

            {(nodeData as ProcessDefinition).inputs.map(
              (input: InputField, i: number) => (
                <TypeSchemaEditor
                  key={i}
                  field={input}
                  onChange={(updated) =>
                    updateInput(selectedNode.id, i, updated as InputField)
                  }
                  onRemove={() => removeInput(selectedNode.id, input.name)}
                />
              ),
            )}

            {/* Add Input */}
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              <input
                type="text"
                placeholder="field name"
                value={newInputName}
                onChange={(e) => setNewInputName(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => {
                  if (newInputName.trim()) {
                    addInput(selectedNode.id, {
                      name: newInputName.trim(),
                      type: "string",
                      required: true,
                    });
                    setNewInputName("");
                  }
                }}
                style={{
                  background: "var(--primary)",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 12px",
                  color: "white",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Outputs Section */}
          <div style={sectionStyle}>
            <div
              style={{
                ...labelStyle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Success Outputs</span>
              <span style={{ color: "#4ade80" }}>
                {(nodeData as ProcessDefinition).outputs.success.length}
              </span>
            </div>

            {(nodeData as ProcessDefinition).outputs.success.map(
              (output: OutputField, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    background: "var(--background)",
                    borderRadius: 4,
                    marginBottom: 4,
                    fontSize: 11,
                    borderLeft: "2px solid #4ade80",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--foreground)" }}>
                      {output.name}
                    </span>
                    <span style={{ color: "var(--muted)", marginLeft: 6 }}>
                      : {output.type}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      removeOutput(selectedNode.id, output.name, "success")
                    }
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    ×
                  </button>
                </div>
              ),
            )}

            {/* Add Output */}
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              <input
                type="text"
                placeholder="output name"
                value={newOutputName}
                onChange={(e) => setNewOutputName(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => {
                  if (newOutputName.trim()) {
                    addOutput(
                      selectedNode.id,
                      {
                        name: newOutputName.trim(),
                        type: "string",
                      },
                      "success",
                    );
                    setNewOutputName("");
                  }
                }}
                style={{
                  background: "#4ade80",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 12px",
                  color: "black",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Steps Preview */}
          <div style={sectionStyle}>
            <div
              style={{
                ...labelStyle,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Steps</span>
              <span style={{ color: "var(--secondary)" }}>
                {(nodeData as ProcessDefinition).steps.length}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontStyle: "italic",
              }}
            >
              {activeTab === "api"
                ? "Imported functions are tracked as ref steps."
                : "Steps are defined in the visual graph"}
            </div>
          </div>
        </>
      )}

      {/* Database-specific fields */}
      {kind === "database" && (
        <>
          <div style={sectionStyle}>
            <div style={labelStyle}>Database Type</div>
            <select
              value={(nodeData as DatabaseBlock).dbType}
              onChange={(e) =>
                handleUpdate({
                  dbType: e.target.value,
                } as Partial<DatabaseBlock>)
              }
              style={selectStyle}
            >
              <option value="sql">SQL</option>
              <option value="nosql">NoSQL</option>
              <option value="kv">Key-Value</option>
              <option value="graph">Graph</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>Engine</div>
            <input
              type="text"
              value={(nodeData as DatabaseBlock).engine || ""}
              onChange={(e) =>
                handleUpdate({
                  engine: e.target.value,
                } as Partial<DatabaseBlock>)
              }
              placeholder="postgres, mongodb, redis..."
              style={inputStyle}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>Capabilities</div>
            {Object.entries((nodeData as DatabaseBlock).capabilities).map(
              ([key, value]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "var(--secondary)",
                    marginBottom: 4,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => {
                      const caps = {
                        ...(nodeData as DatabaseBlock).capabilities,
                        [key]: e.target.checked,
                      };
                      handleUpdate({
                        capabilities: caps,
                      } as Partial<DatabaseBlock>);
                    }}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span style={{ textTransform: "capitalize" }}>{key}</span>
                </label>
              ),
            )}
          </div>

          <div style={sectionStyle}>
            <button
              type="button"
              onClick={() => setIsSchemaDesignerExpanded((prev) => !prev)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                padding: 0,
                cursor: "pointer",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: isSchemaDesignerExpanded ? 8 : 0,
              }}
            >
              <span>{isSchemaDesignerExpanded ? "▾" : "▸"}</span>
              <span>Schema Designer</span>
            </button>

            {isSchemaDesignerExpanded && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {((nodeData as DatabaseBlock).tables || []).length} tables
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={triggerSchemaExport}
                      title="Export Schema"
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--floating)",
                        color: "var(--foreground)",
                        borderRadius: 4,
                        padding: "4px 7px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      ⭳
                    </button>
                    <button
                      type="button"
                      onClick={() => schemaImportInputRef.current?.click()}
                      title="Import Schema"
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--floating)",
                        color: "var(--foreground)",
                        borderRadius: 4,
                        padding: "4px 7px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      ⭱
                    </button>
                    <button
                      type="button"
                      onClick={triggerDDLExport}
                      title="Export as SQL DDL"
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--floating)",
                        color: "var(--foreground)",
                        borderRadius: 4,
                        padding: "4px 7px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      🧾
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowERD((prev) => !prev)}
                      style={{
                        border: "1px solid var(--border)",
                        background: showERD ? "color-mix(in srgb, var(--primary) 18%, var(--floating) 82%)" : "var(--floating)",
                        color: "var(--foreground)",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {showERD ? "Hide ERD" : "View ERD"}
                    </button>
                    <button
                      type="button"
                      onClick={addTable}
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--floating)",
                        color: "var(--foreground)",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      + Table
                    </button>
                  </div>
                </div>
                <input
                  ref={schemaImportInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSchemaImportFile(file);
                    e.currentTarget.value = "";
                  }}
                  style={{ display: "none" }}
                />

                {schemaToastMessage && (
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        schemaToastType === "success" ? "var(--secondary)" : "#fca5a5",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      background: "var(--panel)",
                      padding: "4px 6px",
                    }}
                  >
                    {schemaToastMessage}
                  </div>
                )}

                {showERD && (
                  <DatabaseERDViewer
                    tables={(nodeData as DatabaseBlock).tables || []}
                    relationships={(nodeData as DatabaseBlock).relationships || []}
                  />
                )}

                {((nodeData as DatabaseBlock).tables || []).length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    No tables yet.
                  </div>
                )}

                {((nodeData as DatabaseBlock).tables || []).map((table, tableIndex) => {
                  const isExpanded = expandedTables[tableIndex] ?? true;
                  return (
                    <div
                      key={`${table.name}-${tableIndex}`}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        background: "var(--floating)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: 8 }}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTables((prev) => ({
                              ...prev,
                              [tableIndex]: !isExpanded,
                            }))
                          }
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--muted)",
                            cursor: "pointer",
                            fontSize: 11,
                            padding: 0,
                            width: 14,
                          }}
                        >
                          {isExpanded ? "▾" : "▸"}
                        </button>
                        <input
                          value={table.name}
                          onChange={(e) => {
                            const tables = [...((nodeData as DatabaseBlock).tables || [])];
                            tables[tableIndex] = { ...tables[tableIndex], name: e.target.value };
                            updateDatabaseTables(tables);
                          }}
                          placeholder="Table name"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>
                          {(table.fields || []).length} fields
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const tables = ((nodeData as DatabaseBlock).tables || []).filter(
                              (_, i) => i !== tableIndex,
                            );
                            updateDatabaseTables(tables);
                          }}
                          style={{
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--muted)",
                            borderRadius: 4,
                            padding: "3px 6px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          x
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: 8, borderTop: "1px solid var(--border)", display: "grid", gap: 6 }}>
                          {(table.fields || []).map((field, fieldIndex) => (
                            <div
                              key={`${field.name}-${fieldIndex}`}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: 4,
                                padding: 6,
                                background: "var(--panel)",
                                display: "grid",
                                gap: 6,
                              }}
                            >
                              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr auto", gap: 6 }}>
                                <input
                                  value={field.name}
                                  onChange={(e) => {
                                    const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                    const fields = [...(tables[tableIndex].fields || [])];
                                    fields[fieldIndex] = { ...fields[fieldIndex], name: e.target.value };
                                    tables[tableIndex] = { ...tables[tableIndex], fields };
                                    updateDatabaseTables(tables);
                                  }}
                                  placeholder="field"
                                  style={inputStyle}
                                />
                                <select
                                  value={field.type}
                                  onChange={(e) => {
                                    const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                    const fields = [...(tables[tableIndex].fields || [])];
                                    fields[fieldIndex] = {
                                      ...fields[fieldIndex],
                                      type: e.target.value as DatabaseTableField["type"],
                                    };
                                    tables[tableIndex] = { ...tables[tableIndex], fields };
                                    updateDatabaseTables(tables);
                                  }}
                                  style={selectStyle}
                                >
                                  <option value="string">string</option>
                                  <option value="number">number</option>
                                  <option value="boolean">boolean</option>
                                  <option value="date">date</option>
                                  <option value="json">json</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                    const fields = (tables[tableIndex].fields || []).filter(
                                      (_, i) => i !== fieldIndex,
                                    );
                                    tables[tableIndex] = { ...tables[tableIndex], fields };
                                    updateDatabaseTables(tables);
                                  }}
                                  style={{
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--muted)",
                                    borderRadius: 4,
                                    padding: "3px 6px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  x
                                </button>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center" }}>
                                <input
                                  value={field.defaultValue || ""}
                                  onChange={(e) => {
                                    const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                    const fields = [...(tables[tableIndex].fields || [])];
                                    fields[fieldIndex] = {
                                      ...fields[fieldIndex],
                                      defaultValue: e.target.value || undefined,
                                    };
                                    tables[tableIndex] = { ...tables[tableIndex], fields };
                                    updateDatabaseTables(tables);
                                  }}
                                  placeholder="default"
                                  style={inputStyle}
                                />
                                <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 4 }}>
                                  <input
                                    type="checkbox"
                                    checked={field.nullable !== false}
                                    onChange={(e) => {
                                      const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                      const fields = [...(tables[tableIndex].fields || [])];
                                      fields[fieldIndex] = { ...fields[fieldIndex], nullable: e.target.checked };
                                      tables[tableIndex] = { ...tables[tableIndex], fields };
                                      updateDatabaseTables(tables);
                                    }}
                                  />
                                  nullable
                                </label>
                                <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 4 }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(field.isPrimaryKey)}
                                    onChange={(e) => {
                                      const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                      const fields = [...(tables[tableIndex].fields || [])];
                                      fields[fieldIndex] = { ...fields[fieldIndex], isPrimaryKey: e.target.checked };
                                      tables[tableIndex] = { ...tables[tableIndex], fields };
                                      updateDatabaseTables(tables);
                                    }}
                                  />
                                  pk
                                </label>
                                <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 4 }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(field.isForeignKey)}
                                    onChange={(e) => {
                                      const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                      const fields = [...(tables[tableIndex].fields || [])];
                                      fields[fieldIndex] = { ...fields[fieldIndex], isForeignKey: e.target.checked };
                                      tables[tableIndex] = { ...tables[tableIndex], fields };
                                      updateDatabaseTables(tables);
                                    }}
                                  />
                                  fk
                                </label>
                              </div>

                              {Boolean(field.isForeignKey) && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                  <select
                                    value={field.references?.table || ""}
                                    onChange={(e) => {
                                      const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                      const fields = [...(tables[tableIndex].fields || [])];
                                      fields[fieldIndex] = {
                                        ...fields[fieldIndex],
                                        references: {
                                          table: e.target.value,
                                          field: fields[fieldIndex].references?.field || "",
                                        },
                                      };
                                      tables[tableIndex] = { ...tables[tableIndex], fields };
                                      updateDatabaseTables(tables);
                                    }}
                                    style={selectStyle}
                                  >
                                    <option value="">target table</option>
                                    {((nodeData as DatabaseBlock).tables || []).map((targetTable, i) => (
                                      <option key={`${targetTable.name}-${i}`} value={targetTable.name}>
                                        {targetTable.name}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    value={field.references?.field || ""}
                                    onChange={(e) => {
                                      const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                      const fields = [...(tables[tableIndex].fields || [])];
                                      fields[fieldIndex] = {
                                        ...fields[fieldIndex],
                                        references: {
                                          table: fields[fieldIndex].references?.table || "",
                                          field: e.target.value,
                                        },
                                      };
                                      tables[tableIndex] = { ...tables[tableIndex], fields };
                                      updateDatabaseTables(tables);
                                    }}
                                    placeholder="target field"
                                    style={inputStyle}
                                  />
                                </div>
                              )}
                            </div>
                          ))}

                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => {
                                const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                const fields = [...(tables[tableIndex].fields || [])];
                                fields.push({
                                  name: `field_${fields.length + 1}`,
                                  type: "string",
                                  nullable: true,
                                  isPrimaryKey: false,
                                  isForeignKey: false,
                                });
                                tables[tableIndex] = { ...tables[tableIndex], fields };
                                updateDatabaseTables(tables);
                              }}
                              style={{
                                border: "1px solid var(--border)",
                                background: "var(--floating)",
                                color: "var(--foreground)",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: 11,
                                cursor: "pointer",
                              }}
                            >
                              + Field
                            </button>
                            <input
                              value={(table.indexes || []).join(", ")}
                              onChange={(e) => {
                                const tables = [...((nodeData as DatabaseBlock).tables || [])];
                                tables[tableIndex] = {
                                  ...tables[tableIndex],
                                  indexes: e.target.value
                                    .split(",")
                                    .map((x) => x.trim())
                                    .filter(Boolean),
                                };
                                updateDatabaseTables(tables);
                              }}
                              placeholder="indexes (comma separated)"
                              style={{ ...inputStyle, flex: 1 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...sectionStyle, display: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: isTemplatePickerOpen ? 8 : 0,
              }}
            >
              <div style={labelStyle}>Templates</div>
              <button
                type="button"
                onClick={() => setIsTemplatePickerOpen((prev) => !prev)}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--floating)",
                  color: "var(--foreground)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Load Template
              </button>
            </div>

            {isTemplatePickerOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={selectStyle}
                >
                  {databaseTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadDatabaseTemplate}
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--floating)",
                    color: "var(--foreground)",
                    borderRadius: 4,
                    padding: "4px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <button
              type="button"
              onClick={() => setIsSeedingExpanded((prev) => !prev)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                padding: 0,
                cursor: "pointer",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: isSeedingExpanded ? 8 : 0,
              }}
            >
              <span>{isSeedingExpanded ? "▾" : "▸"}</span>
              <span>Data Seeding</span>
            </button>

            {isSeedingExpanded && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {databaseSeeds.length} seeds configured
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultTable = (databaseNodeData?.tables || [])[0]?.name || "";
                      if (!defaultTable) {
                        showSchemaToast("Create a table first to configure seeds.", "error");
                        return;
                      }
                      updateDatabaseSeeds([
                        ...databaseSeeds,
                        {
                          tableName: defaultTable,
                          rowCount: 10,
                          strategy: "random",
                          fixtureData: [],
                          customScript: "",
                        },
                      ]);
                    }}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--floating)",
                      color: "var(--foreground)",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    + Seed
                  </button>
                </div>

                {databaseSeeds.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    No seed configs yet.
                  </div>
                )}

                {databaseSeeds.map((seed, seedIndex) => {
                  const expanded = expandedSeeds[seedIndex] ?? true;
                  const previewRows = seed.strategy === "random" ? buildRandomSeedPreview(seed) : [];
                  const fixtureText =
                    fixtureDrafts[seedIndex] ?? JSON.stringify(seed.fixtureData || [], null, 2);
                  return (
                    <div
                      key={`${seed.tableName}-${seedIndex}`}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        background: "var(--floating)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: 8 }}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSeeds((prev) => ({ ...prev, [seedIndex]: !expanded }))
                          }
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--muted)",
                            cursor: "pointer",
                            fontSize: 11,
                            padding: 0,
                            width: 14,
                          }}
                        >
                          {expanded ? "▾" : "▸"}
                        </button>
                        <span style={{ fontSize: 11, color: "var(--foreground)", flex: 1 }}>
                          {seed.tableName || "Select table"} · {seed.strategy}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>
                          {seed.rowCount} rows
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextSeeds = databaseSeeds.filter((_, index) => index !== seedIndex);
                            updateDatabaseSeeds(nextSeeds);
                          }}
                          style={{
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--muted)",
                            borderRadius: 4,
                            padding: "3px 6px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          x
                        </button>
                      </div>

                      {expanded && (
                        <div style={{ padding: 8, borderTop: "1px solid var(--border)", display: "grid", gap: 6 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.8fr 0.8fr", gap: 6 }}>
                            <select
                              value={seed.tableName}
                              onChange={(e) => {
                                const nextSeeds = [...databaseSeeds];
                                nextSeeds[seedIndex] = { ...seed, tableName: e.target.value };
                                updateDatabaseSeeds(nextSeeds);
                              }}
                              style={selectStyle}
                            >
                              {(databaseNodeData?.tables || []).map((table, index) => (
                                <option key={`${table.name}-${index}`} value={table.name}>
                                  {table.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={1}
                              value={seed.rowCount}
                              onChange={(e) => {
                                const nextSeeds = [...databaseSeeds];
                                nextSeeds[seedIndex] = {
                                  ...seed,
                                  rowCount: Math.max(1, Number(e.target.value) || 1),
                                };
                                updateDatabaseSeeds(nextSeeds);
                              }}
                              placeholder="Rows"
                              style={inputStyle}
                            />
                            <select
                              value={seed.strategy}
                              onChange={(e) => {
                                const strategy = e.target.value as DatabaseSeed["strategy"];
                                const nextSeeds = [...databaseSeeds];
                                nextSeeds[seedIndex] = { ...seed, strategy };
                                updateDatabaseSeeds(nextSeeds);
                              }}
                              style={selectStyle}
                            >
                              <option value="random">random</option>
                              <option value="fixture">fixture</option>
                              <option value="custom">custom</option>
                            </select>
                          </div>

                          {seed.strategy === "random" && (
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
                                Example Rows
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  border: "1px solid var(--border)",
                                  borderRadius: 4,
                                  background: "var(--panel)",
                                  color: "var(--secondary)",
                                  padding: 8,
                                  fontSize: 10,
                                  maxHeight: 120,
                                  overflow: "auto",
                                  fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              >
                                {JSON.stringify(previewRows, null, 2)}
                              </pre>
                            </div>
                          )}

                          {seed.strategy === "fixture" && (
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
                                Fixture JSON Array
                              </div>
                              <textarea
                                value={fixtureText}
                                onChange={(e) =>
                                  setFixtureDrafts((prev) => ({
                                    ...prev,
                                    [seedIndex]: e.target.value,
                                  }))
                                }
                                onBlur={() => {
                                  try {
                                    const parsed = JSON.parse(fixtureText);
                                    if (!Array.isArray(parsed)) {
                                      showSchemaToast("Fixture data must be a JSON array.", "error");
                                      return;
                                    }
                                    const nextSeeds = [...databaseSeeds];
                                    nextSeeds[seedIndex] = {
                                      ...seed,
                                      fixtureData: parsed as Array<Record<string, unknown>>,
                                    };
                                    updateDatabaseSeeds(nextSeeds);
                                    setFixtureDrafts((prev) => {
                                      const next = { ...prev };
                                      delete next[seedIndex];
                                      return next;
                                    });
                                  } catch {
                                    showSchemaToast("Invalid fixture JSON.", "error");
                                  }
                                }}
                                placeholder='[{"id":1,"name":"example"}]'
                                style={{
                                  ...inputStyle,
                                  minHeight: 90,
                                  resize: "vertical",
                                  fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              />
                            </div>
                          )}

                          {seed.strategy === "custom" && (
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
                                Custom Seed Script
                              </div>
                              <textarea
                                value={seed.customScript || ""}
                                onChange={(e) => {
                                  const nextSeeds = [...databaseSeeds];
                                  nextSeeds[seedIndex] = {
                                    ...seed,
                                    customScript: e.target.value,
                                  };
                                  updateDatabaseSeeds(nextSeeds);
                                }}
                                placeholder="return [{...}]"
                                style={{
                                  ...inputStyle,
                                  minHeight: 90,
                                  resize: "vertical",
                                  fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>Performance & Scaling</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <input
                type="number"
                min={0}
                value={databasePerformance.connectionPool.min}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      connectionPool: {
                        ...databasePerformance.connectionPool,
                        min: Math.max(0, Number(e.target.value) || 0),
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Pool Min"
                style={inputStyle}
              />
              <input
                type="number"
                min={1}
                value={databasePerformance.connectionPool.max}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      connectionPool: {
                        ...databasePerformance.connectionPool,
                        max: Math.max(1, Number(e.target.value) || 1),
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Pool Max"
                style={inputStyle}
              />
              <input
                type="number"
                min={0}
                value={databasePerformance.connectionPool.timeout}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      connectionPool: {
                        ...databasePerformance.connectionPool,
                        timeout: Math.max(0, Number(e.target.value) || 0),
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Pool Timeout"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
              <input
                type="number"
                min={0}
                value={databasePerformance.readReplicas.count}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      readReplicas: {
                        ...databasePerformance.readReplicas,
                        count: Math.max(0, Number(e.target.value) || 0),
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Read Replicas"
                style={inputStyle}
              />
              <input
                type="text"
                value={(databasePerformance.readReplicas.regions || []).join(", ")}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      readReplicas: {
                        ...databasePerformance.readReplicas,
                        regions: e.target.value
                          .split(",")
                          .map((region) => region.trim())
                          .filter(Boolean),
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Replica regions"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 6, marginTop: 6, alignItems: "center" }}>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={databasePerformance.caching.enabled}
                  onChange={(e) =>
                    handleUpdate({
                      performance: {
                        ...databasePerformance,
                        caching: {
                          ...databasePerformance.caching,
                          enabled: e.target.checked,
                        },
                      },
                    } as Partial<DatabaseBlock>)
                  }
                />
                Cache
              </label>
              <input
                type="text"
                value={databasePerformance.caching.strategy}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      caching: {
                        ...databasePerformance.caching,
                        strategy: e.target.value,
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Caching strategy"
                style={inputStyle}
              />
              <input
                type="number"
                min={0}
                value={databasePerformance.caching.ttl}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      caching: {
                        ...databasePerformance.caching,
                        ttl: Math.max(0, Number(e.target.value) || 0),
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Cache TTL"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 6, marginTop: 6, alignItems: "center" }}>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={databasePerformance.sharding.enabled}
                  onChange={(e) =>
                    handleUpdate({
                      performance: {
                        ...databasePerformance,
                        sharding: {
                          ...databasePerformance.sharding,
                          enabled: e.target.checked,
                        },
                      },
                    } as Partial<DatabaseBlock>)
                  }
                />
                Shard
              </label>
              <input
                type="text"
                value={databasePerformance.sharding.strategy}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      sharding: {
                        ...databasePerformance.sharding,
                        strategy: e.target.value,
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Sharding strategy"
                style={inputStyle}
              />
              <input
                type="text"
                value={databasePerformance.sharding.partitionKey}
                onChange={(e) =>
                  handleUpdate({
                    performance: {
                      ...databasePerformance,
                      sharding: {
                        ...databasePerformance.sharding,
                        partitionKey: e.target.value,
                      },
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Partition key"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>Resource Planning</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <input
                type="number"
                min={0}
                value={databaseCostEstimation.storageGb}
                onChange={(e) =>
                  handleUpdate({
                    costEstimation: {
                      ...databaseCostEstimation,
                      storageGb: Math.max(0, Number(e.target.value) || 0),
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Storage (GB)"
                style={inputStyle}
              />
              <input
                type="number"
                min={0}
                value={databaseCostEstimation.estimatedIOPS}
                onChange={(e) =>
                  handleUpdate({
                    costEstimation: {
                      ...databaseCostEstimation,
                      estimatedIOPS: Math.max(0, Number(e.target.value) || 0),
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Estimated IOPS"
                style={inputStyle}
              />
              <input
                type="number"
                min={0}
                value={databaseCostEstimation.backupSizeGb}
                onChange={(e) =>
                  handleUpdate({
                    costEstimation: {
                      ...databaseCostEstimation,
                      backupSizeGb: Math.max(0, Number(e.target.value) || 0),
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Backup Size (GB)"
                style={inputStyle}
              />
              <input
                type="number"
                min={0}
                value={databaseCostEstimation.replicaCount}
                onChange={(e) =>
                  handleUpdate({
                    costEstimation: {
                      ...databaseCostEstimation,
                      replicaCount: Math.max(0, Number(e.target.value) || 0),
                    },
                  } as Partial<DatabaseBlock>)
                }
                placeholder="Replica Count"
                style={inputStyle}
              />
            </div>
            <div
              style={{
                marginTop: 8,
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--panel)",
                padding: "8px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                Estimated Monthly Cost ({databaseMonthlyCost.provider.toUpperCase()})
              </span>
              <span style={{ fontSize: 14, color: "var(--secondary)", fontWeight: 600 }}>
                {databaseMonthlyCost.formattedMonthlyEstimate}
              </span>
            </div>
          </div>

          <div style={sectionStyle}>
            <button
              type="button"
              onClick={() => setIsBackupExpanded((prev) => !prev)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                padding: 0,
                cursor: "pointer",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: isBackupExpanded ? 8 : 0,
              }}
            >
              <span>{isBackupExpanded ? "▾" : "▸"}</span>
              <span>Backup & Recovery</span>
            </button>

            {isBackupExpanded && (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  <select
                    value={databaseBackup.schedule}
                    onChange={(e) =>
                      handleUpdate({
                        backup: {
                          ...databaseBackup,
                          schedule: e.target.value,
                        },
                      } as Partial<DatabaseBlock>)
                    }
                    style={selectStyle}
                  >
                    <option value="">Schedule</option>
                    <option value="hourly">hourly</option>
                    <option value="daily">daily</option>
                    <option value="weekly">weekly</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={databaseBackup.retention.days}
                    onChange={(e) =>
                      handleUpdate({
                        backup: {
                          ...databaseBackup,
                          retention: {
                            ...databaseBackup.retention,
                            days: Math.max(1, Number(e.target.value) || 1),
                          },
                        },
                      } as Partial<DatabaseBlock>)
                    }
                    placeholder="Retention Days"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    min={1}
                    value={databaseBackup.retention.maxVersions}
                    onChange={(e) =>
                      handleUpdate({
                        backup: {
                          ...databaseBackup,
                          retention: {
                            ...databaseBackup.retention,
                            maxVersions: Math.max(1, Number(e.target.value) || 1),
                          },
                        },
                      } as Partial<DatabaseBlock>)
                    }
                    placeholder="Max Versions"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={databaseBackup.pointInTimeRecovery}
                      onChange={(e) =>
                        handleUpdate({
                          backup: {
                            ...databaseBackup,
                            pointInTimeRecovery: e.target.checked,
                          },
                        } as Partial<DatabaseBlock>)
                      }
                    />
                    Point-in-time Recovery
                  </label>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={databaseBackup.multiRegion.enabled}
                      onChange={(e) =>
                        handleUpdate({
                          backup: {
                            ...databaseBackup,
                            multiRegion: {
                              ...databaseBackup.multiRegion,
                              enabled: e.target.checked,
                            },
                          },
                        } as Partial<DatabaseBlock>)
                      }
                    />
                    Multi-region DR
                  </label>
                </div>

                {databaseBackup.multiRegion.enabled && (
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        value={backupRegionDraft}
                        onChange={(e) => setBackupRegionDraft(e.target.value)}
                        placeholder="Add region (e.g. us-west-2)"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const region = backupRegionDraft.trim();
                          if (!region) return;
                          if (databaseBackup.multiRegion.regions.includes(region)) {
                            setBackupRegionDraft("");
                            return;
                          }
                          handleUpdate({
                            backup: {
                              ...databaseBackup,
                              multiRegion: {
                                ...databaseBackup.multiRegion,
                                regions: [...databaseBackup.multiRegion.regions, region],
                              },
                            },
                          } as Partial<DatabaseBlock>);
                          setBackupRegionDraft("");
                        }}
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--floating)",
                          color: "var(--foreground)",
                          borderRadius: 4,
                          padding: "4px 8px",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Add
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(databaseBackup.multiRegion.regions || []).map((region) => (
                        <button
                          key={region}
                          type="button"
                          onClick={() =>
                            handleUpdate({
                              backup: {
                                ...databaseBackup,
                                multiRegion: {
                                  ...databaseBackup.multiRegion,
                                  regions: databaseBackup.multiRegion.regions.filter(
                                    (value) => value !== region,
                                  ),
                                },
                              },
                            } as Partial<DatabaseBlock>)
                          }
                          style={{
                            border: "1px solid var(--border)",
                            background: "var(--panel)",
                            color: "var(--secondary)",
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          {region} ×
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <button
              type="button"
              onClick={() => setIsSecurityExpanded((prev) => !prev)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                padding: 0,
                cursor: "pointer",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: isSecurityExpanded ? 8 : 0,
              }}
            >
              <span>{isSecurityExpanded ? "▾" : "▸"}</span>
              <span>Security</span>
            </button>

            {isSecurityExpanded && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
                    Roles & Permissions
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      value={roleNameDraft}
                      onChange={(e) => setRoleNameDraft(e.target.value)}
                      placeholder="Role name"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      type="text"
                      value={rolePermDraft}
                      onChange={(e) => setRolePermDraft(e.target.value)}
                      placeholder="read, write, delete"
                      style={{ ...inputStyle, flex: 1.3 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const roleName = roleNameDraft.trim();
                        if (!roleName) return;
                        const permissions = rolePermDraft
                          .split(",")
                          .map((perm) => perm.trim())
                          .filter(Boolean);
                        handleUpdate({
                          security: {
                            ...databaseSecurity,
                            roles: [
                              ...(databaseSecurity.roles || []),
                              { name: roleName, permissions },
                            ],
                          },
                        } as Partial<DatabaseBlock>);
                        setRoleNameDraft("");
                        setRolePermDraft("");
                      }}
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--floating)",
                        color: "var(--foreground)",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {(databaseSecurity.roles || []).map((role, index) => (
                      <div
                        key={`${role.name}-${index}`}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          background: "var(--panel)",
                          padding: "5px 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 11, color: "var(--foreground)" }}>{role.name}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {(role.permissions || []).join(", ") || "no permissions"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdate({
                              security: {
                                ...databaseSecurity,
                                roles: (databaseSecurity.roles || []).filter(
                                  (_, i) => i !== index,
                                ),
                              },
                            } as Partial<DatabaseBlock>)
                          }
                          style={{
                            marginLeft: "auto",
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--muted)",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={databaseSecurity.encryption.atRest}
                      onChange={(e) =>
                        handleUpdate({
                          security: {
                            ...databaseSecurity,
                            encryption: {
                              ...databaseSecurity.encryption,
                              atRest: e.target.checked,
                            },
                          },
                        } as Partial<DatabaseBlock>)
                      }
                    />
                    Encryption at rest
                  </label>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={databaseSecurity.encryption.inTransit}
                      onChange={(e) =>
                        handleUpdate({
                          security: {
                            ...databaseSecurity,
                            encryption: {
                              ...databaseSecurity.encryption,
                              inTransit: e.target.checked,
                            },
                          },
                        } as Partial<DatabaseBlock>)
                      }
                    />
                    Encryption in transit
                  </label>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={databaseSecurity.auditLogging}
                      onChange={(e) =>
                        handleUpdate({
                          security: {
                            ...databaseSecurity,
                            auditLogging: e.target.checked,
                          },
                        } as Partial<DatabaseBlock>)
                      }
                    />
                    Audit logging
                  </label>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <input
                    type="text"
                    value={databaseSecurity.network.vpcId}
                    onChange={(e) =>
                      handleUpdate({
                        security: {
                          ...databaseSecurity,
                          network: {
                            ...databaseSecurity.network,
                            vpcId: e.target.value,
                          },
                        },
                      } as Partial<DatabaseBlock>)
                    }
                    placeholder="VPC ID"
                    style={inputStyle}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      value={allowedIpDraft}
                      onChange={(e) => setAllowedIpDraft(e.target.value)}
                      placeholder="Add allowed IP/CIDR"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const value = allowedIpDraft.trim();
                        if (!value) return;
                        if ((databaseSecurity.network.allowedIPs || []).includes(value)) {
                          setAllowedIpDraft("");
                          return;
                        }
                        handleUpdate({
                          security: {
                            ...databaseSecurity,
                            network: {
                              ...databaseSecurity.network,
                              allowedIPs: [
                                ...(databaseSecurity.network.allowedIPs || []),
                                value,
                              ],
                            },
                          },
                        } as Partial<DatabaseBlock>);
                        setAllowedIpDraft("");
                      }}
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--floating)",
                        color: "var(--foreground)",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(databaseSecurity.network.allowedIPs || []).map((ip) => (
                      <button
                        key={ip}
                        type="button"
                        onClick={() =>
                          handleUpdate({
                            security: {
                              ...databaseSecurity,
                              network: {
                                ...databaseSecurity.network,
                                allowedIPs: (databaseSecurity.network.allowedIPs || []).filter(
                                  (value) => value !== ip,
                                ),
                              },
                            },
                          } as Partial<DatabaseBlock>)
                        }
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          color: "var(--secondary)",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {ip} ×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <button
              type="button"
              onClick={() => setIsMonitoringExpanded((prev) => !prev)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                padding: 0,
                cursor: "pointer",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: isMonitoringExpanded ? 8 : 0,
              }}
            >
              <span>{isMonitoringExpanded ? "▾" : "▸"}</span>
              <span>Monitoring & SLA</span>
            </button>

            {isMonitoringExpanded && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  {[
                    {
                      key: "cpuPercent",
                      label: "CPU Threshold",
                      min: 40,
                      max: 100,
                      unit: "%",
                    },
                    {
                      key: "memoryPercent",
                      label: "Memory Threshold",
                      min: 40,
                      max: 100,
                      unit: "%",
                    },
                    {
                      key: "connectionCount",
                      label: "Connection Threshold",
                      min: 20,
                      max: 1000,
                      unit: "",
                    },
                    {
                      key: "queryLatencyMs",
                      label: "Latency Threshold",
                      min: 50,
                      max: 2000,
                      unit: "ms",
                    },
                  ].map((item) => {
                    const value = databaseMonitoring.thresholds[
                      item.key as keyof typeof databaseMonitoring.thresholds
                    ] as number;
                    const ratio = (value - item.min) / (item.max - item.min);
                    const tint =
                      ratio > 0.75
                        ? "#f59e0b"
                        : ratio > 0.5
                          ? "#eab308"
                          : "var(--muted)";
                    return (
                      <div key={item.key} style={{ display: "grid", gap: 4 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          <span>{item.label}</span>
                          <span style={{ color: tint }}>
                            {value}
                            {item.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={item.min}
                          max={item.max}
                          value={value}
                          onChange={(e) =>
                            handleUpdate({
                              monitoring: {
                                ...databaseMonitoring,
                                thresholds: {
                                  ...databaseMonitoring.thresholds,
                                  [item.key]: Number(e.target.value) || item.min,
                                },
                              },
                            } as Partial<DatabaseBlock>)
                          }
                          style={{ width: "100%" }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
                    Alert Rules
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1.6fr auto", gap: 6 }}>
                    <input
                      value={alertConditionDraft}
                      onChange={(e) => setAlertConditionDraft(e.target.value)}
                      placeholder="if cpuPercent > 85"
                      style={inputStyle}
                    />
                    <select
                      value={alertChannelDraft}
                      onChange={(e) => setAlertChannelDraft(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="email">email</option>
                      <option value="slack">slack</option>
                      <option value="pagerduty">pagerduty</option>
                      <option value="webhook">webhook</option>
                    </select>
                    <input
                      value={alertRecipientsDraft}
                      onChange={(e) => setAlertRecipientsDraft(e.target.value)}
                      placeholder="ops@example.com, dev@example.com"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const condition = alertConditionDraft.trim();
                        if (!condition) return;
                        const recipients = alertRecipientsDraft
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean);
                        handleUpdate({
                          monitoring: {
                            ...databaseMonitoring,
                            alerts: [
                              ...(databaseMonitoring.alerts || []),
                              {
                                condition,
                                channel: alertChannelDraft,
                                recipients,
                              },
                            ],
                          },
                        } as Partial<DatabaseBlock>);
                        setAlertConditionDraft("");
                        setAlertRecipientsDraft("");
                      }}
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--floating)",
                        color: "var(--foreground)",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {(databaseMonitoring.alerts || []).map((alert, index) => (
                    <div
                      key={`${alert.condition}-${index}`}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        background: "var(--panel)",
                        padding: "5px 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: "var(--foreground)" }}>{alert.condition}</span>
                      <span style={{ color: "var(--muted)" }}>via {alert.channel}</span>
                      <span
                        style={{
                          color: "var(--muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {(alert.recipients || []).join(", ")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdate({
                            monitoring: {
                              ...databaseMonitoring,
                              alerts: (databaseMonitoring.alerts || []).filter(
                                (_, i) => i !== index,
                              ),
                            },
                          } as Partial<DatabaseBlock>)
                        }
                        style={{
                          marginLeft: "auto",
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--muted)",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>
                    SLA Targets
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <input
                      type="number"
                      min={90}
                      max={100}
                      step={0.1}
                      value={databaseMonitoring.slaTargets.uptimePercent}
                      onChange={(e) =>
                        handleUpdate({
                          monitoring: {
                            ...databaseMonitoring,
                            slaTargets: {
                              ...databaseMonitoring.slaTargets,
                              uptimePercent: Number(e.target.value) || 99.9,
                            },
                          },
                        } as Partial<DatabaseBlock>)
                      }
                      placeholder="Uptime %"
                      style={inputStyle}
                    />
                    <input
                      type="number"
                      min={1}
                      value={databaseMonitoring.slaTargets.maxLatencyMs}
                      onChange={(e) =>
                        handleUpdate({
                          monitoring: {
                            ...databaseMonitoring,
                            slaTargets: {
                              ...databaseMonitoring.slaTargets,
                              maxLatencyMs: Math.max(1, Number(e.target.value) || 1),
                            },
                          },
                        } as Partial<DatabaseBlock>)
                      }
                      placeholder="Max Latency (ms)"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <QueryEditor
              database={nodeData as DatabaseBlock}
              onChange={(queries) =>
                handleUpdate({ queries } as Partial<DatabaseBlock>)
              }
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>Connected Processes</div>
            {!dbConnectionSummary ? (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                No connection data.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {dbConnectionSummary.operationCount} operations across{" "}
                  {dbConnectionSummary.connectionCount} nodes
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
                    Reads
                  </div>
                  {dbConnectionSummary.readers
                    .filter((entry) => entry.nodeType === "process")
                    .map((entry) => (
                      <div
                        key={`read-${entry.nodeId}`}
                        style={{
                          fontSize: 11,
                          color: "var(--secondary)",
                          display: "flex",
                          justifyContent: "space-between",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          padding: "4px 6px",
                          background: "var(--panel)",
                        }}
                      >
                        <span>{entry.nodeName}</span>
                        <span style={{ color: "var(--muted)" }}>read</span>
                      </div>
                    ))}
                  {dbConnectionSummary.readers.filter(
                    (entry) => entry.nodeType === "process",
                  ).length === 0 && (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      No process readers
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
                    Writes
                  </div>
                  {dbConnectionSummary.writers
                    .filter((entry) => entry.nodeType === "process")
                    .map((entry) => (
                      <div
                        key={`write-${entry.nodeId}`}
                        style={{
                          fontSize: 11,
                          color: "var(--secondary)",
                          display: "flex",
                          justifyContent: "space-between",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          padding: "4px 6px",
                          background: "var(--panel)",
                        }}
                      >
                        <span>{entry.nodeName}</span>
                        <span style={{ color: "var(--muted)" }}>write</span>
                      </div>
                    ))}
                  {dbConnectionSummary.writers.filter(
                    (entry) => entry.nodeType === "process",
                  ).length === 0 && (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      No process writers
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <button
              type="button"
              onClick={() => setIsMigrationsExpanded((prev) => !prev)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                padding: 0,
                cursor: "pointer",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: isMigrationsExpanded ? 8 : 0,
              }}
            >
              <span>{isMigrationsExpanded ? "▾" : "▸"}</span>
              <span>Schema Migrations</span>
            </button>

            {isMigrationsExpanded && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVersion = `v${databaseMigrations.length + 1}`;
                      const migrations = [
                        ...databaseMigrations,
                        {
                          version: nextVersion,
                          timestamp: "",
                          description: "",
                          upScript: "",
                          downScript: "",
                          applied: false,
                        },
                      ];
                      updateDatabaseMigrations(migrations);
                      setExpandedMigrations((prev) => ({
                        ...prev,
                        [migrations.length - 1]: true,
                      }));
                    }}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--floating)",
                      color: "var(--foreground)",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    + Migration
                  </button>
                  <button
                    type="button"
                    onClick={exportMigrationsAsFiles}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--floating)",
                      color: "var(--foreground)",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Export Migrations
                  </button>
                </div>

                {databaseMigrations.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    No migrations yet.
                  </div>
                )}

                {databaseMigrations.map((migration, migrationIndex) => {
                  const open = expandedMigrations[migrationIndex] ?? false;
                  return (
                    <div
                      key={`${migration.version}-${migrationIndex}`}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        background: "var(--floating)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMigrations((prev) => ({
                              ...prev,
                              [migrationIndex]: !open,
                            }))
                          }
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--muted)",
                            cursor: "pointer",
                            fontSize: 11,
                            padding: 0,
                            width: 14,
                          }}
                        >
                          {open ? "▾" : "▸"}
                        </button>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--foreground)",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        >
                          {migration.version}
                        </span>
                        <label
                          style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            color: "var(--muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={migration.applied}
                            onChange={(e) => {
                              const migrations = [...databaseMigrations];
                              migrations[migrationIndex] = {
                                ...migrations[migrationIndex],
                                applied: e.target.checked,
                              };
                              updateDatabaseMigrations(migrations);
                            }}
                          />
                          Applied
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const migrations = databaseMigrations.filter(
                              (_, i) => i !== migrationIndex,
                            );
                            updateDatabaseMigrations(migrations);
                          }}
                          style={{
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--muted)",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          x
                        </button>
                      </div>

                      {open && (
                        <div
                          style={{
                            borderTop: "1px solid var(--border)",
                            padding: 8,
                            display: "grid",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 6,
                            }}
                          >
                            <input
                              value={migration.version}
                              onChange={(e) => {
                                const migrations = [...databaseMigrations];
                                migrations[migrationIndex] = {
                                  ...migrations[migrationIndex],
                                  version: e.target.value,
                                };
                                updateDatabaseMigrations(migrations);
                              }}
                              placeholder="Version"
                              style={inputStyle}
                            />
                            <input
                              value={migration.timestamp}
                              onChange={(e) => {
                                const migrations = [...databaseMigrations];
                                migrations[migrationIndex] = {
                                  ...migrations[migrationIndex],
                                  timestamp: e.target.value,
                                };
                                updateDatabaseMigrations(migrations);
                              }}
                              placeholder="Timestamp"
                              style={inputStyle}
                            />
                          </div>
                          <input
                            value={migration.description}
                            onChange={(e) => {
                              const migrations = [...databaseMigrations];
                              migrations[migrationIndex] = {
                                ...migrations[migrationIndex],
                                description: e.target.value,
                              };
                              updateDatabaseMigrations(migrations);
                            }}
                            placeholder="Description"
                            style={inputStyle}
                          />
                          <textarea
                            value={migration.upScript}
                            onChange={(e) => {
                              const migrations = [...databaseMigrations];
                              migrations[migrationIndex] = {
                                ...migrations[migrationIndex],
                                upScript: e.target.value,
                              };
                              updateDatabaseMigrations(migrations);
                            }}
                            placeholder="Up script"
                            style={{
                              ...inputStyle,
                              minHeight: 70,
                              resize: "vertical",
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                            }}
                          />
                          <textarea
                            value={migration.downScript}
                            onChange={(e) => {
                              const migrations = [...databaseMigrations];
                              migrations[migrationIndex] = {
                                ...migrations[migrationIndex],
                                downScript: e.target.value,
                              };
                              updateDatabaseMigrations(migrations);
                            }}
                            placeholder="Down script"
                            style={{
                              ...inputStyle,
                              minHeight: 70,
                              resize: "vertical",
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...sectionStyle, display: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={labelStyle}>Schema Designer</div>
              <button
                type="button"
                onClick={addTable}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--floating)",
                  color: "var(--foreground)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                + Table
              </button>
            </div>

            {((nodeData as DatabaseBlock).tables || []).length === 0 && (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                No tables yet.
              </div>
            )}

            {((nodeData as DatabaseBlock).tables || []).map((table, tableIndex) => {
              const isExpanded = expandedTables[tableIndex] ?? true;
              return (
                <div
                  key={`${table.name}-${tableIndex}`}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    marginBottom: 8,
                    background: "var(--floating)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTables((prev) => ({
                          ...prev,
                          [tableIndex]: !isExpanded,
                        }))
                      }
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: 11,
                        padding: 0,
                        width: 14,
                      }}
                    >
                      {isExpanded ? "▾" : "▸"}
                    </button>
                    <input
                      value={table.name}
                      onChange={(e) => {
                        const tables = [...
                          ((nodeData as DatabaseBlock).tables || [])
                        ];
                        tables[tableIndex] = { ...tables[tableIndex], name: e.target.value };
                        updateDatabaseTables(tables);
                      }}
                      placeholder="Table name"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tables = ((nodeData as DatabaseBlock).tables || []).filter(
                          (_, i) => i !== tableIndex,
                        );
                        updateDatabaseTables(tables);
                      }}
                      style={{
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--muted)",
                        borderRadius: 4,
                        padding: "4px 6px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: 8, borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(table.fields || []).map((field, fieldIndex) => (
                          <div
                            key={`${field.name}-${fieldIndex}`}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              padding: 6,
                              display: "grid",
                              gap: 6,
                              background: "var(--panel)",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1.3fr 1fr auto",
                                gap: 6,
                              }}
                            >
                              <input
                                value={field.name}
                                onChange={(e) => {
                                  const tables = [...
                                    ((nodeData as DatabaseBlock).tables || [])
                                  ];
                                  const fields = [...(tables[tableIndex].fields || [])];
                                  fields[fieldIndex] = {
                                    ...fields[fieldIndex],
                                    name: e.target.value,
                                  };
                                  tables[tableIndex] = { ...tables[tableIndex], fields };
                                  updateDatabaseTables(tables);
                                }}
                                placeholder="field"
                                style={inputStyle}
                              />
                              <select
                                value={field.type}
                                onChange={(e) => {
                                  const tables = [...
                                    ((nodeData as DatabaseBlock).tables || [])
                                  ];
                                  const fields = [...(tables[tableIndex].fields || [])];
                                  fields[fieldIndex] = {
                                    ...fields[fieldIndex],
                                    type: e.target.value as DatabaseTableField["type"],
                                  };
                                  tables[tableIndex] = { ...tables[tableIndex], fields };
                                  updateDatabaseTables(tables);
                                }}
                                style={selectStyle}
                              >
                                <option value="string">string</option>
                                <option value="text">text</option>
                                <option value="int">int</option>
                                <option value="bigint">bigint</option>
                                <option value="float">float</option>
                                <option value="decimal">decimal</option>
                                <option value="boolean">boolean</option>
                                <option value="datetime">datetime</option>
                                <option value="json">json</option>
                                <option value="uuid">uuid</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const tables = [...
                                    ((nodeData as DatabaseBlock).tables || [])
                                  ];
                                  const fields = (tables[tableIndex].fields || []).filter(
                                    (_, i) => i !== fieldIndex,
                                  );
                                  tables[tableIndex] = { ...tables[tableIndex], fields };
                                  updateDatabaseTables(tables);
                                }}
                                style={{
                                  border: "1px solid var(--border)",
                                  background: "transparent",
                                  color: "var(--muted)",
                                  borderRadius: 4,
                                  padding: "4px 6px",
                                  fontSize: 11,
                                  cursor: "pointer",
                                }}
                              >
                                x
                              </button>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <input
                                value={field.defaultValue || ""}
                                onChange={(e) => {
                                  const tables = [...
                                    ((nodeData as DatabaseBlock).tables || [])
                                  ];
                                  const fields = [...(tables[tableIndex].fields || [])];
                                  fields[fieldIndex] = {
                                    ...fields[fieldIndex],
                                    defaultValue: e.target.value || undefined,
                                  };
                                  tables[tableIndex] = { ...tables[tableIndex], fields };
                                  updateDatabaseTables(tables);
                                }}
                                placeholder="default"
                                style={inputStyle}
                              />
                              <input
                                value={
                                  field.references
                                    ? `${field.references.table}.${field.references.field}`
                                    : ""
                                }
                                onChange={(e) => {
                                  const tables = [...
                                    ((nodeData as DatabaseBlock).tables || [])
                                  ];
                                  const fields = [...(tables[tableIndex].fields || [])];
                                  const raw = e.target.value.trim();
                                  const [tableRef = "", fieldRef = ""] = raw.split(".");
                                  fields[fieldIndex] = {
                                    ...fields[fieldIndex],
                                    references:
                                      tableRef && fieldRef
                                        ? { table: tableRef, field: fieldRef }
                                        : undefined,
                                    isForeignKey: Boolean(tableRef && fieldRef),
                                  };
                                  tables[tableIndex] = { ...tables[tableIndex], fields };
                                  updateDatabaseTables(tables);
                                }}
                                placeholder="references table.field"
                                style={inputStyle}
                              />
                            </div>

                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                              <label style={{ fontSize: 11, color: "var(--muted)" }}>
                                <input
                                  type="checkbox"
                                  checked={field.nullable !== false}
                                  onChange={(e) => {
                                    const tables = [...
                                      ((nodeData as DatabaseBlock).tables || [])
                                    ];
                                    const fields = [...(tables[tableIndex].fields || [])];
                                    fields[fieldIndex] = {
                                      ...fields[fieldIndex],
                                      nullable: e.target.checked,
                                      required: !e.target.checked,
                                    };
                                    tables[tableIndex] = { ...tables[tableIndex], fields };
                                    updateDatabaseTables(tables);
                                  }}
                                />{" "}
                                Nullable
                              </label>
                              <label style={{ fontSize: 11, color: "var(--muted)" }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(field.isPrimaryKey)}
                                  onChange={(e) => {
                                    const tables = [...
                                      ((nodeData as DatabaseBlock).tables || [])
                                    ];
                                    const fields = [...(tables[tableIndex].fields || [])];
                                    fields[fieldIndex] = {
                                      ...fields[fieldIndex],
                                      isPrimaryKey: e.target.checked,
                                      primaryKey: e.target.checked,
                                    };
                                    tables[tableIndex] = { ...tables[tableIndex], fields };
                                    updateDatabaseTables(tables);
                                  }}
                                />{" "}
                                Primary Key
                              </label>
                              <label style={{ fontSize: 11, color: "var(--muted)" }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(field.isForeignKey)}
                                  onChange={(e) => {
                                    const tables = [...
                                      ((nodeData as DatabaseBlock).tables || [])
                                    ];
                                    const fields = [...(tables[tableIndex].fields || [])];
                                    fields[fieldIndex] = {
                                      ...fields[fieldIndex],
                                      isForeignKey: e.target.checked,
                                    };
                                    tables[tableIndex] = { ...tables[tableIndex], fields };
                                    updateDatabaseTables(tables);
                                  }}
                                />{" "}
                                Foreign Key
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            const tables = [...
                              ((nodeData as DatabaseBlock).tables || [])
                            ];
                            const fields = [...(tables[tableIndex].fields || [])];
                            fields.push({
                              name: `field_${fields.length + 1}`,
                              type: "string",
                              nullable: true,
                              required: false,
                              isPrimaryKey: false,
                              primaryKey: false,
                              isForeignKey: false,
                            });
                            tables[tableIndex] = { ...tables[tableIndex], fields };
                            updateDatabaseTables(tables);
                          }}
                          style={{
                            border: "1px solid var(--border)",
                            background: "var(--floating)",
                            color: "var(--foreground)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          + Field
                        </button>
                        <input
                          value={(table.indexes || []).join(", ")}
                          onChange={(e) => {
                            const tables = [...
                              ((nodeData as DatabaseBlock).tables || [])
                            ];
                            tables[tableIndex] = {
                              ...tables[tableIndex],
                              indexes: e.target.value
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean),
                            };
                            updateDatabaseTables(tables);
                          }}
                          placeholder="indexes (comma separated)"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Queue-specific fields */}
      {kind === "queue" && (
        <>
          <div style={sectionStyle}>
            <div style={labelStyle}>Delivery</div>
            <select
              value={(nodeData as QueueBlock).delivery}
              onChange={(e) =>
                handleUpdate({
                  delivery: e.target.value,
                } as Partial<QueueBlock>)
              }
              style={selectStyle}
            >
              <option value="at_least_once">At Least Once</option>
              <option value="at_most_once">At Most Once</option>
              <option value="exactly_once">Exactly Once</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>Max Retry Attempts</div>
            <input
              type="number"
              value={(nodeData as QueueBlock).retry.maxAttempts}
              onChange={(e) =>
                handleUpdate({
                  retry: {
                    ...(nodeData as QueueBlock).retry,
                    maxAttempts: parseInt(e.target.value) || 3,
                  },
                } as Partial<QueueBlock>)
              }
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>Backoff Strategy</div>
            <select
              value={(nodeData as QueueBlock).retry.backoff}
              onChange={(e) =>
                handleUpdate({
                  retry: {
                    ...(nodeData as QueueBlock).retry,
                    backoff: e.target.value as "linear" | "exponential",
                  },
                } as Partial<QueueBlock>)
              }
              style={selectStyle}
            >
              <option value="linear">Linear</option>
              <option value="exponential">Exponential</option>
            </select>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--secondary)",
            }}
          >
            <input
              type="checkbox"
              checked={(nodeData as QueueBlock).deadLetter}
              onChange={(e) =>
                handleUpdate({
                  deadLetter: e.target.checked,
                } as Partial<QueueBlock>)
              }
              style={{ accentColor: "var(--primary)" }}
            />
            Enable Dead Letter Queue
          </label>
        </>
      )}

      {/* Infra-specific fields */}
      {kind === "infra" && (
        <>
          <div style={sectionStyle}>
            <div style={labelStyle}>Provider</div>
            <select
              value={(nodeData as InfraBlock).provider}
              onChange={(e) =>
                handleUpdate({
                  provider: e.target.value,
                } as Partial<InfraBlock>)
              }
              style={selectStyle}
            >
              <option value="aws">AWS</option>
              <option value="gcp">Google Cloud</option>
              <option value="azure">Azure</option>
              <option value="generic">Generic</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>Environment</div>
            <select
              value={(nodeData as InfraBlock).environment}
              onChange={(e) =>
                handleUpdate({
                  environment: e.target.value,
                } as Partial<InfraBlock>)
              }
              style={selectStyle}
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="preview">Preview</option>
              <option value="dev">Dev</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>Region</div>
            <input
              type="text"
              value={(nodeData as InfraBlock).region}
              onChange={(e) =>
                handleUpdate({
                  region: e.target.value,
                } as Partial<InfraBlock>)
              }
              placeholder="us-east-1"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>Tags (comma-separated)</div>
            <input
              type="text"
              value={((nodeData as InfraBlock).tags || []).join(", ")}
              onChange={(e) =>
                handleUpdate({
                  tags: e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                } as Partial<InfraBlock>)
              }
              placeholder="env=prod, owner=platform"
              style={inputStyle}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>Resource Type</div>
            <div style={{ fontSize: 12, color: "var(--secondary)" }}>
              {(nodeData as InfraBlock).resourceType.replace("_", " ")}
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>
              {infraFieldSets[(nodeData as InfraBlock).resourceType].title}
            </div>
            {infraFieldSets[(nodeData as InfraBlock).resourceType].fields.map(
              (field) => {
                const config = (nodeData as InfraBlock).config as Record<
                  string,
                  string | number | boolean
                >;
                const value = config[field.key];

                if (field.type === "boolean") {
                  return (
                    <label
                      key={field.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        color: "var(--secondary)",
                        marginBottom: 6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) =>
                          handleUpdate({
                            config: {
                              ...(nodeData as InfraBlock).config,
                              [field.key]: e.target.checked,
                            },
                          } as Partial<InfraBlock>)
                        }
                        style={{ accentColor: "var(--primary)" }}
                      />
                      {field.label}
                    </label>
                  );
                }

                if (field.type === "select") {
                  return (
                    <div key={field.key} style={{ marginBottom: 8 }}>
                      <div style={labelStyle}>{field.label}</div>
                      <select
                        value={String(value ?? "")}
                        onChange={(e) =>
                          handleUpdate({
                            config: {
                              ...(nodeData as InfraBlock).config,
                              [field.key]: e.target.value,
                            },
                          } as Partial<InfraBlock>)
                        }
                        style={selectStyle}
                      >
                        {(field.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={field.key} style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>{field.label}</div>
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={
                        typeof value === "number" || typeof value === "string"
                          ? value
                          : ""
                      }
                      onChange={(e) => {
                        const nextValue =
                          field.type === "number"
                            ? Number(e.target.value || 0)
                            : e.target.value;
                        handleUpdate({
                          config: {
                            ...(nodeData as InfraBlock).config,
                            [field.key]: nextValue,
                          },
                        } as Partial<InfraBlock>);
                      }}
                      placeholder={field.placeholder}
                      style={inputStyle}
                    />
                  </div>
                );
              },
            )}
          </div>
        </>
      )}

      {/* Interface block-specific fields */}
      {kind === "api_binding" && (
        <>
          {/* Protocol */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Protocol</div>
            <select
              value={apiProtocol}
              onChange={(e) => {
                const nextProtocol = e.target.value as
                  | "rest"
                  | "ws"
                  | "socket.io"
                  | "webrtc"
                  | "graphql"
                  | "grpc"
                  | "sse"
                  | "webhook";

                if (nextProtocol === "rest") {
                  handleUpdate({
                    protocol: "rest",
                    apiType: "openapi",
                    instance: undefined,
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
                      error: { statusCode: 400, schema: [] },
                    },
                    security: { type: "none", scopes: [] },
                    rateLimit: {
                      enabled: false,
                      requests: 100,
                      window: "minute",
                    },
                  } as Partial<ApiBinding>);
                  return;
                }

                const instanceDefaults =
                  nextProtocol === "ws"
                    ? {
                        protocol: "ws" as const,
                        config: {
                          endpoint: "/ws/events",
                          pingIntervalSec: 20,
                          pingTimeoutSec: 10,
                          maxMessageSizeKb: 256,
                          maxConnections: 5000,
                          auth: { type: "none" as const, scopes: [] as string[] },
                          rateLimit: {
                            enabled: false,
                            requests: 100,
                            window: "minute" as const,
                          },
                        },
                      }
                    : nextProtocol === "socket.io"
                      ? {
                          protocol: "socket.io" as const,
                          config: {
                            endpoint: "/socket.io",
                            namespaces: ["/"],
                            rooms: [],
                            events: [],
                            ackTimeoutMs: 5000,
                            auth: { type: "none" as const, scopes: [] as string[] },
                            rateLimit: {
                              enabled: false,
                              requests: 100,
                            window: "minute" as const,
                          },
                        },
                      }
                      : nextProtocol === "webrtc"
                        ? {
                          protocol: "webrtc" as const,
                          config: {
                            signalingTransportRef: "api_ws_signaling",
                            stunServers: ["stun:stun.l.google.com:19302"],
                            turnServers: [],
                            peerLimit: 4,
                            topology: "p2p" as const,
                          },
                        }
                        : nextProtocol === "graphql"
                          ? {
                              protocol: "graphql" as const,
                              config: {
                                endpoint: "/graphql",
                                schemaSDL: "type Query { health: String! }",
                                operations: {
                                  queries: true,
                                  mutations: true,
                                  subscriptions: true,
                                },
                              },
                            }
                          : nextProtocol === "grpc"
                            ? {
                                protocol: "grpc" as const,
                                config: {
                                  protobufDefinition:
                                    "syntax = \"proto3\";\nservice ApiService { rpc Execute (ExecuteRequest) returns (ExecuteResponse); }\nmessage ExecuteRequest { string id = 1; }\nmessage ExecuteResponse { string status = 1; }",
                                  service: "ApiService",
                                  rpcMethods: [{ name: "Execute", type: "unary" as const }],
                                },
                              }
                            : nextProtocol === "sse"
                              ? {
                                  protocol: "sse" as const,
                                  config: {
                                    endpoint: "/events",
                                    eventName: "update",
                                    retryMs: 5000,
                                    heartbeatSec: 30,
                                    direction: "server_to_client" as const,
                                  },
                                }
                              : {
                                  protocol: "webhook" as const,
                                  config: {
                                    endpoint: "/webhooks/incoming",
                                    signatureVerification: {
                                      enabled: true,
                                      headerName: "X-Signature",
                                      secretRef: "WEBHOOK_SECRET",
                                    },
                                    retryPolicy: {
                                      enabled: true,
                                      maxAttempts: 5,
                                      backoff: "exponential" as const,
                                    },
                                  },
                                };

                handleUpdate({
                  protocol: nextProtocol,
                  apiType:
                    nextProtocol === "ws" ||
                    nextProtocol === "socket.io" ||
                    nextProtocol === "webrtc" ||
                    nextProtocol === "sse"
                      ? "asyncapi"
                      : "openapi",
                  method: undefined,
                  route: undefined,
                  request: undefined,
                  responses: undefined,
                  security: undefined,
                  rateLimit: undefined,
                  instance: instanceDefaults,
                } as Partial<ApiBinding>);
              }}
              style={selectStyle}
            >
              <option value="rest">REST</option>
              <option value="ws">WebSocket</option>
              <option value="socket.io">Socket.IO</option>
              <option value="webrtc">WebRTC</option>
              <option value="graphql">GraphQL</option>
              <option value="grpc">gRPC</option>
              <option value="sse">SSE</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>

          {isRestProtocol ? (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 100 }}>
                <div style={labelStyle}>Method</div>
                <select
                  value={(nodeData as ApiBinding).method}
                  onChange={(e) =>
                    handleUpdate({
                      method: e.target.value,
                    } as Partial<ApiBinding>)
                  }
                  style={selectStyle}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>Route</div>
                <input
                  type="text"
                  value={(nodeData as ApiBinding).route || ""}
                  onChange={(e) =>
                    handleUpdate({ route: e.target.value } as Partial<ApiBinding>)
                  }
                  placeholder="/api/resource"
                  style={inputStyle}
                />
              </div>
            </div>
          ) : (
            <div style={sectionStyle}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>
                Protocol Config
              </div>

              {(isWsProtocol || isSocketIOProtocol) && (
                <div style={{ marginBottom: 8 }}>
                  <div style={labelStyle}>Endpoint</div>
                  <input
                    type="text"
                    value={(apiNode?.instance?.config as { endpoint?: string } | undefined)?.endpoint || ""}
                    onChange={(e) =>
                      handleUpdate({
                        instance: {
                          ...(apiNode?.instance as object),
                          config: {
                            ...(apiNode?.instance?.config as object),
                            endpoint: e.target.value,
                          },
                        },
                      } as Partial<ApiBinding>)
                    }
                    placeholder={isSocketIOProtocol ? "/socket.io" : "/ws/events"}
                    style={inputStyle}
                  />
                </div>
              )}

              {isWsProtocol && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={labelStyle}>Ping Interval (sec)</div>
                      <input
                        type="number"
                        value={(apiNode?.instance?.config as { pingIntervalSec?: number } | undefined)?.pingIntervalSec || 20}
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                pingIntervalSec: Number(e.target.value || 20),
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <div style={labelStyle}>Ping Timeout (sec)</div>
                      <input
                        type="number"
                        value={(apiNode?.instance?.config as { pingTimeoutSec?: number } | undefined)?.pingTimeoutSec || 10}
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                pingTimeoutSec: Number(e.target.value || 10),
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div>
                      <div style={labelStyle}>Max Size (KB)</div>
                      <input
                        type="number"
                        value={(apiNode?.instance?.config as { maxMessageSizeKb?: number } | undefined)?.maxMessageSizeKb || 256}
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                maxMessageSizeKb: Number(e.target.value || 256),
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <div style={labelStyle}>Max Connections</div>
                      <input
                        type="number"
                        value={(apiNode?.instance?.config as { maxConnections?: number } | undefined)?.maxConnections || 5000}
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                maxConnections: Number(e.target.value || 5000),
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </>
              )}

              {isSocketIOProtocol && (
                <>
                  <div style={{ marginTop: 8 }}>
                    <div style={labelStyle}>Namespaces (comma-separated)</div>
                    <input
                      type="text"
                      value={((apiNode?.instance?.config as { namespaces?: string[] } | undefined)?.namespaces || []).join(", ")}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              namespaces: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={labelStyle}>Rooms (comma-separated)</div>
                    <input
                      type="text"
                      value={((apiNode?.instance?.config as { rooms?: string[] } | undefined)?.rooms || []).join(", ")}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              rooms: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={labelStyle}>Events (comma-separated)</div>
                    <input
                      type="text"
                      value={((apiNode?.instance?.config as { events?: string[] } | undefined)?.events || []).join(", ")}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              events: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={labelStyle}>Ack Timeout (ms)</div>
                    <input
                      type="number"
                      value={(apiNode?.instance?.config as { ackTimeoutMs?: number } | undefined)?.ackTimeoutMs || 5000}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              ackTimeoutMs: Number(e.target.value || 5000),
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {isWebRtcProtocol && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>Signaling Transport Reference</div>
                    <input
                      type="text"
                      value={(apiNode?.instance?.config as { signalingTransportRef?: string } | undefined)?.signalingTransportRef || ""}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              signalingTransportRef: e.target.value,
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={{
                        ...inputStyle,
                        borderColor:
                          ((apiNode?.instance?.config as { signalingTransportRef?: string } | undefined)?.signalingTransportRef || "").trim()
                            ? "var(--border)"
                            : "var(--destructive)",
                      }}
                    />
                    {!((apiNode?.instance?.config as { signalingTransportRef?: string } | undefined)?.signalingTransportRef || "").trim() && (
                      <div style={{ fontSize: 10, color: "var(--destructive)", marginTop: 4 }}>
                        WebRTC requires signaling transport reference.
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={labelStyle}>STUN Servers (comma-separated)</div>
                    <input
                      type="text"
                      value={((apiNode?.instance?.config as { stunServers?: string[] } | undefined)?.stunServers || []).join(", ")}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              stunServers: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={labelStyle}>TURN Servers (comma-separated)</div>
                    <input
                      type="text"
                      value={((apiNode?.instance?.config as { turnServers?: string[] } | undefined)?.turnServers || []).join(", ")}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              turnServers: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div>
                      <div style={labelStyle}>Peer Limit</div>
                      <input
                        type="number"
                        value={(apiNode?.instance?.config as { peerLimit?: number } | undefined)?.peerLimit || 4}
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                peerLimit: Number(e.target.value || 4),
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <div style={labelStyle}>Topology</div>
                      <input
                        type="text"
                        value="p2p"
                        disabled
                        style={{ ...inputStyle, opacity: 0.85, cursor: "not-allowed" }}
                      />
                    </div>
                  </div>
                </>
              )}

              {isGraphqlProtocol && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>Endpoint</div>
                    <input
                      type="text"
                      value={(apiNode?.instance?.config as { endpoint?: string } | undefined)?.endpoint || ""}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              endpoint: e.target.value,
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>Schema SDL</div>
                    <textarea
                      value={(apiNode?.instance?.config as { schemaSDL?: string } | undefined)?.schemaSDL || ""}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              schemaSDL: e.target.value,
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={{ ...inputStyle, minHeight: 90, resize: "vertical", fontFamily: "monospace" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { key: "queries", label: "Queries" },
                      { key: "mutations", label: "Mutations" },
                      { key: "subscriptions", label: "Subscriptions" },
                    ].map((op) => (
                      <label
                        key={op.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: "var(--secondary)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            Boolean(
                              (apiNode?.instance?.config as {
                                operations?: Record<string, boolean>;
                              } | undefined)?.operations?.[op.key],
                            )
                          }
                          onChange={(e) =>
                            handleUpdate({
                              instance: {
                                ...(apiNode?.instance as object),
                                config: {
                                  ...(apiNode?.instance?.config as object),
                                  operations: {
                                    ...((apiNode?.instance?.config as { operations?: object } | undefined)
                                      ?.operations as object),
                                    [op.key]: e.target.checked,
                                  },
                                },
                              },
                            } as Partial<ApiBinding>)
                          }
                          style={{ accentColor: "var(--primary)" }}
                        />
                        {op.label}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {isGrpcProtocol && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>Service</div>
                    <input
                      type="text"
                      value={(apiNode?.instance?.config as { service?: string } | undefined)?.service || ""}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              service: e.target.value,
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>RPC Methods (name:type, comma-separated)</div>
                    <input
                      type="text"
                      value={((apiNode?.instance?.config as { rpcMethods?: Array<{ name?: string; type?: string }> } | undefined)?.rpcMethods || [])
                        .map((method) => `${method.name || ""}:${method.type || "unary"}`)
                        .join(", ")}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              rpcMethods: e.target.value
                                .split(",")
                                .map((entry) => entry.trim())
                                .filter(Boolean)
                                .map((entry) => {
                                  const [rawName, rawType] = entry.split(":").map((v) => v.trim());
                                  const type = rawType || "unary";
                                  const normalizedType =
                                    type === "server_stream" ||
                                    type === "client_stream" ||
                                    type === "bidirectional_stream"
                                      ? type
                                      : "unary";
                                  return {
                                    name: rawName || "Method",
                                    type: normalizedType,
                                  };
                                }),
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      placeholder="Execute:unary, StreamUpdates:server_stream"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={labelStyle}>Protobuf Definition</div>
                    <textarea
                      value={
                        (apiNode?.instance?.config as { protobufDefinition?: string } | undefined)
                          ?.protobufDefinition || ""
                      }
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              protobufDefinition: e.target.value,
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "monospace" }}
                    />
                  </div>
                </>
              )}

              {isSseProtocol && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>Endpoint</div>
                    <input
                      type="text"
                      value={(apiNode?.instance?.config as { endpoint?: string } | undefined)?.endpoint || ""}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              endpoint: e.target.value,
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>Event Name</div>
                    <input
                      type="text"
                      value={(apiNode?.instance?.config as { eventName?: string } | undefined)?.eventName || ""}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              eventName: e.target.value,
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={labelStyle}>Retry (ms)</div>
                      <input
                        type="number"
                        value={(apiNode?.instance?.config as { retryMs?: number } | undefined)?.retryMs || 5000}
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                retryMs: Number(e.target.value || 5000),
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <div style={labelStyle}>Heartbeat (sec)</div>
                      <input
                        type="number"
                        value={(apiNode?.instance?.config as { heartbeatSec?: number } | undefined)?.heartbeatSec || 30}
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                heartbeatSec: Number(e.target.value || 30),
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={labelStyle}>Direction</div>
                    <input
                      type="text"
                      value="server_to_client"
                      disabled
                      style={{ ...inputStyle, opacity: 0.85, cursor: "not-allowed" }}
                    />
                  </div>
                </>
              )}

              {isWebhookProtocol && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>Endpoint</div>
                    <input
                      type="text"
                      value={(apiNode?.instance?.config as { endpoint?: string } | undefined)?.endpoint || ""}
                      onChange={(e) =>
                        handleUpdate({
                          instance: {
                            ...(apiNode?.instance as object),
                            config: {
                              ...(apiNode?.instance?.config as object),
                              endpoint: e.target.value,
                            },
                          },
                        } as Partial<ApiBinding>)
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={sectionStyle}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        color: "var(--secondary)",
                        marginBottom: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          (apiNode?.instance?.config as {
                            signatureVerification?: { enabled?: boolean };
                          } | undefined)?.signatureVerification?.enabled || false
                        }
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                signatureVerification: {
                                  ...((apiNode?.instance?.config as {
                                    signatureVerification?: object;
                                  } | undefined)?.signatureVerification as object),
                                  enabled: e.target.checked,
                                },
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={{ accentColor: "var(--primary)" }}
                      />
                      Enable Signature Verification
                    </label>

                    {(apiNode?.instance?.config as {
                      signatureVerification?: { enabled?: boolean };
                    } | undefined)?.signatureVerification?.enabled && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                        <div>
                          <div style={labelStyle}>Header Name</div>
                          <input
                            type="text"
                            value={
                              (apiNode?.instance?.config as {
                                signatureVerification?: { headerName?: string };
                              } | undefined)?.signatureVerification?.headerName || ""
                            }
                            onChange={(e) =>
                              handleUpdate({
                                instance: {
                                  ...(apiNode?.instance as object),
                                  config: {
                                    ...(apiNode?.instance?.config as object),
                                    signatureVerification: {
                                      ...((apiNode?.instance?.config as {
                                        signatureVerification?: object;
                                      } | undefined)?.signatureVerification as object),
                                      headerName: e.target.value,
                                    },
                                  },
                                },
                              } as Partial<ApiBinding>)
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <div style={labelStyle}>Secret Ref</div>
                          <input
                            type="text"
                            value={
                              (apiNode?.instance?.config as {
                                signatureVerification?: { secretRef?: string };
                              } | undefined)?.signatureVerification?.secretRef || ""
                            }
                            onChange={(e) =>
                              handleUpdate({
                                instance: {
                                  ...(apiNode?.instance as object),
                                  config: {
                                    ...(apiNode?.instance?.config as object),
                                    signatureVerification: {
                                      ...((apiNode?.instance?.config as {
                                        signatureVerification?: object;
                                      } | undefined)?.signatureVerification as object),
                                      secretRef: e.target.value,
                                    },
                                  },
                                },
                              } as Partial<ApiBinding>)
                            }
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={sectionStyle}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        color: "var(--secondary)",
                        marginBottom: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          (apiNode?.instance?.config as {
                            retryPolicy?: { enabled?: boolean };
                          } | undefined)?.retryPolicy?.enabled || false
                        }
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                retryPolicy: {
                                  ...((apiNode?.instance?.config as {
                                    retryPolicy?: object;
                                  } | undefined)?.retryPolicy as object),
                                  enabled: e.target.checked,
                                },
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={{ accentColor: "var(--primary)" }}
                      />
                      Enable Retry Policy
                    </label>

                    {(apiNode?.instance?.config as {
                      retryPolicy?: { enabled?: boolean };
                    } | undefined)?.retryPolicy?.enabled && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={labelStyle}>Max Attempts</div>
                          <input
                            type="number"
                            value={
                              (apiNode?.instance?.config as {
                                retryPolicy?: { maxAttempts?: number };
                              } | undefined)?.retryPolicy?.maxAttempts || 5
                            }
                            onChange={(e) =>
                              handleUpdate({
                                instance: {
                                  ...(apiNode?.instance as object),
                                  config: {
                                    ...(apiNode?.instance?.config as object),
                                    retryPolicy: {
                                      ...((apiNode?.instance?.config as {
                                        retryPolicy?: object;
                                      } | undefined)?.retryPolicy as object),
                                      maxAttempts: Number(e.target.value || 5),
                                    },
                                  },
                                },
                              } as Partial<ApiBinding>)
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <div style={labelStyle}>Backoff</div>
                          <select
                            value={
                              (apiNode?.instance?.config as {
                                retryPolicy?: { backoff?: string };
                              } | undefined)?.retryPolicy?.backoff || "exponential"
                            }
                            onChange={(e) =>
                              handleUpdate({
                                instance: {
                                  ...(apiNode?.instance as object),
                                  config: {
                                    ...(apiNode?.instance?.config as object),
                                    retryPolicy: {
                                      ...((apiNode?.instance?.config as {
                                        retryPolicy?: object;
                                      } | undefined)?.retryPolicy as object),
                                      backoff: e.target.value,
                                    },
                                  },
                                },
                              } as Partial<ApiBinding>)
                            }
                            style={selectStyle}
                          >
                            <option value="fixed">Fixed</option>
                            <option value="linear">Linear</option>
                            <option value="exponential">Exponential</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {(isWsProtocol || isSocketIOProtocol) && (
            <>
              <div style={sectionStyle}>
                <div style={labelStyle}>Auth</div>
                <select
                  value={
                    (apiNode?.instance?.config as { auth?: { type?: string } } | undefined)?.auth?.type ||
                    "none"
                  }
                  onChange={(e) =>
                    handleUpdate({
                      instance: {
                        ...(apiNode?.instance as object),
                        config: {
                          ...(apiNode?.instance?.config as object),
                          auth: {
                            ...((apiNode?.instance?.config as { auth?: object } | undefined)?.auth as object),
                            type: e.target.value,
                          },
                        },
                      },
                    } as Partial<ApiBinding>)
                  }
                  style={selectStyle}
                >
                  <option value="none">None</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer">Bearer</option>
                  <option value="oauth2">OAuth2</option>
                  <option value="basic">Basic</option>
                </select>
              </div>

              <div style={sectionStyle}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "var(--secondary)",
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      (apiNode?.instance?.config as { rateLimit?: { enabled?: boolean } } | undefined)?.rateLimit
                        ?.enabled || false
                    }
                    onChange={(e) =>
                      handleUpdate({
                        instance: {
                          ...(apiNode?.instance as object),
                          config: {
                            ...(apiNode?.instance?.config as object),
                            rateLimit: {
                              ...((apiNode?.instance?.config as { rateLimit?: object } | undefined)
                                ?.rateLimit as object),
                              enabled: e.target.checked,
                            },
                          },
                        },
                      } as Partial<ApiBinding>)
                    }
                    style={{ accentColor: "var(--primary)" }}
                  />
                  Enable Rate Limiting
                </label>
                {(apiNode?.instance?.config as { rateLimit?: { enabled?: boolean } } | undefined)?.rateLimit
                  ?.enabled && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={labelStyle}>Requests</div>
                      <input
                        type="number"
                        value={
                          (apiNode?.instance?.config as {
                            rateLimit?: { requests?: number };
                          } | undefined)?.rateLimit?.requests || 100
                        }
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                rateLimit: {
                                  ...((apiNode?.instance?.config as { rateLimit?: object } | undefined)
                                    ?.rateLimit as object),
                                  requests: Number(e.target.value || 100),
                                },
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={labelStyle}>Per</div>
                      <select
                        value={
                          (apiNode?.instance?.config as {
                            rateLimit?: { window?: string };
                          } | undefined)?.rateLimit?.window || "minute"
                        }
                        onChange={(e) =>
                          handleUpdate({
                            instance: {
                              ...(apiNode?.instance as object),
                              config: {
                                ...(apiNode?.instance?.config as object),
                                rateLimit: {
                                  ...((apiNode?.instance?.config as { rateLimit?: object } | undefined)
                                    ?.rateLimit as object),
                                  window: e.target.value,
                                },
                              },
                            },
                          } as Partial<ApiBinding>)
                        }
                        style={selectStyle}
                      >
                        <option value="second">Second</option>
                        <option value="minute">Minute</option>
                        <option value="hour">Hour</option>
                        <option value="day">Day</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Version & Deprecated */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 80 }}>
              <div style={labelStyle}>Version</div>
              <input
                type="text"
                value={(nodeData as ApiBinding).version}
                onChange={(e) =>
                  handleUpdate({
                    version: e.target.value,
                  } as Partial<ApiBinding>)
                }
                placeholder="v1"
                style={inputStyle}
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--secondary)",
                padding: "8px 0",
              }}
            >
              <input
                type="checkbox"
                checked={(nodeData as ApiBinding).deprecated}
                onChange={(e) =>
                  handleUpdate({
                    deprecated: e.target.checked,
                  } as Partial<ApiBinding>)
                }
                style={{ accentColor: "#ef4444" }}
              />
              Deprecated
            </label>
          </div>

          {/* Security */}
          {isRestProtocol && (
            <div style={sectionStyle}>
            <div style={labelStyle}>Security</div>
            <select
              value={(nodeData as ApiBinding).security?.type || "none"}
              onChange={(e) =>
                handleUpdate({
                  security: {
                    ...(nodeData as ApiBinding).security,
                    type: e.target.value as
                      | "none"
                      | "api_key"
                      | "bearer"
                      | "oauth2"
                      | "basic",
                  },
                } as Partial<ApiBinding>)
              }
              style={selectStyle}
            >
              <option value="none">🔓 None</option>
              <option value="api_key">🔑 API Key</option>
              <option value="bearer">🎫 Bearer Token</option>
              <option value="oauth2">🔐 OAuth2</option>
              <option value="basic">👤 Basic Auth</option>
            </select>
            {(nodeData as ApiBinding).security?.type === "api_key" && (
              <div style={{ marginTop: 8 }}>
                <div style={labelStyle}>Header Name</div>
                <input
                  type="text"
                  value={(nodeData as ApiBinding).security?.headerName || ""}
                  onChange={(e) =>
                    handleUpdate({
                      security: {
                        ...(nodeData as ApiBinding).security,
                        headerName: e.target.value,
                      },
                    } as Partial<ApiBinding>)
                  }
                  placeholder="X-API-Key"
                  style={inputStyle}
                />
              </div>
            )}
            </div>
          )}

          {/* Rate Limiting */}
          {isRestProtocol && (
            <div style={sectionStyle}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "var(--secondary)",
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={(nodeData as ApiBinding).rateLimit?.enabled || false}
                onChange={(e) =>
                  handleUpdate({
                    rateLimit: {
                      ...(nodeData as ApiBinding).rateLimit,
                      enabled: e.target.checked,
                    },
                  } as Partial<ApiBinding>)
                }
                style={{ accentColor: "var(--primary)" }}
              />
              Enable Rate Limiting
            </label>
            {(nodeData as ApiBinding).rateLimit?.enabled && (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Requests</div>
                  <input
                    type="number"
                    value={(nodeData as ApiBinding).rateLimit?.requests || 100}
                    onChange={(e) =>
                      handleUpdate({
                        rateLimit: {
                          ...(nodeData as ApiBinding).rateLimit,
                          requests: parseInt(e.target.value) || 100,
                        },
                      } as Partial<ApiBinding>)
                    }
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Per</div>
                  <select
                    value={
                      (nodeData as ApiBinding).rateLimit?.window || "minute"
                    }
                    onChange={(e) =>
                      handleUpdate({
                        rateLimit: {
                          ...(nodeData as ApiBinding).rateLimit,
                          window: e.target.value as
                            | "second"
                            | "minute"
                            | "hour"
                            | "day",
                        },
                      } as Partial<ApiBinding>)
                    }
                    style={selectStyle}
                  >
                    <option value="second">Second</option>
                    <option value="minute">Minute</option>
                    <option value="hour">Hour</option>
                    <option value="day">Day</option>
                  </select>
                </div>
              </div>
            )}
            </div>
          )}

          {/* Request Schema Tabs */}
          {isRestProtocol && (
            <div style={sectionStyle}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Request</div>

            {/* Tab Buttons */}
            <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
              {(["body", "headers", "query"] as const).map((tab) => {
                const showBody =
                  isWsProtocol ||
                  ["POST", "PUT", "PATCH"].includes(
                    (nodeData as ApiBinding).method,
                  );
                if (tab === "body" && !showBody) return null;
                if (isWsProtocol && tab === "query") return null;

                const counts: Record<string, number> = {
                  body:
                    (nodeData as ApiBinding).request?.body?.schema?.length || 0,
                  headers:
                    (nodeData as ApiBinding).request?.headers?.length || 0,
                  query:
                    (nodeData as ApiBinding).request?.queryParams?.length || 0,
                  path:
                    (nodeData as ApiBinding).request?.pathParams?.length || 0,
                };

                return (
                  <button
                    key={tab}
                    onClick={() => setRequestTab(tab)}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      background:
                        requestTab === tab ? "var(--floating)" : "transparent",
                      border:
                        requestTab === tab
                          ? "1px solid var(--border)"
                          : "1px solid transparent",
                      borderRadius: 4,
                      color:
                        requestTab === tab
                          ? "var(--secondary)"
                          : "var(--muted)",
                      fontSize: 10,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {tab}{" "}
                    {counts[tab] > 0 && (
                      <span style={{ color: "var(--primary)" }}>
                        ({counts[tab]})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Body Tab */}
            {requestTab === "body" &&
              (isWsProtocol ||
                ["POST", "PUT", "PATCH"].includes(
                  (nodeData as ApiBinding).method,
                )) && (
                <>
                  {((nodeData as ApiBinding).request?.body?.schema || []).map(
                    (field, i) => (
                      <TypeSchemaEditor
                        key={i}
                        field={field}
                        onChange={(updated) => {
                          const schema = [
                            ...((nodeData as ApiBinding).request?.body
                              ?.schema || []),
                          ];
                          schema[i] = updated as InputField;
                          handleUpdate({
                            request: {
                              ...(nodeData as ApiBinding).request,
                              body: {
                                ...(nodeData as ApiBinding).request?.body,
                                schema,
                              },
                            },
                          } as Partial<ApiBinding>);
                        }}
                        onRemove={() => {
                          const schema = (
                            (nodeData as ApiBinding).request?.body?.schema || []
                          ).filter((_, idx) => idx !== i);
                          handleUpdate({
                            request: {
                              ...(nodeData as ApiBinding).request,
                              body: {
                                ...(nodeData as ApiBinding).request?.body,
                                schema,
                              },
                            },
                          } as Partial<ApiBinding>);
                        }}
                      />
                    ),
                  )}
                  <button
                    onClick={() => {
                      const schema = [
                        ...((nodeData as ApiBinding).request?.body?.schema ||
                          []),
                        {
                          name: "field",
                          type: "string",
                          required: true,
                        } as InputField,
                      ];
                      handleUpdate({
                        request: {
                          ...(nodeData as ApiBinding).request,
                          body: {
                            ...(nodeData as ApiBinding).request?.body,
                            schema,
                          },
                        },
                      } as Partial<ApiBinding>);
                    }}
                    style={{
                      width: "100%",
                      padding: "6px",
                      background: "transparent",
                      border: "1px dashed var(--border)",
                      borderRadius: 4,
                      color: "var(--muted)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    + Add Body Field
                  </button>
                </>
              )}

            {/* Headers Tab */}
            {requestTab === "headers" && (
              <>
                {((nodeData as ApiBinding).request?.headers || []).map(
                  (field, i) => (
                    <TypeSchemaEditor
                      key={i}
                      field={field}
                      onChange={(updated) => {
                        const headers = [
                          ...((nodeData as ApiBinding).request?.headers || []),
                        ];
                        headers[i] = updated as InputField;
                        handleUpdate({
                          request: {
                            ...(nodeData as ApiBinding).request,
                            headers,
                          },
                        } as Partial<ApiBinding>);
                      }}
                      onRemove={() => {
                        const headers = (
                          (nodeData as ApiBinding).request?.headers || []
                        ).filter((_, idx) => idx !== i);
                        handleUpdate({
                          request: {
                            ...(nodeData as ApiBinding).request,
                            headers,
                          },
                        } as Partial<ApiBinding>);
                      }}
                    />
                  ),
                )}
                <button
                  onClick={() => {
                    const headers = [
                      ...((nodeData as ApiBinding).request?.headers || []),
                      {
                        name: "Authorization",
                        type: "string",
                        required: true,
                      } as InputField,
                    ];
                    handleUpdate({
                      request: { ...(nodeData as ApiBinding).request, headers },
                    } as Partial<ApiBinding>);
                  }}
                  style={{
                    width: "100%",
                    padding: "6px",
                    background: "transparent",
                    border: "1px dashed var(--border)",
                    borderRadius: 4,
                    color: "var(--muted)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  + Add Header
                </button>
              </>
            )}

            {/* Query Tab */}
            {requestTab === "query" && !isWsProtocol && (
              <>
                {((nodeData as ApiBinding).request?.queryParams || []).map(
                  (field, i) => (
                    <TypeSchemaEditor
                      key={i}
                      field={field}
                      onChange={(updated) => {
                        const queryParams = [
                          ...((nodeData as ApiBinding).request?.queryParams ||
                            []),
                        ];
                        queryParams[i] = updated as InputField;
                        handleUpdate({
                          request: {
                            ...(nodeData as ApiBinding).request,
                            queryParams,
                          },
                        } as Partial<ApiBinding>);
                      }}
                      onRemove={() => {
                        const queryParams = (
                          (nodeData as ApiBinding).request?.queryParams || []
                        ).filter((_, idx) => idx !== i);
                        handleUpdate({
                          request: {
                            ...(nodeData as ApiBinding).request,
                            queryParams,
                          },
                        } as Partial<ApiBinding>);
                      }}
                    />
                  ),
                )}
                <button
                  onClick={() => {
                    const queryParams = [
                      ...((nodeData as ApiBinding).request?.queryParams || []),
                      {
                        name: "page",
                        type: "number",
                        required: false,
                      } as InputField,
                    ];
                    handleUpdate({
                      request: {
                        ...(nodeData as ApiBinding).request,
                        queryParams,
                      },
                    } as Partial<ApiBinding>);
                  }}
                  style={{
                    width: "100%",
                    padding: "6px",
                    background: "transparent",
                    border: "1px dashed var(--border)",
                    borderRadius: 4,
                    color: "var(--muted)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  + Add Query Param
                </button>
              </>
            )}

            {/* Auto-detected Path Params from Route */}
            {(() => {
              const route = (nodeData as ApiBinding).route || "";
              const pathParams = route.match(/:(\w+)/g)?.map(p => p.slice(1)) || [];
              if (pathParams.length === 0) return null;
              return (
                <div style={{ marginTop: 8, padding: 8, background: "var(--background)", borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 6 }}>
                    📍 Path Params (from route):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {pathParams.map(param => (
                      <span key={param} style={{ fontSize: 10, padding: "2px 6px", background: "var(--floating)", borderRadius: 3, color: "#facc15", fontFamily: "monospace" }}>
                        :{param}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
            </div>
          )}

          {/* Response Success Schema */}
          {isRestProtocol && (
            <div style={sectionStyle}>
            <div
              style={{
                ...labelStyle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ color: "#4ade80" }}>Response Schema</span>
              <span style={{ color: "var(--secondary)" }}>
                {(nodeData as ApiBinding).responses?.success?.schema?.length ||
                  0}
              </span>
            </div>
            {((nodeData as ApiBinding).responses?.success?.schema || []).map(
              (field, i) => (
                <TypeSchemaEditor
                  key={i}
                  field={field}
                  onChange={(updated) => {
                    const schema = [
                      ...((nodeData as ApiBinding).responses?.success?.schema ||
                        []),
                    ];
                    schema[i] = updated as OutputField;
                    handleUpdate({
                      responses: {
                        ...(nodeData as ApiBinding).responses,
                        success: {
                          ...(nodeData as ApiBinding).responses?.success,
                          schema,
                        },
                      },
                    } as Partial<ApiBinding>);
                  }}
                  onRemove={() => {
                    const schema = (
                      (nodeData as ApiBinding).responses?.success?.schema || []
                    ).filter((_, idx) => idx !== i);
                    handleUpdate({
                      responses: {
                        ...(nodeData as ApiBinding).responses,
                        success: {
                          ...(nodeData as ApiBinding).responses?.success,
                          schema,
                        },
                      },
                    } as Partial<ApiBinding>);
                  }}
                />
              ),
            )}
            <button
              onClick={() => {
                const schema = [
                  ...((nodeData as ApiBinding).responses?.success?.schema ||
                    []),
                  { name: "field", type: "string" } as OutputField,
                ];
                handleUpdate({
                  responses: {
                    ...(nodeData as ApiBinding).responses,
                    success: {
                      ...(nodeData as ApiBinding).responses?.success,
                      schema,
                    },
                  },
                } as Partial<ApiBinding>);
              }}
              style={{
                width: "100%",
                padding: "6px",
                background: "transparent",
                border: "1px dashed var(--border)",
                borderRadius: 4,
                color: "var(--muted)",
                fontSize: 11,
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              + Add Field
            </button>
            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 8 }}>
              💡 Error responses (400, 404, 500) are auto-generated based on
              validation & database errors
            </div>
            </div>
          )}

          {/* Function Block Reference */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Invokes Function Block</div>
            <input
              type="text"
              value={(nodeData as ApiBinding).processRef}
              onChange={(e) =>
                handleUpdate({
                  processRef: e.target.value,
                } as Partial<ApiBinding>)
              }
              placeholder="createUser"
              style={inputStyle}
            />
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
              Reference to the function block this interface invokes
            </div>
          </div>
        </>
      )}

      {/* Delete Button */}
      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <button
          onClick={() => deleteNode(selectedNode.id)}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid var(--destructive)",
            borderRadius: 4,
            color: "var(--destructive)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Delete Node
        </button>
      </div>
    </aside>
  );
}
