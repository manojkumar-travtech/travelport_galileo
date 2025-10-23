import sql, { ConnectionPool } from "mssql";
import { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD } from "../utils/envConfig";

const config: sql.config = {
  user: DB_USER || "sa",
  password: DB_PASSWORD || "",
  database: DB_NAME || "UserManagement",
  server: DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "1433"),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: process.env.NODE_ENV === "production",
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  requestTimeout: 30000,
  connectionTimeout: 30000,
};

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: ConnectionPool | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<ConnectionPool> {
    if (!this.pool) {
      this.pool = new sql.ConnectionPool(config);
      await this.pool.connect();
    }
    return this.pool;
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  public getPool(): ConnectionPool {
    if (!this.pool) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.pool;
  }
}

export default DatabaseConnection;
