import { escapeXML, normalizeTallyUnit } from "../TallyXmlUtil.mjs";

export class StockItemBuilder {
  static build({ action, itemName, originalName, parentGroup, unit, hsn, gstRate }) {
    if (action === "Delete") {
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><STOCKITEM NAME="${escapeXML(itemName)}" ACTION="Delete"><NAME.LIST><NAME>${escapeXML(itemName)}</NAME></NAME.LIST></STOCKITEM></TALLYMESSAGE>`;
    }

    const nameToUse = originalName || itemName;
    const baseUnit = normalizeTallyUnit(unit);
    const group = parentGroup ? parentGroup.toString().trim() : "";
    const hasParentGroup = group && group.toLowerCase() !== "primary";

    let xml = `<TALLYMESSAGE xmlns:UDF="TallyUDF">
      <STOCKITEM NAME="${escapeXML(nameToUse)}" ACTION="${action}">
        <NAME.LIST>
          <NAME>${escapeXML(itemName)}</NAME>
        </NAME.LIST>
        ${hasParentGroup ? `<PARENT>${escapeXML(group)}</PARENT>` : ""}
        <BASEUNITS>${escapeXML(baseUnit)}</BASEUNITS>
        `;

    // Add GST and HSN if available
    if (hsn || gstRate > 0) {
      xml += `
        <GSTAPPLICABLE>&#4; Applicable</GSTAPPLICABLE>
        <GSTDETAILS.LIST>
          <APPLICABLEFROM>20200401</APPLICABLEFROM>
          <CALCULATIONTYPE>On Value</CALCULATIONTYPE>
          <HSNCODE>${escapeXML(hsn || "")}</HSNCODE>
          <TAXABILITY>Taxable</TAXABILITY>
          <STATEWISEDETAILS.LIST>
            <STATENAME>&#4; Any</STATENAME>
            <RATEDETAILS.LIST>
              <GSTRATEDUTYHEAD>Integrated Tax</GSTRATEDUTYHEAD>
              <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
              <GSTRATE>${gstRate}</GSTRATE>
            </RATEDETAILS.LIST>
            <RATEDETAILS.LIST>
              <GSTRATEDUTYHEAD>Central Tax</GSTRATEDUTYHEAD>
              <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
              <GSTRATE>${gstRate / 2}</GSTRATE>
            </RATEDETAILS.LIST>
            <RATEDETAILS.LIST>
              <GSTRATEDUTYHEAD>State Tax</GSTRATEDUTYHEAD>
              <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
              <GSTRATE>${gstRate / 2}</GSTRATE>
            </RATEDETAILS.LIST>
          </STATEWISEDETAILS.LIST>
        </GSTDETAILS.LIST>`;
    }

    xml += `
      </STOCKITEM>
    </TALLYMESSAGE>`;
    
    return xml;
  }
}
