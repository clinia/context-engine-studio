/**
 * A success-or-error value that callers branch on, instead of throwing.
 *
 * Server actions return this so the UI can handle failures with plain logic
 * rather than try/catch.
 */
export type Result<T, E = string> = { ok: true; data: T } | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Extracts a human-readable message from an unknown error value. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return typeof error === "string" ? error : JSON.stringify(error);
}

/**
 * Awaits a {@link Result}-returning promise (e.g. a server action), converting a
 * thrown rejection — such as a Next.js Server Action body-size error or a network
 * failure that rejects before the action body runs — into an error result, so
 * callers can branch on `Result` without a try/catch.
 */
export async function attempt<T>(promise: Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await promise;
  } catch (error) {
    return err(errorMessage(error));
  }
}
