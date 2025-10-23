import { Builder, parseStringPromise } from "xml2js";

export const parseTravelportGwsOfficersXmlToJson = async (xml: string) => {
  try {
    const result = await parseStringPromise(xml, { explicitArray: false });
    const clientFile =
      result["soapenv:Envelope"]?.["soapenv:Body"]?.[
        "SubmitXmlOnSessionResponse"
      ]?.SubmitXmlOnSessionResult?.ClientFile_2?.ClientFile;

    if (!clientFile) return [];

    const records = Array.isArray(clientFile.ClientFileSingleTitleList)
      ? clientFile.ClientFileSingleTitleList
      : [clientFile.ClientFileSingleTitleList];

    const builder = new Builder({ headless: true });

    return records.map((rec: any) => ({
      FileInd: rec.FileInd || "",
      Title: rec.Title || "",
      XmlResponse: builder.buildObject({ ClientFileSingleTitleList: rec }),
    }));
  } catch (err) {
    console.error("Failed to parse XML:", err);
    return [];
  }
};

interface MergedRecord {
  LineNum: string;
  MoveInd: string;
  SecondaryInd: string;
  DataType: string;
  Data: string;
  XmlResponse: string;
}

export async function mergeClientFileNodes(xml: string): Promise<string> {
  try {
    // Parse XML
    const parsed: any = await parseStringPromise(xml, { explicitArray: false });

    const envelope =
      parsed["soapenv:Envelope"] ||
      parsed["Envelope"]; // handle missing prefix case

    const body = envelope?.["soapenv:Body"] || envelope?.["Body"];
    const submitResponse =
      body?.["SubmitXmlOnSessionResponse"] ||
      body?.["SubmitXmlOnSessionResult"] ||
      Object.values(body || {})[0];

    const clientFile =
      submitResponse?.["SubmitXmlOnSessionResult"]?.["ClientFile_2"]?.["ClientFile"] ||
      submitResponse?.["ClientFile_2"]?.["ClientFile"];

    if (!clientFile) {
      console.error("❌ Could not find ClientFile section in XML");
      return xml; // return original XML if not found
    }

    // Normalize to arrays
    let fixed = clientFile.ClientFileFixedLineData;
    let variable = clientFile.ClientFileVariableLineData;

    if (!Array.isArray(fixed)) fixed = [fixed];
    if (!Array.isArray(variable)) variable = [variable];

    // Merge variable data inside fixed data
    const combined = fixed.map((f: any, i: number) => {
      const v = variable[i];
      if (v) f.ClientFileVariableLineData = v;
      return f;
    });

    // Replace the separate lists with the combined structure
    clientFile.ClientFileFixedLineData = combined;
    delete clientFile.ClientFileVariableLineData;

    // ✅ Rebuild full XML, keeping declaration and namespaces
    const builder = new Builder({
      headless: false, // includes XML declaration
      xmldec: { version: "1.0", encoding: "UTF-8" },
      renderOpts: { pretty: true },
    });

    const updatedXml = builder.buildObject(parsed);

    return updatedXml;
  } catch (err: any) {
    console.error("❌ Failed to merge XML:", err.message || err);
    return xml;
  }
}
