import type { StudioDatabase } from "@/persistence/postgres/database/connection";
import { isSchemaCurrent } from "@/persistence/postgres/database/migrations";

/** `database schema out of date` means migrations are pending; `pnpm cli deps migrate` applies them. */
export type HealthProblem = "database unavailable" | "database schema out of date";

export type HealthReport = { healthy: true } | { healthy: false; problem: HealthProblem };

export interface HealthCheck {
  /** Reports whether the studio can serve requests. Never rejects. */
  check(): Promise<HealthReport>;
}

/** Milliseconds `DefaultHealthCheck` waits on the database queries before failing. */
export const HEALTH_CHECK_TIMEOUT_MS = 500;

export class DefaultHealthCheck implements HealthCheck {
  constructor(
    private readonly db: StudioDatabase,
    private readonly timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS,
  ) {}

  async check(): Promise<HealthReport> {
    try {
      return (await this.withTimeout(isSchemaCurrent(this.db)))
        ? { healthy: true }
        : { healthy: false, problem: "database schema out of date" };
    } catch {
      return { healthy: false, problem: "database unavailable" };
    }
  }

  // Bounded because a Postgres pool waits indefinitely for a free connection: an
  // exhausted pool would hang the check instead of failing it.
  private async withTimeout<T>(work: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`health check timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs,
      );
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
