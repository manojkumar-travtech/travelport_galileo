import sql, { ConnectionPool } from "mssql";
import {
  bulkInsertOfficerProfiles,
  getGwsProfileDetails,
} from "./gwsOfficerProfilesService";
import pLimit from "p-limit";

interface Officer {
  FileInd: string;
  Title: string;
  XmlResponse?: string;
}

export async function bulkInsertOfficers(
  pool: ConnectionPool,
  jobId: number,
  officers: Officer[]
) {
  if (!officers.length) return;

  try {
    const table = new sql.Table("gws_officers");
    table.create = false;

    table.columns.add("JobId", sql.Int, { nullable: false });
    table.columns.add("FileInd", sql.NVarChar(50), { nullable: false });
    table.columns.add("Title", sql.NVarChar(512), { nullable: false });
    table.columns.add("XmlResponse", sql.NVarChar(sql.MAX), { nullable: true });

    for (const o of officers) {
      table.rows.add(
        jobId,
        o.FileInd || "",
        o.Title || "",
        o.XmlResponse || null
      );
    }

    await pool.request().bulk(table);
  } catch (error) {
    console.error("❌ Failed to bulk insert officers:", error);
    throw error;
  }
}

export async function getOfficersBatchByJob(
  jobId: number,
  offset: number,
  batchSize: number = 10,
  pool: ConnectionPool
) {
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
  pool: ConnectionPool,
  jobId: number,
  token: string
) {
  const batchSize = 100;
  const concurrencyLimit = 1;
  const limit = pLimit(concurrencyLimit);

  let offset = 0;

  while (true) {
    const batch = await getOfficersBatchByJob(jobId, offset, batchSize, pool);
    if (batch.length === 0) break;

    console.log(`📦 Processing batch starting at offset ${offset}`);

    // ✅ Run SOAP calls concurrently
    const profileResults = await Promise.allSettled(
      batch.map((officer) => limit(() => getGwsProfileDetails(token, officer)))
    );

    // ✅ Collect successful and failed profiles
    const profilesToInsert = profileResults.map((res, i) => {
      const officer = batch[i];
      if (res.status === "fulfilled") {
        return {
          OfficerId: officer.OfficerId,
          RequestPayload: res.value.RequestPayload,
          ResponsePayload: res.value.ResponsePayload,
          ErrorMessage: null,
        };
      } else {
        const errMsg = res.reason?.message || String(res.reason);
        return {
          OfficerId: officer.OfficerId,
          RequestPayload: res.reason?.RequestPayload || null,
          ResponsePayload: null,
          ErrorMessage: errMsg,
        };
      }
    });

    // ✅ Bulk insert profiles once per batch
    await bulkInsertOfficerProfiles(pool, profilesToInsert);

    offset += batchSize;
  }

  console.log(`✅ Finished processing all officers for JobId: ${jobId}`);
}
