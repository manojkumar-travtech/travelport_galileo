import dotenv from "dotenv";
dotenv.config();

export const TRAVELPORT_CONFIG = {
  endpoint:
    "https://americas.webservices.travelport.com/B2BGateway/service/XMLSelect",
  profile: "GWS_1V_2E6E_B86316",
  soapAction: "http://webservices.galileo.com/BeginSession",
  username: process.env.TRAVELPORT_USER || "",
  password: process.env.TRAVELPORT_PASS || "",
};
