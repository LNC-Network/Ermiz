import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface BaseNodeProps {
  selected?: boolean;
  type: string;
  label: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function BaseNode({
  selected,
  type,
  label,
  children,
  footer,
  className,
}: BaseNodeProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "w-64 rounded-lg bg-[var(--panel)] border transition-all duration-200",
          selected
            ? "border-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]"
            : "border-[var(--floating)] hover:border-[var(--muted)]",
          className,
        ),
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--floating)] flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
        <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-wider">
          {type}
        </span>
        <span className="text-sm font-semibold truncate text-[var(--foreground)] w-2/3 text-right">
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 text-sm text-[var(--secondary)]">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-3 py-1.5 border-t border-[var(--floating)] bg-[rgba(0,0,0,0.2)] text-[10px] text-[var(--muted)] rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
}
