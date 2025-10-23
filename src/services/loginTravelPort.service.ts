import { TRAVELPORT_CONFIG } from "../config/soap.config";
import { createSoapEnvelope } from "../utils/createSoapEnvelope";
import { parseStringPromise } from "xml2js";
import { sendSoapRequest } from "../helpers/sendSoapRequest";

export const getTravelPortToken = async () => {
  const beginSession: string = `
   <BeginSession xmlns="http://webservices.galileo.com">
      <Profile>${TRAVELPORT_CONFIG.profile}</Profile>
    </BeginSession>
  `;
  const soapApi = createSoapEnvelope(beginSession);

  const rawResponse = await sendSoapRequest(soapApi);

  const json = await parseStringPromise(rawResponse, { explicitArray: false });
  const token =
    json["soapenv:Envelope"]?.["soapenv:Body"]?.["BeginSessionResponse"]?.[
      "BeginSessionResult"
    ] ||
    json["soap:Envelope"]?.["soap:Body"]?.["BeginSessionResponse"]?.[
      "BeginSessionResult"
    ];

  if (!token)
    throw new Error("Failed to extract session token from SOAP response");

  return token;
};
