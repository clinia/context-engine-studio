import { err, errorMessage, ok, type Result } from "@/lib/result";

/** Wraps an openapi-fetch `{ data, error }` response into a {@link Result}. */
export function toResult<T>(data: T | undefined, error: unknown): Result<T> {
  if (error) return err(errorMessage(error));
  if (data === undefined) return err("No data returned from the Context Engine API.");
  return ok(data);
}
