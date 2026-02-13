"use client";

import React, { useState } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import {
  NodeData,
  ProcessDefinition,
  DatabaseBlock,
  QueueBlock,
  InfraBlock,
  InfraResourceType,
  ApiBinding,
  InputField,
  OutputField,
} from "@/lib/schema/node";
import { TypeSchemaEditor } from "./TypeSchemaEditor";

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
