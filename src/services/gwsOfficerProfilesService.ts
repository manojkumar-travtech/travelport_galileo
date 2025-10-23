// src/services/gwsOfficerProfilesService.ts
import sql from "mssql";
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

export async function getEachProfileDetailsOfTraveller(
  token: string,
  record: {
    FileInd: string;
    Title: string;
    OfficerId: number;
  }
) {
  let soapXml: string | null = "";
  try {
    soapXml = getProfileDetailsOfEachTravellerSoapEnvelope(
      token,
      record.FileInd,
      record.Title
    );

    const xmlResponse = await sendSoapRequest(soapXml);
    const result = await mergeClientFileNodes(xmlResponse);
    const dataMap: OfficerProfile = {
      OfficerId: record.OfficerId,
      RequestPayload: soapXml,
      ResponsePayload: result,
      ErrorMessage: null,
    };
    await insertOfficerProfile(dataMap);
  } catch (error: any) {
    const err = error.response?.data || error.message;
    const errorMessage =
      typeof err === "object" ? JSON.stringify(err) : String(err);

    const errorMap = {
      OfficerId: record.OfficerId,
      RequestPayload: soapXml,
      ResponsePayload: null,
      ErrorMessage: errorMessage,
    };
    await insertOfficerProfile(errorMap);
  }
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
