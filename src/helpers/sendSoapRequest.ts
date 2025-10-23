import axios from "axios";
import { TRAVELPORT_CONFIG } from "../config/soap.config";

export const sendSoapRequest = async (soapXml: string): Promise<string> => {
  try {
    const response = await axios.post<string>(TRAVELPORT_CONFIG.endpoint, soapXml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "SubmitXmlOnSession",
        Authorization:
          "Basic " +
          Buffer.from(
            `${TRAVELPORT_CONFIG.username}:${TRAVELPORT_CONFIG.password}`
          ).toString("base64"),
        "User-Agent": "axios/1.12.2",
      },
      timeout: 15000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("SOAP request failed:", error.response?.data || error.message);
      throw new Error(
        `Failed to send SOAP request: ${error.response?.status || ""} ${error.message}`
      );
    } else {
      console.error("Unexpected error:", error);
      throw new Error("An unexpected error occurred while sending SOAP request.");
    }
  }
};
