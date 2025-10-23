import sql, { ConnectionPool } from "mssql";

export async function createJob( pool : ConnectionPool,token: string): Promise<number> {
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
  pool : ConnectionPool,
  jobId: number,
  status: "Completed" | "Failed" | "Processing",
  totalRecords?: number,
  errorMessage?: string,
): Promise<void> {
 
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
