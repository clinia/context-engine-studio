import "server-only";

import { createStudioModels, type StudioModels } from "@/core/ai";
import { configFromEnv, env, type Config } from "@/core/config";
import { DefaultHealthCheck, type HealthCheck } from "@/core/health/health-check";
import { CliniaError } from "@clinia/errorx";
import { LocalRequestScopeResolver, type RequestScopeResolver } from "@/core/request-scope";
import { createContextEngineMcp, type ContextEngineMcp } from "@/lib/context-engine-client/mcp";
import type { Repositories } from "@/persistence";
import { PgChatRepository } from "@/persistence/postgres/pg-chat-repository";
import { openDatabase, type DatabaseConnection } from "@/persistence/postgres/database/connection";
import {
  ContextEngineClient,
  createClientCredentialsTokenProvider,
} from "@clinia/context-engine-js";
import type { Driver } from "./driver";

export class DefaultDriver implements Driver {
  private readonly requestScopeResolver: RequestScopeResolver = new LocalRequestScopeResolver();
  private readonly contextEngineClient: ContextEngineClient;
  private readonly contextEngineMcp: ContextEngineMcp;
  private readonly repositories: Repositories;
  private readonly healthCheck: HealthCheck;
  private readonly database: DatabaseConnection;
  private closePromise?: Promise<void>;
  private startPromise?: Promise<void>;
  private models?: StudioModels;

  constructor(private readonly config: Config) {
    const { apiUrl, credentials } = config.contextEngine;
    // One provider for the REST client and the MCP transport, so they share its token cache.
    const tokenProvider = credentials && createClientCredentialsTokenProvider(credentials);
    this.contextEngineClient = new ContextEngineClient({ baseUrl: apiUrl, auth: tokenProvider });
    this.contextEngineMcp = createContextEngineMcp(apiUrl, tokenProvider);
    this.database = openDatabase(config.database);
    this.repositories = { chats: new PgChatRepository(this.database.db) };
    this.healthCheck = new DefaultHealthCheck(this.database.db);
  }

  getConfig(): Config {
    return this.config;
  }

  getRequestScopeResolver(): RequestScopeResolver {
    return this.requestScopeResolver;
  }

  getRepositories(): Repositories {
    return this.repositories;
  }

  getContextEngineClient(): ContextEngineClient {
    return this.contextEngineClient;
  }

  getContextEngineMcp(): ContextEngineMcp {
    return this.contextEngineMcp;
  }

  getHealthCheck(): HealthCheck {
    return this.healthCheck;
  }

  getModels(): StudioModels {
    if (!this.models) {
      throw new CliniaError(
        "FAILED_PRECONDITION",
        "Driver not started: models are built by start()",
      );
    }
    return this.models;
  }

  start(): Promise<void> {
    return (this.startPromise ??= this.buildModels());
  }

  private async buildModels(): Promise<void> {
    this.models = await createStudioModels(this.config.ai);
  }

  close(): Promise<void> {
    return (this.closePromise ??= this.database.close());
  }
}

// Cached on globalThis so Next's dev hot reload reuses one driver and its connection.
const globalForDriver = globalThis as unknown as { studioDriver?: Driver };

/** The process-wide driver, created on first call. */
export function getDriver(): Driver {
  globalForDriver.studioDriver ??= new DefaultDriver(configFromEnv(env));
  return globalForDriver.studioDriver;
}
