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
  console.log('Job Started')
  const db = DatabaseConnection.getInstance();
  const pool = await db.connect();

  const jobId = await createJob(pool, initialToken);

  try {
    let officers: any[] = [];
    let token = initialToken;
    let firstCall = true;
    let hasMore = true;
    let iteration: number = 0;
    const BATCH_SIZE = 500;
    let totalCount = 0;

    while (hasMore) {
      const soapXml = firstCall
        ? makeFirstDataSoapEnvelope(token)
        : makeMoreDataEnvelope(token);
      const xmlResponse = await sendSoapRequest(soapXml);
      const parsedData = await parseTravelportGwsOfficersXmlToJson(xmlResponse);

      officers.push(...parsedData);

      if (officers.length >= BATCH_SIZE) {
        await bulkInsertOfficers(pool,jobId, officers);
        totalCount += officers.length;
        officers = [];
        global.gc?.();
      }

      const hasMoreData =
        xmlResponse.includes("<MoreData>") ||
        xmlResponse.includes("<MoreData />");
      if (hasMoreData) {
        iteration += 1;
        firstCall = false;
      } else {
        hasMore = false;
      }
    }
    if (officers.length > 0) {
      await bulkInsertOfficers(pool, jobId, officers);
      totalCount += officers.length;
    }
    await updateJobStatus(pool, jobId, "Processing");
    await processOfficerProfilesByJob(pool,jobId,token);
    await updateJobStatus(pool, jobId, "Completed", officers.length);

    return "Job Finished Successfully";
  } catch (error: any) {
    const err = error.response?.data || error.message;
    await updateJobStatus(pool, jobId, "Failed", 0, err);

    throw error;
  }
};
