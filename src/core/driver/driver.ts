import type { StudioModels } from "@/core/ai";
import type { Config } from "@/core/config";
import type { HealthCheck } from "@/core/health/health-check";
import type { RequestScopeResolver } from "@/core/request-scope";
import type { ContextEngineMcp } from "@/lib/context-engine-client/mcp";
import type { Repositories } from "@/persistence";
import type { ContextEngineClient } from "@clinia/context-engine-js";

/** The studio process's state and external dependencies. */
export interface Driver {
  getConfig(): Config;
  getRequestScopeResolver(): RequestScopeResolver;
  getRepositories(): Repositories;
  getContextEngineClient(): ContextEngineClient;
  getContextEngineMcp(): ContextEngineMcp;
  getHealthCheck(): HealthCheck;
  /** @throws CliniaError `FAILED_PRECONDITION` before {@link start} resolves. */
  getModels(): StudioModels;
  /** Builds the models; rejects on an invalid `ai` config. Idempotent. */
  start(): Promise<void>;
  /** Closes the database. Idempotent. */
  close(): Promise<void>;
}
