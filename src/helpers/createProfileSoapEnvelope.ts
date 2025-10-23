export const createSoapEnvelope = (token: string, xml: string): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
        <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema">
            <SOAP-ENV:Body>
                <m:SubmitXmlOnSession xmlns:m="http://webservices.galileo.com">
                    <m:Token>${token}</m:Token>
                        <m:Request>
                            <ClientFile_2>
                                <ClientFileMods>
                                      ${xml}
                                </ClientFileMods>
                            </ClientFile_2>
                        </m:Request>
                        <m:Filter>
                            <_/>
                        </m:Filter>
                </m:SubmitXmlOnSession>
            </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`;
};

export const makeFirstDataSoapEnvelope = (token: string) => {
  const xml = `<ClientFileListMods>
        <CRSID>1V</CRSID>
        <PCC>2E6E</PCC>
        <BusinessTitle>ICE</BusinessTitle>
        <PersonalTitle/>
        <PrefInd>P</PrefInd>
        </ClientFileListMods>`;
  return createSoapEnvelope(token, xml);
};

export const makeMoreDataEnvelope = (token: string) => {
  const xml = `<MoreData>
        <Token>CFLT</Token>
        </MoreData>`;
  return createSoapEnvelope(token, xml);
};

export const getProfileDetailsOfEachTravellerSoapEnvelope = (
  token: string,
  FileInd: string,
  PersonalTitle: string
) => {
  const xml = `<ClientFileDisplayMods>
                            <CRSID>1V</CRSID>
                            <PCC>2E6E</PCC>
                            <BusinessTitle>ICE</BusinessTitle>
                            <PersonalTitle>${PersonalTitle}</PersonalTitle>
                            <FileInd>${FileInd}</FileInd>
                            <MergeInd>N</MergeInd>
                        </ClientFileDisplayMods>`;
  return createSoapEnvelope(token, xml);
};
