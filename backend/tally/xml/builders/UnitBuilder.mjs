import { escapeXML, normalizeTallyUnit } from "../TallyXmlUtil.mjs";

export class UnitBuilder {
  static build({ action, unitName, originalName }) {
    const normalizedUnit = normalizeTallyUnit(unitName);

    if (action === "Delete") {
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><UNIT NAME="${escapeXML(normalizedUnit)}" ACTION="Delete"><NAME>${escapeXML(normalizedUnit)}</NAME></UNIT></TALLYMESSAGE>`;
    }
    
    // Sometimes action might be Alter, but we need the originalName to reference the existing one
    const nameToUse = originalName || normalizedUnit;

    return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
      <UNIT NAME="${escapeXML(nameToUse)}" ACTION="${action}">
        <NAME>${escapeXML(normalizedUnit)}</NAME>
        <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
      </UNIT>
    </TALLYMESSAGE>`;
  }
}
