import { escapeXML } from "../TallyXmlUtil.mjs";

export class TransactionAccountingBuilder {
  /**
   * @param {import("../../models/AccountingDocument.mjs").AccountingDocument} doc
   * @param {Object} settings 
   */
  static build(doc, settings) {
    if (doc.action === "Delete") {
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${doc.voucherType}" ACTION="Cancel"><DATE>${doc.date}</DATE><VOUCHERTYPENAME>${doc.voucherType}</VOUCHERTYPENAME><VOUCHERNUMBER>${escapeXML(doc.referenceNo)}</VOUCHERNUMBER></VOUCHER></TALLYMESSAGE>`;
    }

    const ref = escapeXML(doc.referenceNo);
    const amount = doc.totalAmount.toFixed(2);
    
    // Default ledgers based on voucher type
    let debitLedger = "";
    let creditLedger = "";
    
    // In Kosh, payment mode "cash" uses cash ledger, otherwise the specific receipt/payment bank ledger
    const receiptBankCash = String(doc.paymentMode).toLowerCase() === "cash" ? settings.cash_ledger : (settings.receipt_ledger || settings.bank_ledger);
    const paymentBankCash = String(doc.paymentMode).toLowerCase() === "cash" ? settings.cash_ledger : (settings.payment_ledger || settings.bank_ledger);

    if (doc.voucherType === "Receipt") {
      debitLedger = receiptBankCash;
      creditLedger = doc.partyLedgerName;
    } else if (doc.voucherType === "Payment") {
      debitLedger = doc.partyLedgerName;
      creditLedger = paymentBankCash;
    } else if (doc.voucherType === "Credit Note") {
      debitLedger = settings.credit_note_ledger || settings.sales_ledger;
      creditLedger = doc.partyLedgerName;
    } else if (doc.voucherType === "Debit Note") {
      debitLedger = doc.partyLedgerName;
      creditLedger = settings.debit_note_ledger || settings.purchase_ledger;
    } else {
      // Fallback
      debitLedger = doc.partyLedgerName;
      creditLedger = paymentBankCash;
    }

    let xml = `<TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${doc.voucherType}" ACTION="${doc.action}" OBJVIEW="Accounting Voucher View">
      <DATE>${doc.date}</DATE>
      <VOUCHERTYPENAME>${doc.voucherType}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${ref}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${escapeXML(doc.partyLedgerName)}</PARTYLEDGERNAME>
      <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
      <NARRATION>${escapeXML(doc.narration || "")}</NARRATION>
      
      <!-- DEBIT ENTRY -->
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(debitLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      
      <!-- CREDIT ENTRY -->
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(creditLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
    </VOUCHER>
    </TALLYMESSAGE>`;
    
    return xml;
  }
}
