/**
 * Escapes characters for XML to prevent parsing errors.
 */
function escapeXML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wraps Tally objects in the standard import envelope.
 */
export function wrapInEnvelope(tallyMessageContent) {
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <IMPORTDUPS>@@IGNOREPTY</IMPORTDUPS>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
${tallyMessageContent}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generate Ledger XML (Customer/Supplier)
 */
export function generateLedgerXML(entity, type) {
  // type: 'Sundry Debtors' | 'Sundry Creditors'
  const name = escapeXML(entity.name);
  const alterId = escapeXML(`KOSH-LEDGER-${entity.id}`);
  const address = escapeXML(entity.address || entity.bill_address || "");
  const state = escapeXML(entity.state || "");
  const pincode = escapeXML(entity.pincode || "");
  const gstin = escapeXML(
    entity.gst_no || entity.gst_number || entity.gstin || "",
  );
  const phone = escapeXML(entity.phone || "");

  return `
<LEDGER NAME="${name}" ACTION="Create">
    <NAME.LIST>
        <NAME>${name}</NAME>
    </NAME.LIST>
    <PARENT>${type}</PARENT>
    <ISBILLWISEON>Yes</ISBILLWISEON>
    <LEDSTATENAME>${state}</LEDSTATENAME>
    <PINCODE>${pincode}</PINCODE>
    <PARTYGSTIN>${gstin}</PARTYGSTIN>
    <LEDGERPHONE>${phone}</LEDGERPHONE>
    <ADDRESS.LIST>
        <ADDRESS>${address}</ADDRESS>
    </ADDRESS.LIST>
    <ALTERID>${alterId}</ALTERID>
    <GUID>${alterId}</GUID>
</LEDGER>
`;
}

/**
 * Generate Base System Ledger XML (Sales/Purchases/Taxes/Expenses)
 */
export function generateBaseLedgerXML(name, parentGroup) {
  const safeName = escapeXML(name);
  const alterId = escapeXML(`KOSH-BASE-LEDGER-${name.replace(/\s+/g, "-")}`);

  return `
<LEDGER NAME="${safeName}" ACTION="Create">
    <NAME.LIST>
        <NAME>${safeName}</NAME>
    </NAME.LIST>
    <PARENT>${escapeXML(parentGroup)}</PARENT>
    <ISBILLWISEON>No</ISBILLWISEON>
    <ALTERID>${alterId}</ALTERID>
    <GUID>${alterId}</GUID>
</LEDGER>
`;
}

/**
 * Generate Stock Group XML (Category)
 */
export function generateStockGroupXML(category) {
  const name = escapeXML(category.name);
  const alterId = escapeXML(`KOSH-CAT-${category.id}`);
  return `
<STOCKGROUP NAME="${name}" ACTION="Create">
    <NAME.LIST>
        <NAME>${name}</NAME>
    </NAME.LIST>
    <PARENT/>
    <ALTERID>${alterId}</ALTERID>
    <GUID>${alterId}</GUID>
</STOCKGROUP>
`;
}

/**
 * Generate Godown XML
 */
export function generateGodownXML(godownName) {
  const name = escapeXML(godownName);
  const alterId = escapeXML(`KOSH-GODOWN-${name.replace(/\s+/g, "-")}`);
  return `
<GODOWN NAME="${name}" ACTION="Create">
    <NAME.LIST>
        <NAME>${name}</NAME>
    </NAME.LIST>
    <PARENT/>
    <ALTERID>${alterId}</ALTERID>
    <GUID>${alterId}</GUID>
</GODOWN>
`;
}

/**
 * Generate UOM (Unit of Measure) XML
 */
export function generateUnitXML(unit) {
  const name = escapeXML(unit);
  const alterId = escapeXML(`KOSH-UOM-${unit}`);
  return `
<UNIT NAME="${name}" ACTION="Create">
    <NAME>${name}</NAME>
    <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
    <ALTERID>${alterId}</ALTERID>
    <GUID>${alterId}</GUID>
</UNIT>
`;
}

/**
 * Generate Stock Item XML
 */
export function generateStockItemXML(product, categoryName = "") {
  const name = escapeXML(product.name);
  const alterId = escapeXML(`KOSH-ITEM-${product.id}`);
  const hsn = escapeXML(product.hsn || "");
  const unit = escapeXML(product.base_unit || "pcs");
  const group = escapeXML(categoryName);
  const gstRate = product.gst_rate || 0;

  return `
<STOCKITEM NAME="${name}" ACTION="Create">
    <NAME.LIST>
        <NAME>${name}</NAME>
    </NAME.LIST>
    <PARENT>${group}</PARENT>
    <BASEUNITS>${unit}</BASEUNITS>
    <HSNCODE>${hsn}</HSNCODE>
    <GSTRATE>${gstRate}</GSTRATE>
    <ISBATCHWISEON>${product.tracking_type === "batch" || product.tracking_type === "serial" ? "Yes" : "No"}</ISBATCHWISEON>
    <ALTERID>${alterId}</ALTERID>
    <GUID>${alterId}</GUID>
</STOCKITEM>
`;
}

/**
 * Generate Sales / Purchase Voucher XML
 */
export function generateVoucherXML(voucher, items, voucherType, ledgersConfig) {
  // voucherType: 'Sales' | 'Purchase'

  const alterId = escapeXML(`KOSH-${voucherType.toUpperCase()}-${voucher.id}`);
  const isSales = voucherType === "Sales";

  const date = new Date(voucher.created_at || voucher.date);
  const isEduMode = ledgersConfig.tally_educational_mode === "true";
  const tallyDate =
    date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, "0") +
    (isEduMode ? "01" : String(date.getDate()).padStart(2, "0"));

  const partyLedgerName = escapeXML(
    isSales ? voucher.customer_name : voucher.supplier_name,
  );
  const voucherNumber = escapeXML(
    isSales
      ? voucher.reference_no
      : voucher.internal_ref_no || voucher.reference_no,
  );
  const narration = escapeXML(`Ref: ${voucherNumber} ${voucher.note || ""}`);

  const baseLedger = escapeXML(
    isSales
      ? ledgersConfig.default_sales_ledger
      : ledgersConfig.default_purchase_ledger,
  );
  const discountLedger = escapeXML(ledgersConfig.default_discount_ledger);
  const roundOffLedger = escapeXML(ledgersConfig.default_roundoff_ledger);

  // Tally amounts logic:
  // Sales: Party is Debit (negative in XML), Sales Account is Credit (positive).
  // Purchase: Party is Credit (positive), Purchase Account is Debit (negative).
  const sign = isSales ? 1 : -1;

  let totalAmount = (voucher.total_amount || 0) * sign;

  let xml = `
<VOUCHER VCHTYPE="${voucherType}" ACTION="Create">
    <DATE>${tallyDate}</DATE>
    <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${partyLedgerName}</PARTYLEDGERNAME>
    <NARRATION>${narration}</NARRATION>
    <GUID>${alterId}</GUID>
    <ALTERID>${alterId}</ALTERID>
`;

  // ALLINVENTORYENTRIES.LIST
  let totalTaxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  for (const item of items) {
    const itemName = escapeXML(item.product_name);
    const qty = item.quantity;
    const rate = item.rate;
    const discountPercent = item.discount || 0;

    let baseValue = qty * rate;
    let discountAmt = (baseValue * discountPercent) / 100;
    let taxableValue = baseValue - discountAmt;

    let gstRate = item.gst_rate || 0;
    let taxAmount = (taxableValue * gstRate) / 100;

    xml += `
    <ALLINVENTORYENTRIES.LIST>
        <STOCKITEMNAME>${itemName}</STOCKITEMNAME>
        <ISDEEMEDPOSITIVE>${isSales ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
        <RATE>${rate}</RATE>
        ${discountPercent > 0 ? `<DISCOUNT>${discountPercent}</DISCOUNT>` : ""}
        <AMOUNT>${(taxableValue * sign).toFixed(2)}</AMOUNT>
        <BILLEDQTY>${qty} ${escapeXML(item.unit || "pcs")}</BILLEDQTY>
`;

    if (item.batch_number || item.batch_uid) {
      const batchName = escapeXML(item.batch_number || item.batch_uid);
      xml += `
        <BATCHALLOCATIONS.LIST>
            <GODOWNNAME>${escapeXML(ledgersConfig.default_godown || "Main Location")}</GODOWNNAME>
            <BATCHNAME>${batchName}</BATCHNAME>
            <AMOUNT>${(taxableValue * sign).toFixed(2)}</AMOUNT>
            <BILLEDQTY>${qty} ${escapeXML(item.unit || "pcs")}</BILLEDQTY>
        </BATCHALLOCATIONS.LIST>
`;
    }

    xml += `
        <ACCOUNTINGALLOCATIONS.LIST>
            <LEDGERNAME>${baseLedger}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>${isSales ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
            <AMOUNT>${(taxableValue * sign).toFixed(2)}</AMOUNT>
        </ACCOUNTINGALLOCATIONS.LIST>
    </ALLINVENTORYENTRIES.LIST>
`;
    // Determine tax calculation for this item
    let isInterstate = false; // We can check this if we have state mapping, default to false for now
    if (isInterstate) {
      igstTotal += taxAmount;
    } else {
      cgstTotal += taxAmount / 2;
      sgstTotal += taxAmount / 2;
    }
  } // <-- Missing brace added here

  // GUARANTEE BALANCE
  // We calculate exactly what the credits sum up to inside Tally based on our XML tags
  let totalCredits = 0;
  for (const item of items) {
    const qty = item.quantity;
    const rate = item.rate;
    const discountPercent = item.discount || 0;
    let baseValue = qty * rate;
    let discountAmt = (baseValue * discountPercent) / 100;
    let taxableValue = baseValue - discountAmt;
    totalCredits += taxableValue;
  }
  totalCredits += cgstTotal + sgstTotal + igstTotal;

  let voucherDiscount = voucher.discount || 0;
  totalCredits -= voucherDiscount;

  // If the Kosh DB total_amount doesn't match our computed credits, push it to round off!
  let forcedRoundOff = voucher.total_amount - totalCredits;
  // Add existing db round off just in case
  forcedRoundOff += voucher.round_off || 0;

  // Party Ledger Entry with Bill Allocation (New Ref)
  xml += `
    <LEDGERENTRIES.LIST>
        <LEDGERNAME>${partyLedgerName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${isSales ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${(-totalAmount).toFixed(2)}</AMOUNT>
        <BILLALLOCATIONS.LIST>
            <NAME>${voucherNumber}</NAME>
            <BILLTYPE>New Ref</BILLTYPE>
            <AMOUNT>${(-totalAmount).toFixed(2)}</AMOUNT>
        </BILLALLOCATIONS.LIST>
    </LEDGERENTRIES.LIST>
`;

  // Tax Ledgers
  if (cgstTotal > 0) {
    xml += `
    <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(ledgersConfig.default_cgst_ledger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${isSales ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${(cgstTotal * sign).toFixed(2)}</AMOUNT>
    </LEDGERENTRIES.LIST>
    <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(ledgersConfig.default_sgst_ledger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${isSales ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${(sgstTotal * sign).toFixed(2)}</AMOUNT>
    </LEDGERENTRIES.LIST>
`;
  }

  // Discount
  if (voucher.discount > 0) {
    xml += `
    <LEDGERENTRIES.LIST>
        <LEDGERNAME>${discountLedger}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${isSales ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${(voucher.discount * sign * -1).toFixed(2)}</AMOUNT>
    </LEDGERENTRIES.LIST>
`;
  }

  // Round Off
  if (Math.abs(forcedRoundOff) >= 0.01) {
    xml += `
    <LEDGERENTRIES.LIST>
        <LEDGERNAME>${roundOffLedger}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${forcedRoundOff < 0 ? (isSales ? "Yes" : "No") : isSales ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${(Math.abs(forcedRoundOff) * sign * (forcedRoundOff < 0 ? -1 : 1)).toFixed(2)}</AMOUNT>
    </LEDGERENTRIES.LIST>
`;
  }

  xml += `</VOUCHER>`;
  return xml;
}

/**
 * Generate Receipt/Payment/Note XML for Transactions
 */
export function generateTransactionXML(transaction, ledgersConfig) {
  const isEduMode = ledgersConfig.tally_educational_mode === "true";
  const date = new Date(transaction.transaction_date || transaction.created_at);
  const tallyDate =
    date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, "0") +
    (isEduMode ? "01" : String(date.getDate()).padStart(2, "0"));

  let voucherType = "Receipt"; // default
  let isPartyDebit = false;

  if (transaction.type === "payment_in") {
    voucherType = "Receipt";
    isPartyDebit = false; // Party is Credited
  } else if (transaction.type === "payment_out") {
    voucherType = "Payment";
    isPartyDebit = true; // Party is Debited
  } else if (transaction.type === "credit_note") {
    voucherType = "Credit Note";
    isPartyDebit = false;
  } else if (transaction.type === "debit_note") {
    voucherType = "Debit Note";
    isPartyDebit = true;
  }

  const partyLedgerName = escapeXML(transaction.entity_name);
  const bankCashLedger = escapeXML(
    (transaction.payment_mode || "").toLowerCase() === "cash"
      ? ledgersConfig.default_cash_ledger || "Cash"
      : ledgersConfig.default_bank_ledger || "Bank A/c",
  );
  const amount = transaction.amount;
  const refNo = escapeXML(transaction.reference_no);
  const againstBill = escapeXML(transaction.bill_reference_no || ""); // Needs to be fetched in service
  const alterId = escapeXML(`KOSH-TXN-${transaction.id}`);

  // In Tally:
  // Debit amount is Negative in AMOUNT tag
  // Credit amount is Positive in AMOUNT tag

  let partyAmount = isPartyDebit ? -amount : amount;
  let bankAmount = isPartyDebit ? amount : -amount;

  let xml = `
<VOUCHER VCHTYPE="${voucherType}" ACTION="Create">
    <DATE>${tallyDate}</DATE>
    <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${refNo}</VOUCHERNUMBER>
    <NARRATION>${escapeXML(transaction.note || `Ref: ${refNo}`)}</NARRATION>
    <GUID>${alterId}</GUID>
    <ALTERID>${alterId}</ALTERID>
    
    <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${partyLedgerName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${isPartyDebit ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${partyAmount.toFixed(2)}</AMOUNT>
`;

  if (againstBill) {
    xml += `
        <BILLALLOCATIONS.LIST>
            <NAME>${againstBill}</NAME>
            <BILLTYPE>Agst Ref</BILLTYPE>
            <AMOUNT>${partyAmount.toFixed(2)}</AMOUNT>
        </BILLALLOCATIONS.LIST>
`;
  }

  xml += `
    </ALLLEDGERENTRIES.LIST>
`;

  if (voucherType === "Receipt" || voucherType === "Payment") {
    xml += `
    <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${bankCashLedger}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${!isPartyDebit ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${bankAmount.toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
`;
  }

  xml += `
</VOUCHER>
`;
  return xml;
}

/**
 * Generate Voucher Type Master XML to enforce Manual Override
 */
export function generateVoucherTypeXML(voucherTypeName) {
  return `
<VOUCHERTYPE NAME="${escapeXML(voucherTypeName)}" ACTION="Alter">
    <NAME.LIST>
        <NAME>${escapeXML(voucherTypeName)}</NAME>
    </NAME.LIST>
    <NUMBERINGMETHOD>Automatic (Manual Override)</NUMBERINGMETHOD>
    <ISVCHAUTOSET>Yes</ISVCHAUTOSET>
    <PREVENTDUPLICATES>Yes</PREVENTDUPLICATES>
</VOUCHERTYPE>
`;
}

/**
 * Generate Expense XML (Payment)
 */
export function generateExpenseXML(expense, ledgersConfig) {
  const isEduMode = ledgersConfig.tally_educational_mode === "true";
  const date = new Date(expense.date);
  const tallyDate =
    date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, "0") +
    (isEduMode ? "01" : String(date.getDate()).padStart(2, "0"));

  const expenseLedger = escapeXML(
    expense.category ||
      ledgersConfig.default_expense_ledger ||
      "General Expenses",
  );
  const bankCashLedger = escapeXML(
    (expense.payment_mode || "").toLowerCase() === "cash"
      ? ledgersConfig.default_cash_ledger || "Cash"
      : ledgersConfig.default_bank_ledger || "Bank A/c",
  );
  const amount = expense.amount;
  const alterId = escapeXML(`KOSH-EXP-${expense.id}`);

  // Expense is Debit (Negative Amount)
  // Bank/Cash is Credit (Positive Amount)

  return `
<VOUCHER VCHTYPE="Payment" ACTION="Create">
    <DATE>${tallyDate}</DATE>
    <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
    <NARRATION>${escapeXML(expense.description || "")}</NARRATION>
    <GUID>${alterId}</GUID>
    <ALTERID>${alterId}</ALTERID>
    
    <LEDGERENTRIES.LIST>
        <LEDGERNAME>${expenseLedger}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>${(-amount).toFixed(2)}</AMOUNT>
    </LEDGERENTRIES.LIST>

    <LEDGERENTRIES.LIST>
        <LEDGERNAME>${bankCashLedger}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${amount.toFixed(2)}</AMOUNT>
    </LEDGERENTRIES.LIST>
</VOUCHER>
`;
}
