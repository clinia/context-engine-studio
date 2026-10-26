"use client";

import { useTranslations } from "next-intl";

import type { MedicationIdentity } from "@/lib/context-engine-client/graph-payloads";

function codingNames(codings: readonly { code: string; display?: string }[]): string[] {
  return codings.map(({ code, display }) => display ?? code);
}

/**
 * Returns a function that writes a medication identity as one line, e.g.
 * "metformin + sitagliptin · oral".
 *
 * - `other` lists its dose forms: "lidocaine · other (Medicated Patch)".
 * - A missing identity, ingredient list or route reads as a dash.
 * - A route with no message is shown as is.
 */
export function useFormatIdentity(): (identity: MedicationIdentity | undefined) => string {
  const t = useTranslations("resolution.evidence");

  return (identity) => {
    if (!identity) return "—";
    const { ingredients, route, doseForms = [] } = identity;
    const names = codingNames(ingredients).join(" + ") || "—";
    const routeText =
      route === undefined
        ? "—"
        : route === "other" && doseForms.length > 0
          ? t("routeOther", { forms: codingNames(doseForms).join(", ") })
          : t.has(`route.${route}`)
            ? t(`route.${route}`)
            : route;
    return t("identityLine", { ingredients: names, route: routeText });
  };
}
