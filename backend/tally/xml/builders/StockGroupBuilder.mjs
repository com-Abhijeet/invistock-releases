import { escapeXML } from "../TallyXmlUtil.mjs";

export class StockGroupBuilder {
  static build({ action, groupName, originalName, parentGroup }) {
    if (action === "Delete") {
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><STOCKGROUP NAME="${escapeXML(groupName)}" ACTION="Delete"><NAME.LIST><NAME>${escapeXML(groupName)}</NAME></NAME.LIST></STOCKGROUP></TALLYMESSAGE>`;
    }
    
    const nameToUse = originalName || groupName;

    return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
      <STOCKGROUP NAME="${escapeXML(nameToUse)}" ACTION="${action}">
        <NAME.LIST>
          <NAME>${escapeXML(groupName)}</NAME>
        </NAME.LIST>
        ${parentGroup ? `<PARENT>${escapeXML(parentGroup)}</PARENT>` : ""}
        <ISADDABLE>Yes</ISADDABLE>
      </STOCKGROUP>
    </TALLYMESSAGE>`;
  }
}
