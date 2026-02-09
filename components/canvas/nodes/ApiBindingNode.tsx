import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ApiBinding, InputField, OutputField } from "@/lib/schema/node";

export const ApiBindingNode = memo(({ data, selected }: NodeProps) => {
  const apiData = data as unknown as ApiBinding;

  const methodColors: Record<string, string> = {
    GET: "#60a5fa",
    POST: "#4ade80",
    PUT: "#facc15",
    DELETE: "#ef4444",
    PATCH: "#a78bfa",
  };

  const securityIcons: Record<string, string> = {
    none: "🔓",
    api_key: "🔑",
    bearer: "🎫",
    oauth2: "🔐",
    basic: "👤",
  };

  const hasRequestBody = apiData.request?.body?.schema?.length > 0;
  const hasQueryParams = apiData.request?.queryParams?.length > 0;
  const hasPathParams = apiData.request?.pathParams?.length > 0;

  return (
    <div
      style={{
        background: "var(--panel)",
        borderStyle: "solid",
        borderTopWidth: selected ? 2 : 1,
        borderRightWidth: selected ? 2 : 1,
        borderBottomWidth: selected ? 2 : 1,
        borderLeftWidth: 4,
        borderTopColor: selected ? "var(--primary)" : "var(--border)",
        borderRightColor: selected ? "var(--primary)" : "var(--border)",
        borderBottomColor: selected ? "var(--primary)" : "var(--border)",
        borderLeftColor: methodColors[apiData.method] || "var(--primary)",
        borderRadius: 8,
        minWidth: 280,
        boxShadow: selected
          ? "0 0 0 2px rgba(124, 108, 255, 0.2)"
          : "0 4px 12px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--floating)",
          borderRadius: "4px 8px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔗</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            {apiData.apiType}
          </span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>
            {apiData.version}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>
            {securityIcons[apiData.security?.type || "none"]}
          </span>
          {apiData.deprecated && (
            <span
              style={{
                fontSize: 9,
                padding: "2px 4px",
                background: "#ef4444",
                borderRadius: 3,
                color: "white",
              }}
            >
              DEPRECATED
            </span>
          )}
        </div>
      </div>

      {/* Endpoint */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: methodColors[apiData.method] || "var(--foreground)",
              padding: "2px 6px",
              background: "var(--background)",
              borderRadius: 3,
            }}
          >
            {apiData.method}
          </span>
          <span
            style={{
              fontSize: 13,
              fontFamily: "monospace",
              color: "var(--foreground)",
            }}
          >
            {apiData.route}
          </span>
        </div>
        {apiData.label && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            {apiData.label}
          </div>
        )}
      </div>

      {/* Request Section */}
      {(hasPathParams || hasQueryParams || hasRequestBody) && (
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--muted)",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Request
          </div>

          {hasPathParams && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "#60a5fa" }}>Path: </span>
              {apiData.request.pathParams.map((p: InputField, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    color: "var(--secondary)",
                    marginRight: 6,
                  }}
                >
                  :{p.name}
                </span>
              ))}
            </div>
          )}

          {hasQueryParams && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "#facc15" }}>Query: </span>
              {apiData.request.queryParams.map((q: InputField, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    color: "var(--secondary)",
                    marginRight: 6,
                  }}
                >
                  ?{q.name}
                </span>
              ))}
            </div>
          )}

          {hasRequestBody && (
            <div>
              <span style={{ fontSize: 9, color: "#4ade80" }}>Body: </span>
              {apiData.request.body.schema.map((f: InputField, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    color: "var(--secondary)",
                    marginRight: 6,
                  }}
                >
                  {f.name}: {f.type}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Response Section */}
      {(apiData.responses?.success?.schema?.length > 0 ||
        apiData.responses?.error?.schema?.length > 0) && (
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--muted)",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Response
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div>
              <span style={{ fontSize: 9, color: "#4ade80" }}>
                {apiData.responses.success.statusCode}
              </span>
              {apiData.responses.success.schema.map(
                (f: OutputField, i: number) => (
                  <div
                    key={i}
                    style={{ fontSize: 10, color: "var(--secondary)" }}
                  >
                    {f.name}
                  </div>
                ),
              )}
            </div>

            {apiData.responses.error.schema.length > 0 && (
              <div>
                <span style={{ fontSize: 9, color: "#ef4444" }}>
                  {apiData.responses.error.statusCode}
                </span>
                {apiData.responses.error.schema.map(
                  (f: OutputField, i: number) => (
                    <div
                      key={i}
                      style={{ fontSize: 10, color: "var(--secondary)" }}
                    >
                      {f.name}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rate Limit & Security Info */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          gap: 12,
          fontSize: 10,
        }}
      >
        {apiData.rateLimit?.enabled && (
          <div style={{ color: "var(--muted)" }}>
            ⚡ {apiData.rateLimit.requests}/{apiData.rateLimit.window}
          </div>
        )}
        {apiData.security?.type !== "none" && (
          <div style={{ color: "var(--muted)" }}>
            {securityIcons[apiData.security.type]} {apiData.security.type}
          </div>
        )}
      </div>

      {/* Process Reference */}
      <div
        style={{ padding: "8px 12px", borderTop: "1px solid var(--border)" }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--muted)",
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          Invokes Process
        </div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "monospace",
            color: apiData.processRef ? "#a78bfa" : "var(--muted)",
            padding: "4px 8px",
            background: "var(--background)",
            borderRadius: 4,
          }}
        >
          {apiData.processRef || "(not connected)"}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          background: methodColors[apiData.method] || "var(--muted)",
          border: "2px solid var(--panel)",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          background: "#a78bfa",
          border: "2px solid var(--panel)",
        }}
      />
    </div>
  );
});

ApiBindingNode.displayName = "ApiBindingNode";
