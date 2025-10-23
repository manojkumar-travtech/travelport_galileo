import sql from "mssql";
import DatabaseConnection from "../database/connection";
import { getEachProfileDetailsOfTraveller } from "./gwsOfficerProfilesService";
import { chunkArray } from "../utils/createChunks";

interface Officer {
  FileInd: string;
  Title: string;
  XmlResponse?: string;
}

export async function bulkInsertOfficers(jobId: number, officers: Officer[]) {
  if (!officers.length) return;

  const db = DatabaseConnection.getInstance();
  const pool = await db.connect();

  const chunks = chunkArray(officers, 10000);

  for (const batch of chunks) {
    try {
      const table = new sql.Table("gws_officers");
      table.create = false;
      table.columns.add("JobId", sql.Int, { nullable: false });
      table.columns.add("FileInd", sql.NVarChar(50), { nullable: false });
      table.columns.add("Title", sql.NVarChar(512), { nullable: false });
      table.columns.add("XmlResponse", sql.NVarChar(sql.MAX), {
        nullable: true,
      });

      batch.forEach((o) => {
        const fileInd = o.FileInd || "";
        const title = o.Title || "";
        table.rows.add(jobId, fileInd, title, o.XmlResponse || null);
      });

      await pool.request().bulk(table);
    } catch (error) {
      console.error("❌ Failed to bulk insert officers batch:", error);
      // You can decide to continue or throw depending on requirements
      throw error;
    }
  }
}

export async function getOfficersBatchByJob(
  jobId: number,
  offset: number,
  batchSize: number = 10
) {
  const db = DatabaseConnection.getInstance();
  const pool = await db.connect();

  const result = await pool
    .request()
    .input("JobId", sql.Int, jobId)
    .input("Offset", sql.Int, offset)
    .input("BatchSize", sql.Int, batchSize).query(`
      SELECT OfficerId, JobId, FileInd, Title, XmlResponse
      FROM gws_officers
      WHERE JobId = @JobId
      ORDER BY OfficerId
      OFFSET @Offset ROWS
      FETCH NEXT @BatchSize ROWS ONLY
    `);

  return result.recordset;
}

export async function processOfficerProfilesByJob(
  jobId: number,
  token: string
) {
  const batchSize = 10;
  let offset = 0;
  let batch: any[] = [];

  do {
    batch = await getOfficersBatchByJob(jobId, offset, batchSize);

    if (batch.length === 0) break;

    for (const officer of batch) {
      try {
        await getEachProfileDetailsOfTraveller(token, officer);
      } catch (err) {
        console.error(`Failed for officer ${officer.Title}:`, err);
      }
    }

    console.log(`✅ Processed batch starting at offset ${offset}`);
    offset += batchSize;
  } while (batch.length === batchSize);

  console.log(`✅ Finished processing all officers for JobId: ${jobId}`);
}

