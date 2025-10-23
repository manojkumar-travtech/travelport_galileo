import sql from "mssql";
import DatabaseConnection from "../database/connection";

export async function createJob(token: string): Promise<number> {
  const db = DatabaseConnection.getInstance();
  const pool = await db.connect();
  const result = await pool
    .request()
    .input("Token", sql.NVarChar, token)
    .input("Status", sql.NVarChar, "InProgress").query(`
      INSERT INTO gwsJobs (Token, Status)
      OUTPUT INSERTED.JobId
      VALUES (@Token, @Status)
    `);
  return result.recordset[0].JobId;
}

export async function updateJobStatus(
  jobId: number,
  status: "Completed" | "Failed",
  totalRecords?: number,
  errorMessage?: string
): Promise<void> {
  const db = DatabaseConnection.getInstance();
  const pool = await db.connect();

  await pool
    .request()
    .input("JobId", sql.Int, jobId)
    .input("Status", sql.NVarChar, status)
    .input("TotalRecords", sql.Int, totalRecords || 0)
    .input("ErrorMessage", sql.NVarChar(sql.MAX), errorMessage || null).query(`
      UPDATE gwsJobs
      SET Status=@Status, TotalRecords=@TotalRecords, ErrorMessage=@ErrorMessage
      WHERE JobId=@JobId
    `);
}
