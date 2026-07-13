import { escapeXML, normalizeTallyUnit } from "../TallyXmlUtil.mjs";

function formatQuantity(quantity, unit) {
  const qty = Number(quantity) || 0;
  return `${qty} ${escapeXML(normalizeTallyUnit(unit))}`;
}

export class PurchaseInventoryBuilder {
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
    
    let xml = `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${doc.voucherType}" ACTION="${doc.action}" OBJVIEW="Invoice Voucher View">
      <DATE>${doc.date}</DATE>
      <VOUCHERTYPENAME>${doc.voucherType}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${ref}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
      <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
      <ISINVOICE>Yes</ISINVOICE>
      
      <!-- CREDIT PARTY -->
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${partyName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${doc.totalAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;

    // Tally item invoices expect inventory entries at voucher level.
    for (const item of doc.items) {
      const qty = Number(item.quantity) || 1;
      const unit = normalizeTallyUnit(item.unit);
      const itemAmount = Number(item.amount); // Taxable amount
      const rate = Number(item.rate);
      
      xml += `
        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${escapeXML(item.name)}</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <RATE>${rate.toFixed(2)}/${escapeXML(unit)}</RATE>
          <AMOUNT>-${itemAmount.toFixed(2)}</AMOUNT>
          <ACTUALQTY>${formatQuantity(qty, unit)}</ACTUALQTY>
          <BILLEDQTY>${formatQuantity(qty, unit)}</BILLEDQTY>
          <ACCOUNTINGALLOCATIONS.LIST>
            <LEDGERNAME>${escapeXML(settings.purchase_ledger)}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${itemAmount.toFixed(2)}</AMOUNT>
          </ACCOUNTINGALLOCATIONS.LIST>
        </ALLINVENTORYENTRIES.LIST>`;
    }

    // Taxes
    if (doc.isInterstate && doc.igstAmount > 0) {
      xml += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(settings.igst_ledger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${doc.igstAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
    } else {
      if (doc.cgstAmount > 0) {
        xml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXML(settings.cgst_ledger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${doc.cgstAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
      }
      if (doc.sgstAmount > 0) {
        xml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXML(settings.sgst_ledger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${doc.sgstAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
      }
    }

    // Rounding & Discount
    if (doc.discountAmount > 0) {
       xml += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(settings.discount_ledger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${doc.discountAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
    }

    // Exact mathematical mismatch calculation
    const totalItems = doc.items.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalTaxes = doc.isInterstate ? doc.igstAmount : (doc.cgstAmount + doc.sgstAmount);
    const expectedTotal = totalItems + totalTaxes - doc.discountAmount;
    
    // exactRoundOff > 0 means the actual invoice total is higher than expected.
    // In purchase, the party credit is actualTotal. We need to DEBIT the round-off ledger to balance.
    // exactRoundOff < 0 means the invoice total is lower, so we CREDIT the round-off ledger.
    const exactRoundOff = Number((doc.totalAmount - expectedTotal).toFixed(2));

    if (exactRoundOff !== 0) {
      const isDebit = exactRoundOff > 0 ? "Yes" : "No";
      const formattedDiff = Math.abs(exactRoundOff).toFixed(2);
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
