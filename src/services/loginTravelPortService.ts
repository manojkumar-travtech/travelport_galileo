import { TRAVELPORT_CONFIG } from "../config/soap.config";
import { createParentSoapEnvelope } from "../utils/createSoapEnvelope";
import { parseStringPromise } from "xml2js";
import { sendSoapRequest } from "../helpers/sendSoapRequest";
import { retry } from "../utils/helpers";

export const getTravelPortToken = async (): Promise<string> => {
  return retry(
    async () => {
      const beginSession: string = `
   <BeginSession xmlns="http://webservices.galileo.com">
      <Profile>${TRAVELPORT_CONFIG.profile}</Profile>
    </BeginSession>
  `;
      const soapApi = createParentSoapEnvelope(beginSession);

      const rawResponse = await sendSoapRequest(soapApi);

      const json = await parseStringPromise(rawResponse, {
        explicitArray: false,
      });
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
    },
    3,
    1000
  );
};
