import type { DynamicToolUIPart } from "ai";

const MAX_RESULT_CHARS = 320;

export type ToolStatus = "running" | "done" | "error";

/** Coarse lifecycle status of a tool call, for status dots / labels. */
export function toolStatus(part: DynamicToolUIPart): ToolStatus {
  if (part.state === "output-available") return "done";
  if (part.state === "output-error") return "error";
  return "running";
}

/** Tailwind background class for a status dot, keyed by {@link toolStatus}. */
export const STATUS_DOT: Record<ToolStatus, string> = {
  running: "bg-amber-500",
  done: "bg-emerald-500",
  error: "bg-destructive",
};

/** Renders a tool call's arguments as `key="value", …`, guarding non-object input. */
export function formatArgs(input: unknown): string {
  if (typeof input !== "object" || input === null) return "";
  return Object.entries(input as Record<string, unknown>)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(", ");
}

/** Pretty-prints any tool input/output value for the detail drawer. */
export function formatJson(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Coerces a tool result to a single, truncated string for compact previews. */
export function formatResultPreview(output: unknown): string {
  const text = typeof output === "string" ? output : JSON.stringify(output);
  if (text.length <= MAX_RESULT_CHARS) return text;
  return `${text.slice(0, MAX_RESULT_CHARS)}…`;
}
