/**
 * Generic collapsible rollup built on native <details>/<summary> — keyboard
 * accessible and "view or hide" by default. Used for the per-stage notation
 * panel and anywhere a block of detail should be optional.
 */
import type { ReactNode } from "react";

export function Rollup({
  summary,
  children,
  defaultOpen = false,
  className = "",
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details className={`rollup ${className}`} open={defaultOpen}>
      <summary className="rollup-summary">{summary}</summary>
      <div className="rollup-body">{children}</div>
    </details>
  );
}
