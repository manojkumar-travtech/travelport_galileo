import { createParentSoapEnvelope } from "../utils/createSoapEnvelope";

export const createSoapEnvelope = (token: string, xml: string): string => {
  const envelope = `<m:SubmitXmlOnSession xmlns:m="http://webservices.galileo.com">
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
                </m:SubmitXmlOnSession>`;
  return createParentSoapEnvelope(envelope);
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
