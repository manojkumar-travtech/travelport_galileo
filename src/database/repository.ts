import sql from "mssql";
import DatabaseConnection from "./connection";
import { logger } from "../utils/logger";

export class ApiResponseRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public async initTable(): Promise<void> {
    try {
      const pool = this.db.getPool();
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='api_responses' AND xtype='U')
        CREATE TABLE api_responses (
          id INT IDENTITY(1,1) PRIMARY KEY,
          api_name NVARCHAR(255) NOT NULL,
          request_body NVARCHAR(MAX),
          response_xml NVARCHAR(MAX) NOT NULL,
          status NVARCHAR(50) DEFAULT 'SUCCESS',
          error_message NVARCHAR(MAX),
          created_at DATETIME DEFAULT GETDATE(),
          INDEX idx_api_name (api_name),
          INDEX idx_created_at (created_at)
        )
      `);
      logger.info("Database table initialized");
    } catch (error: any) {
      logger.error("Failed to initialize table", { error: error.message });
      throw error;
    }
  }

  public async save(
    apiName: string,
    requestBody: string,
    responseXml: string,
    status: string = "SUCCESS",
    errorMessage?: string
  ): Promise<number> {
    try {
      const pool = this.db.getPool();
      const result = await pool
        .request()
        .input("apiName", sql.NVarChar, apiName)
        .input("requestBody", sql.NVarChar, requestBody)
        .input("responseXml", sql.NVarChar, responseXml)
        .input("status", sql.NVarChar, status)
        .input("errorMessage", sql.NVarChar, errorMessage || null).query(`
          INSERT INTO api_responses (api_name, request_body, response_xml, status, error_message)
          OUTPUT INSERTED.id
          VALUES (@apiName, @requestBody, @responseXml, @status, @errorMessage)
        `);

      const id = result.recordset[0].id;
      logger.info(`Saved ${apiName} response to database`, { id });
      return id;
    } catch (error: any) {
      logger.error("Failed to save to database", {
        apiName,
        error: error.message,
      });
      throw error;
    }
  }

  public async getRecent(limit: number = 10): Promise<any[]> {
    try {
      const pool = this.db.getPool();
      const result = await pool.request().input("limit", sql.Int, limit).query(`
          SELECT TOP (@limit) id, api_name, status, created_at 
          FROM api_responses 
          ORDER BY created_at DESC
        `);
      return result.recordset;
    } catch (error: any) {
      logger.error("Failed to fetch records", { error: error.message });
      throw error;
    }
  }

  public async getById(id: number): Promise<any | null> {
    try {
      const pool = this.db.getPool();
      const result = await pool.request().input("id", sql.Int, id).query(`
          SELECT * FROM api_responses WHERE id = @id
        `);
      return result.recordset[0] || null;
    } catch (error: any) {
      logger.error("Failed to fetch record by id", {
        id,
        error: error.message,
      });
      throw error;
    }
  }
}
