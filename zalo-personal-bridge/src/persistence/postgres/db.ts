import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  getPool(): pg.Pool {
    return this.pool;
  }

  async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async runMigrations(): Promise<void> {
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const ddl = await fs.promises.readFile(migrationPath, 'utf8');
    await this.pool.query(ddl);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
