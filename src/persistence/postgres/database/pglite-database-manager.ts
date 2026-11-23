import type { DatabaseManager } from "@clinia/database-manager";
import type { LoggerAdapter } from "@clinia/observability/server";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import fs from "node:fs";
import path from "node:path";
import { openPglite } from "./connection";
import { MIGRATIONS_DIR } from "./migrations";

/**
 * Manages an embedded PGlite database in `dataDir`.
 * - Run it while no other process has the data directory open.
 * - `force` is accepted for parity with Postgres and has no effect.
 */
export class PgliteDatabaseManager implements DatabaseManager {
  private readonly dataDir: string;
  private readonly logger: LoggerAdapter;
  private readonly migrationsFolder: string;

  constructor({
    dataDir,
    logger,
    migrationsFolder = MIGRATIONS_DIR,
  }: {
    dataDir: string;
    logger: LoggerAdapter;
    migrationsFolder?: string;
  }) {
    this.dataDir = dataDir;
    this.logger = logger.child({ "db.data_dir": dataDir });
    this.migrationsFolder = migrationsFolder;
  }

  /** @throws when a database already exists in the data directory. */
  async createDatabase(): Promise<void> {
    if (this.exists()) throw new Error(`a database already exists in ${this.dataDir}`);
    this.logger.info("creating database");
    await using connection = openPglite(this.dataDir);
    await connection.db.execute(sql`select 1`);
  }

  async ensureDatabase(): Promise<void> {
    if (!this.exists()) await this.createDatabase();
  }

  async dropDatabase(): Promise<void> {
    this.logger.info("dropping database");
    await fs.promises.rm(this.dataDir, { recursive: true, force: true });
  }

  async migrate(): Promise<void> {
    this.logger.info("applying migration chain", { "db.migrations_folder": this.migrationsFolder });
    await using connection = openPglite(this.dataDir);
    await migrate(connection.db, { migrationsFolder: this.migrationsFolder });
  }

  async setup(): Promise<void> {
    await this.createDatabase();
    await this.migrate();
  }

  async reset(): Promise<void> {
    await this.dropDatabase();
    await this.setup();
  }

  private exists(): boolean {
    return fs.existsSync(path.join(this.dataDir, "PG_VERSION"));
  }
}
