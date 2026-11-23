import { getDriver } from "@/core/driver";

/**
 * Readiness probe: 200 `ok` once the database is reachable and fully migrated, 503 with the
 * problem otherwise.
 */
// eslint-disable-next-line no-restricted-syntax -- probes carry no tenant or user to scope to
export async function GET(): Promise<Response> {
  const report = await getDriver().getHealthCheck().check();
  return report.healthy ? new Response("ok") : new Response(report.problem, { status: 503 });
}
