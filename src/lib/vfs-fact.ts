import type { FactNodeType } from "@/lib/context-engine-client/actions";

/** VFS sections whose entries are facts, with the depth of the fact's own segment. */
const FACT_SECTIONS: Record<string, { type: FactNodeType; depth: number }> = {
  conditions: { type: "condition", depth: 2 },
  medications: { type: "medication", depth: 2 },
  allergies: { type: "allergy", depth: 1 },
  family_history: { type: "family_history", depth: 1 },
  social_history: { type: "social_history", depth: 1 },
};

export type VfsFactRef = { type: FactNodeType; slug: string };

/**
 * A fact's VFS file name: its display as a slug, cut to 50 characters, then the last eight
 * alphanumerics of its id (`type_2_diabetes_k3j9x0aa`). Must match the server's tree.
 */
export function factSlug(display: string, id: string): string {
  const name = display
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
  const suffix = id
    .replace(/[^a-z0-9]/gi, "")
    .slice(-8)
    .toLowerCase();
  return name ? `${name}_${suffix}` : suffix;
}

/**
 * The fact a VFS path names. Null for paths outside a fact section, and for a condition's
 * narratives, which are not the fact.
 */
export function vfsFactRef(path: string): VfsFactRef | null {
  const [section, ...rest] = path.split("/").filter(Boolean);
  const entry = section ? FACT_SECTIONS[section] : undefined;
  if (!entry) return null;
  if (section === "conditions" && rest[2] === "_narratives") return null;

  const slug = rest[entry.depth - 1]?.replace(/\.md$/, "");
  return slug ? { type: entry.type, slug } : null;
}
