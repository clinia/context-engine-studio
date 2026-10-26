"use client";

import { useTranslations } from "next-intl";

import type { Verdict } from "@/lib/context-engine-client/graph-payloads";

/**
 * Returns a function that says in one sentence why a stop rule reached its verdict.
 * Rules that score a similarity read differently per verdict; an unknown rule is named as is.
 */
export function useExplainRule(): (ruleId: string, verdict: Verdict) => string {
  const t = useTranslations("resolution.rule");

  return (ruleId, verdict) => {
    if (t.has(`${ruleId}.${verdict}`)) return t(`${ruleId}.${verdict}`);
    if (t.has(ruleId)) return t(ruleId);
    return t("fallback", { rule: ruleId });
  };
}
