import { escapeXML } from "../TallyXmlUtil.mjs";

export class LedgerBuilder {
  static build({ action, name, parentGroup, address, state, pincode, gstin, affectsStock }) {
    if (action === "Delete") {
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="${escapeXML(name)}" ACTION="Delete"><NAME.LIST><NAME>${escapeXML(name)}</NAME></NAME.LIST></LEDGER></TALLYMESSAGE>`;
    }

    return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
      <LEDGER NAME="${escapeXML(name)}" ACTION="${action}">
        <NAME.LIST>
          <NAME>${escapeXML(name)}</NAME>
        </NAME.LIST>
        <PARENT>${escapeXML(parentGroup)}</PARENT>
        <ISBILLWISEON>Yes</ISBILLWISEON>
        <AFFECTSSTOCK>${affectsStock ? 'Yes' : 'No'}</AFFECTSSTOCK>
        ${address ? `<ADDRESS.LIST><ADDRESS>${escapeXML(address)}</ADDRESS></ADDRESS.LIST>` : ""}
        ${state ? `<LEDSTATENAME>${escapeXML(state)}</LEDSTATENAME>` : ""}
        ${pincode ? `<PINCODE>${escapeXML(pincode)}</PINCODE>` : ""}
        ${gstin ? `<PARTYGSTIN>${escapeXML(gstin)}</PARTYGSTIN>` : ""}
      </LEDGER>
    </TALLYMESSAGE>`;
  }
}
