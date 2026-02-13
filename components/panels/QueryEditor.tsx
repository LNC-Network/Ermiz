"use client";

import React, { useMemo, useState } from "react";
import {
  DatabaseBlock,
  DatabaseQuery,
  DatabaseQueryOperation,
} from "@/lib/schema/node";

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

const getGeneratedCode = (
  dbType: DatabaseBlock["dbType"],
  query: Pick<DatabaseQuery, "operation" | "target" | "conditions">,
): string => {
  const target = query.target || "table_name";
  const condition = query.conditions.trim();
  const sqlWhere = condition ? ` WHERE ${condition}` : "";
  const mongoCondition = condition || "{}";

  if (dbType === "nosql") {
    if (query.operation === "SELECT") return `db.${target}.find(${mongoCondition})`;
    if (query.operation === "INSERT") return `db.${target}.insertOne({ ...document })`;
    if (query.operation === "UPDATE") {
      return `db.${target}.updateMany(${mongoCondition}, { $set: { ...updates } })`;
    }
    return `db.${target}.deleteMany(${mongoCondition})`;
  }

  if (query.operation === "SELECT") return `SELECT * FROM ${target}${sqlWhere};`;
  if (query.operation === "INSERT") return `INSERT INTO ${target} (...) VALUES (...);`;
  if (query.operation === "UPDATE") return `UPDATE ${target} SET ...${sqlWhere};`;
  return `DELETE FROM ${target}${sqlWhere};`;
};

type QueryEditorProps = {
  database: DatabaseBlock;
  onChange: (queries: DatabaseQuery[]) => void;
};

export function QueryEditor({ database, onChange }: QueryEditorProps) {
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const queries = database.queries || [];
  const targetOptions = useMemo(
    () =>
      (database.schemas || []).length > 0
        ? database.schemas
        : (database.tables || []).map((table) => table.name),
    [database.schemas, database.tables],
  );

  const updateQuery = (
    queryId: string,
    updates: Partial<Omit<DatabaseQuery, "id">>,
  ) => {
    const next = queries.map((query) => {
      if (query.id !== queryId) return query;
      const merged = { ...query, ...updates };
      return {
        ...merged,
        generatedCode: getGeneratedCode(database.dbType, merged),
      };
    });
    onChange(next);
  };

  const addQuery = () => {
    const id = `query_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const target = targetOptions[0] || "";
    const query: DatabaseQuery = {
      id,
      name: `Query ${queries.length + 1}`,
      operation: "SELECT",
      target,
      conditions: "",
      generatedCode: getGeneratedCode(database.dbType, {
        operation: "SELECT",
        target,
        conditions: "",
      }),
    };
    onChange([...queries, query]);
    setExpandedById((prev) => ({ ...prev, [id]: true }));
  };

  const removeQuery = (queryId: string) => {
    onChange(queries.filter((query) => query.id !== queryId));
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
          Queries
        </div>
        <button
          type="button"
          onClick={addQuery}
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
          + Query
        </button>
      </div>

      {queries.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--muted)" }}>No queries yet.</div>
      )}

      {queries.map((query) => {
        const isExpanded = expandedById[query.id] ?? false;
        return (
          <div
            key={query.id}
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
                  setExpandedById((prev) => ({ ...prev, [query.id]: !isExpanded }))
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
              <span style={{ fontSize: 12, color: "var(--foreground)", minWidth: 0 }}>
                {query.name}
              </span>
              <button
                type="button"
                onClick={() => removeQuery(query.id)}
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
                Remove
              </button>
            </div>

            {isExpanded && (
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: 8,
                  display: "grid",
                  gap: 8,
                }}
              >
                <input
                  value={query.name}
                  onChange={(e) => updateQuery(query.id, { name: e.target.value })}
                  placeholder="Query name"
                  style={inputStyle}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <select
                    value={query.operation}
                    onChange={(e) =>
                      updateQuery(query.id, {
                        operation: e.target.value as DatabaseQueryOperation,
                      })
                    }
                    style={selectStyle}
                  >
                    <option value="SELECT">SELECT</option>
                    <option value="INSERT">INSERT</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <select
                    value={query.target}
                    onChange={(e) => updateQuery(query.id, { target: e.target.value })}
                    style={selectStyle}
                  >
                    {targetOptions.length === 0 ? (
                      <option value="">No tables</option>
                    ) : (
                      targetOptions.map((schema) => (
                        <option key={schema} value={schema}>
                          {schema}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <input
                  value={query.conditions}
                  onChange={(e) => updateQuery(query.id, { conditions: e.target.value })}
                  placeholder={
                    database.dbType === "nosql"
                      ? "{ active: true }"
                      : "id = 1 AND status = 'active'"
                  }
                  style={inputStyle}
                />

                <div
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--panel)",
                    borderRadius: 4,
                    padding: 8,
                    fontSize: 11,
                    color: "var(--secondary)",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {query.generatedCode || getGeneratedCode(database.dbType, query)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

