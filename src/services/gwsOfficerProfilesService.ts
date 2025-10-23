// src/services/gwsOfficerProfilesService.ts
import sql, { ConnectionPool } from "mssql";
import DatabaseConnection from "../database/connection";
import { getProfileDetailsOfEachTravellerSoapEnvelope } from "../helpers/createProfileSoapEnvelope";
import { sendSoapRequest } from "../helpers/sendSoapRequest";
import { mergeClientFileNodes } from "../helpers/parseTravelportXmlToExcel";

interface OfficerProfile {
  OfficerId: number;
  RequestPayload?: string | null;
  ResponsePayload?: string | null;
  ErrorMessage?: string | null;
}

export async function insertOfficerProfile(profile: OfficerProfile) {
  const db = DatabaseConnection.getInstance();
  const pool = await db.connect();

  const result = await pool
    .request()
    .input("OfficerId", sql.Int, profile.OfficerId)
    .input(
      "RequestPayload",
      sql.NVarChar(sql.MAX),
      profile.RequestPayload || null
    )
    .input(
      "ResponsePayload",
      sql.NVarChar(sql.MAX),
      profile.ResponsePayload || null
    )
    .input("ErrorMessage", sql.NVarChar(sql.MAX), profile.ErrorMessage || null)
    .query(`
      INSERT INTO gws_officer_profiles (OfficerId, RequestPayload, ResponsePayload, ErrorMessage)
      OUTPUT INSERTED.OfficerProfileId
      VALUES (@OfficerId, @RequestPayload, @ResponsePayload, @ErrorMessage)
    `);

  return result.recordset[0].OfficerProfileId;
}

export async function getGwsProfileDetails(token: string, record: any) {
  const soapXml = getProfileDetailsOfEachTravellerSoapEnvelope(
    token,
    record.FileInd,
    record.Title
  );

  const xmlResponse = await sendSoapRequest(soapXml);
  const result = await mergeClientFileNodes(xmlResponse);

  return {
    RequestPayload: soapXml,
    ResponsePayload: result,
  };
}


export async function bulkInsertOfficerProfiles(pool: ConnectionPool, profiles: any[]) {
  if (profiles.length === 0) return;

  const table = new sql.Table("gws_officer_profiles");
  table.create = false;
  table.columns.add("OfficerId", sql.Int, { nullable: false });
  table.columns.add("RequestPayload", sql.NVarChar(sql.MAX), { nullable: true });
  table.columns.add("ResponsePayload", sql.NVarChar(sql.MAX), { nullable: true });
  table.columns.add("ErrorMessage", sql.NVarChar(sql.MAX), { nullable: true });

  for (const p of profiles) {
    table.rows.add(
      p.OfficerId,
      p.RequestPayload || null,
      p.ResponsePayload || null,
      p.ErrorMessage || null
    );
  }

  const request = pool.request();
  await request.bulk(table);
}