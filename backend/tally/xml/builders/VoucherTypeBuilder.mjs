import { escapeXML } from "../TallyXmlUtil.mjs";

export class VoucherTypeBuilder {
  static build({ action, name, parentGroup, numberingMethod = "Manual", preventDuplicates = true, restartDetails = [], isInvoice = false }) {
    if (action === "Delete") {
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHERTYPE NAME="${escapeXML(name)}" ACTION="Delete"><NAME.LIST><NAME>${escapeXML(name)}</NAME></NAME.LIST></VOUCHERTYPE></TALLYMESSAGE>`;
    }

    // Numbering method mapping
    let numberingTallyStr = "Manual";
    if (numberingMethod === "Automatic (Manual Override)") {
      numberingTallyStr = "Automatic (Manual Override)";
    } else if (numberingMethod === "Automatic") {
      numberingTallyStr = "Automatic";
    }

    let xml = `<TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHERTYPE NAME="${escapeXML(name)}" ACTION="${action}">
        <NAME.LIST>
          <NAME>${escapeXML(name)}</NAME>
        </NAME.LIST>
        <PARENT>${escapeXML(parentGroup)}</PARENT>
        <NUMBERINGMETHOD>${numberingTallyStr}</NUMBERINGMETHOD>
        <PREVENTDUPLICATES>${preventDuplicates ? 'Yes' : 'No'}</PREVENTDUPLICATES>
        <ISINVOICE>${isInvoice ? 'Yes' : 'No'}</ISINVOICE>
    `;

    // Handle restart details (e.g. 1-Apr every year)
    if (restartDetails && restartDetails.length > 0) {
      xml += `\n<RESTARTDETAILS.LIST>\n`;
      for (const rd of restartDetails) {
        xml += `
          <APPLICABLEFROM>${rd.date}</APPLICABLEFROM>
          <STARTINGNUMBER>${rd.startingNumber}</STARTINGNUMBER>
          <RESTARTPERIOD>${escapeXML(rd.periodicity)}</RESTARTPERIOD>
        `;
      }
      xml += `\n</RESTARTDETAILS.LIST>\n`;
    }

    xml += `
      </VOUCHERTYPE>
    </TALLYMESSAGE>`;
    
    return xml;
  }
}
