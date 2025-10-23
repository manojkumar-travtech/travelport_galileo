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

export const runGwsJob = async (initialToken: string) => {
  const jobId = await createJob(initialToken);

  try {
    let officers: any[] = [];
    let token = initialToken;
    let firstCall = true;
    let hasMore = true;
    let iteration: number = 0;
    while (hasMore) {
      const soapXml = firstCall
        ? makeFirstDataSoapEnvelope(token)
        : makeMoreDataEnvelope(token);
      const xmlResponse = await sendSoapRequest(soapXml);
      const parsedData = await parseTravelportGwsOfficersXmlToJson(xmlResponse);

      officers.push(...parsedData);
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
    await bulkInsertOfficers(jobId, officers);
    await updateJobStatus(jobId, "Completed", officers.length);
    await processOfficerProfilesByJob(jobId, token);

    return "Job Finished Successfully";
  } catch (error: any) {
    const err = error.response?.data || error.message;
    await updateJobStatus(jobId, "Completed", 0, err);

    throw error;
  }
};
