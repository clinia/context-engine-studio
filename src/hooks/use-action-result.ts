"use client";

import * as React from "react";

import { attempt, type Result } from "@/lib/result";

export type ActionState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: T }
  | { status: "error"; error: string };

/**
 * Runs a {@link Result}-returning server action and tracks its state. Re-runs whenever
 * `load` changes identity, so memoize it on its inputs; a response from a superseded run
 * is dropped. `null` means there is nothing to load yet, and reads as `idle`.
 */
export function useActionResult<T>(load: (() => Promise<Result<T>>) | null): ActionState<T> {
  const [state, setState] = React.useState<ActionState<T>>(
    load ? { status: "loading" } : { status: "idle" },
  );

  React.useEffect(() => {
    if (!load) {
      setState({ status: "idle" });
      return;
    }
    const signal = { cancelled: false };
    setState({ status: "loading" });

    void attempt(load()).then((result) => {
      if (signal.cancelled) return;
      setState(
        result.ok
          ? { status: "loaded", data: result.data }
          : { status: "error", error: result.error },
      );
    });

    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  return state;
}
