import { ConnectionPool } from "mssql";
import {
  makeFirstDataSoapEnvelope,
  makeMoreDataEnvelope,
} from "../helpers/createProfileSoapEnvelope";
import { parseTravelportGwsOfficersXmlToJson } from "../helpers/parseTravelportXmlToExcel";
import { sendSoapRequest } from "../helpers/sendSoapRequest";
import { createJob, updateJobStatus } from "./gwsJobsService";
import {
  bulkInsertOfficers,
  processOfficerProfilesByJob,
} from "./gwsOfficersService";
import DatabaseConnection from "../database/connection";
export const runGwsJob = async (initialToken: string) => {
  console.log(`[Job] 🚀 Job Started at ${new Date().toISOString()}`);
  const db = DatabaseConnection.getInstance();
  const pool = await db.connect();
  console.log("[DB] Connected to database");

  const jobId = await createJob(pool, initialToken);
  console.log(`[Job] Created Job with ID: ${jobId}`);

  try {
    let officers: any[] = [];
    let token: string = initialToken;
    let firstCall: boolean = true;
    let hasMore: boolean = true;
    let iteration: number = 0;
    const BATCH_SIZE: number = 500;
    let totalCount: number = 0;

    while (hasMore) {
      console.log(
        `[Iteration ${iteration}] Preparing SOAP request. First call: ${firstCall}`
      );
      const soapXml = firstCall
        ? makeFirstDataSoapEnvelope(token)
        : makeMoreDataEnvelope(token);

      console.log(`[Iteration ${iteration}] Sending SOAP request...`);
      const xmlResponse = await sendSoapRequest(soapXml);
      console.log(`[Iteration ${iteration}] SOAP response received`);

      const parsedData = await parseTravelportGwsOfficersXmlToJson(xmlResponse);
      console.log(
        `[Iteration ${iteration}] Parsed ${parsedData.length} officers from response`
      );

      officers.push(...parsedData);

      if (officers.length >= BATCH_SIZE) {
        console.log(
          `[Iteration ${iteration}] Batch size reached. Inserting ${officers.length} officers into DB...`
        );
        await bulkInsertOfficers(pool, jobId, officers);
        totalCount += officers.length;
        officers = [];
        console.log(
          `[Iteration ${iteration}] Batch inserted. Total inserted so far: ${totalCount}`
        );
        global.gc?.();
      }

      const hasMoreData =
        xmlResponse.includes("<MoreData>") ||
        xmlResponse.includes("<MoreData />");
      console.log(`[Iteration ${iteration}] Has more data? ${hasMoreData}`);

      if (hasMoreData) {
        iteration += 1;
        firstCall = false;
      } else {
        hasMore = false;
      }
    }

    if (officers.length > 0) {
      console.log(
        `[Final Batch] Inserting remaining ${officers.length} officers into DB...`
      );
      await bulkInsertOfficers(pool, jobId, officers);
      totalCount += officers.length;
      console.log(`[Final Batch] Total officers inserted: ${totalCount}`);
    }

    console.log(`[Job] Updating job status to 'Processing'`);
    await updateJobStatus(pool, jobId, "Processing", totalCount);

    console.log(`[Job] Processing officer profiles for job ${jobId}`);
    await processOfficerProfilesByJob(pool, jobId, token);

    console.log(`[Job] Updating job status to 'Completed'`);
    await updateJobStatus(pool, jobId, "Completed", totalCount);

    console.log(
      `[Job] ✅ Job Finished Successfully at ${new Date().toISOString()}`
    );
    return "Job Finished Successfully";
  } catch (error: any) {
    const err = error.response?.data || error.message;
    console.error(`[Job] ❌ Job Failed: ${err}`);
    await updateJobStatus(pool, jobId, "Failed", 0, err);

    throw error;
  }
};
