import { escapeXML } from "../TallyXmlUtil.mjs";

export class SalesAccountingBuilder {
  /**
   * @param {import("../../models/AccountingDocument.mjs").AccountingDocument} doc
   * @param {Object} settings 
   */
  static build(doc, settings) {
    if (doc.action === "Delete") {
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${doc.voucherType}" ACTION="Cancel"><DATE>${doc.date}</DATE><VOUCHERTYPENAME>${doc.voucherType}</VOUCHERTYPENAME><VOUCHERNUMBER>${escapeXML(doc.referenceNo)}</VOUCHERNUMBER></VOUCHER></TALLYMESSAGE>`;
    }

    const partyName = escapeXML(doc.partyLedgerName || settings.cash_ledger);
    const ref = escapeXML(doc.referenceNo);
    
    let xml = `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${doc.voucherType}" ACTION="${doc.action}" OBJVIEW="Accounting Voucher View">
      <DATE>${doc.date}</DATE>
      <VOUCHERTYPENAME>${doc.voucherType}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${ref}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
      <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
      <ISINVOICE>No</ISINVOICE>
      
      <!-- DEBIT PARTY -->
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${partyName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${doc.totalAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      
      <!-- CREDIT SALES -->
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(settings.sales_ledger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${doc.taxableAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;

    // Taxes
    if (doc.isInterstate && doc.igstAmount > 0) {
      xml += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(settings.igst_ledger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${doc.igstAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
    } else {
      if (doc.cgstAmount > 0) {
        xml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXML(settings.cgst_ledger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${doc.cgstAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
      }
      if (doc.sgstAmount > 0) {
        xml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXML(settings.sgst_ledger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${doc.sgstAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
      }
    }

    // Rounding & Discount
    if (doc.discountAmount > 0) {
       xml += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(settings.discount_ledger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${doc.discountAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
    }

    if (doc.roundOffAmount !== 0) {
      const isDebit = doc.roundOffAmount < 0 ? "Yes" : "No";
      const formattedDiff = Math.abs(doc.roundOffAmount).toFixed(2);
      xml += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(settings.round_off_ledger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${isDebit}</ISDEEMEDPOSITIVE>
        <AMOUNT>${isDebit === "Yes" ? "-" : ""}${formattedDiff}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
    }

    xml += `
    </VOUCHER>
    </TALLYMESSAGE>`;
    
    return xml;
  }
}
