import { parseStringPromise } from "xml2js";
import { sendSoapRequest } from "../helpers/sendSoapRequest";
import { createParentSoapEnvelope } from "../utils/createSoapEnvelope";

export const logoutFromTravlePort = async (token: string): Promise<string> => {
  try {
    console.log("🔹 Initiating logout from TravelPort...");

    // Create SOAP body for EndSession
    const endSession: string = `
      <m:EndSession xmlns:m="http://webservices.galileo.com">
        <m:Token>${token}</m:Token>
      </m:EndSession>
    `;
    const soapApi = createParentSoapEnvelope(endSession);

    console.log("📡 Sending logout SOAP request...");
    const rawResponse = await sendSoapRequest(soapApi);

    console.log("📝 Parsing SOAP response...");
    const json = await parseStringPromise(rawResponse, { explicitArray: false });

    // Extract response safely
    const logOutResponse =
      json["soapenv:Envelope"]?.["soapenv:Body"]?.["EndSessionResponse"] ||
      json["soap:Envelope"]?.["soap:Body"]?.["EndSessionResponse"];

    if (!logOutResponse) {
      throw new Error("⚠️ Logout failed: EndSessionResponse not found in SOAP response");
    }

    console.log("✅ Logout successful.");
    return "Logout successfully";
  } catch (error: any) {
    console.error("❌ Error during logout:", error.message || error);
    throw new Error(`Logout failed: ${error.message || "Unknown error"}`);
  }
};
