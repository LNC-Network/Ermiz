"use client";

import React, { useState } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import {
  NodeData,
  ProcessDefinition,
  DatabaseBlock,
  QueueBlock,
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

export function PropertyInspector({ width = 320 }: { width?: number }) {
  const {
    nodes,
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
            <select
              value={(nodeData as ProcessDefinition).processType}
              onChange={(e) =>
                handleUpdate({
                  processType: e.target.value,
                } as Partial<ProcessDefinition>)
              }
              style={selectStyle}
            >
              <option value="calculation">Calculation</option>
              <option value="database_workflow">Database Workflow</option>
              <option value="queue_consumer">Queue Consumer</option>
              <option value="job">Job</option>
              <option value="orchestrated_workflow">
                Orchestrated Workflow
              </option>
            </select>
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
              Steps are defined in the visual graph
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

      {/* API Binding-specific fields */}
      {kind === "api_binding" && (
        <>
          {/* API Type */}
          <div style={sectionStyle}>
            <div style={labelStyle}>API Type</div>
            <select
              value={(nodeData as ApiBinding).apiType}
              onChange={(e) =>
                handleUpdate({ apiType: e.target.value } as Partial<ApiBinding>)
              }
              style={selectStyle}
            >
              <option value="openapi">OpenAPI (REST)</option>
              <option value="asyncapi">AsyncAPI (Events)</option>
            </select>
          </div>

          {/* HTTP Method & Route */}
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
                value={(nodeData as ApiBinding).route}
                onChange={(e) =>
                  handleUpdate({ route: e.target.value } as Partial<ApiBinding>)
                }
                placeholder="/api/resource"
                style={inputStyle}
              />
            </div>
          </div>

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

          {/* Rate Limiting */}
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

          {/* Request Schema Tabs */}
          <div style={sectionStyle}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Request</div>

            {/* Tab Buttons */}
            <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
              {(["body", "headers", "query"] as const).map((tab) => {
                const showBody = ["POST", "PUT", "PATCH"].includes(
                  (nodeData as ApiBinding).method,
                );
                if (tab === "body" && !showBody) return null;

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
              ["POST", "PUT", "PATCH"].includes(
                (nodeData as ApiBinding).method,
              ) && (
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
            {requestTab === "query" && (
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

          {/* Response Success Schema */}
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

          {/* Process Reference */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Invokes Process</div>
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
              Reference to the process this API invokes
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
