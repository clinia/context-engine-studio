/** A 0–1 score as a whole percentage. */
export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** A field value as one line of text: strings as written, `null` as a dash, anything else as JSON. */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}
