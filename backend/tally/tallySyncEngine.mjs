import { getTallyDb } from "../db/tallyDb.mjs";
import dbProxy from "../db/db.mjs";

// --- TALLY FORMATTING UTILITIES ---
function formatTallyDate(dateString) {
  if (!dateString) return "";

  try {
    const datePart = dateString.toString().split("T")[0].split(" ")[0];
    const parts = datePart.split("-");

    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      let day = parts[2].padStart(2, "0");

      // ⚠️ TALLY EDUCATIONAL MODE OVERRIDE
      if (day !== "01" && day !== "02" && day !== "31") {
        console.warn(
          `[TALLY] Educational Mode: Forcing date ${year}-${month}-${day} to ${year}-${month}-01`,
        );
        day = "01";
      }

      return `${year}${month}${day}`;
    }

    return "";
  } catch (e) {
    return "";
  }
}

function escapeXML(unsafe) {
  if (!unsafe) return "";
  return unsafe.toString().replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
    }
  });
}

function wrapTallyXML(content, reportName = "Vouchers") {
  return `<?xml version="1.0" encoding="utf-8"?>\n<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>${reportName}</REPORTNAME><STATICVARIABLES><IMPORTDUPS>@@IGNORECONFLICTS</IMPORTDUPS></STATICVARIABLES></REQUESTDESC><REQUESTDATA>\n${content}\n</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}

// --- PHASE 1: SCAN FOR CHANGES ---
function scanTable(mainRows, entityType, refField) {
  const tDb = getTallyDb();
  const currentIds = new Set();

  const checkStmt = tDb.prepare(
    "SELECT last_hash, status FROM sync_state WHERE entity_type = ? AND entity_id = ?",
  );
  const insertStmt = tDb.prepare(
    "INSERT INTO sync_state (entity_type, entity_id, reference_no, last_hash, status, action_type) VALUES (?, ?, ?, ?, 'pending', 'Create')",
  );
  const updateStmt = tDb.prepare(
    "UPDATE sync_state SET last_hash = ?, status = 'pending', action_type = 'Alter', retry_count = 0, error_log = NULL WHERE entity_type = ? AND entity_id = ?",
  );

  let changes = 0;

  for (const row of mainRows) {
    currentIds.add(row.id);
    const hash = JSON.stringify(row);
    const state = checkStmt.get(entityType, row.id);

    if (!state) {
      insertStmt.run(
        entityType,
        row.id,
        row[refField]?.toString() || `REF-${row.id}`,
        hash,
      );
      changes++;
    } else if (state.last_hash !== hash || state.status === "failed") {
      updateStmt.run(hash, entityType, row.id);
      changes++;
    }
  }

  const existingRecords = tDb
    .prepare(
      "SELECT entity_id FROM sync_state WHERE entity_type = ? AND status != 'deleted'",
    )
    .all(entityType);
  const deleteStmt = tDb.prepare(
    "UPDATE sync_state SET status = 'pending', action_type = 'Delete', retry_count = 0 WHERE entity_type = ? AND entity_id = ?",
  );

  for (const rec of existingRecords) {
    if (!currentIds.has(rec.entity_id)) {
      deleteStmt.run(entityType, rec.entity_id);
      changes++;
    }
  }

  return changes;
}

export function scanAllForChanges() {
  const mainDb = dbProxy;
  const tDb = getTallyDb();
  console.log("[TALLY] Scanning for changes via Comparison Engine...");

  let totalChanges = 0;
  tDb.transaction(() => {
    totalChanges += scanTable(
      mainDb.prepare("SELECT * FROM customers").all(),
      "customer",
      "phone",
    );
    totalChanges += scanTable(
      mainDb.prepare("SELECT * FROM suppliers").all(),
      "supplier",
      "phone",
    );
    totalChanges += scanTable(
      mainDb.prepare("SELECT * FROM sales").all(),
      "sale",
      "reference_no",
    );
    totalChanges += scanTable(
      mainDb.prepare("SELECT * FROM purchases").all(),
      "purchase",
      "reference_no",
    );
    totalChanges += scanTable(
      mainDb.prepare("SELECT * FROM transactions").all(),
      "transaction",
      "reference_no",
    );
    totalChanges += scanTable(
      mainDb.prepare("SELECT * FROM expenses").all(),
      "expense",
      "id",
    );
  })();

  console.log(
    `[TALLY] Scan complete. ${totalChanges} pending operations found.`,
  );
  return totalChanges;
}

// --- PHASE 2: XML GENERATORS ---

function buildLedgerXML(id, entityType, actionType) {
  const mainDb = dbProxy;
  const table = entityType === "customer" ? "customers" : "suppliers";
  const parentGroup =
    entityType === "customer" ? "Sundry Debtors" : "Sundry Creditors";

  const entity = mainDb.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!entity && actionType !== "Delete") return null;

  const name = escapeXML(entity.name);
  const gstin = escapeXML(entity.gst_no || entity.gst_number || "");
  const state = escapeXML(entity.state || "");
  const pincode = escapeXML(entity.pincode || "");
  const address = escapeXML(entity.address || "");

  if (actionType === "Delete") {
    return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="${name}" ACTION="Delete"><NAME.LIST><NAME>${name}</NAME></NAME.LIST></LEDGER></TALLYMESSAGE>`;
  }

  return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
    <LEDGER NAME="${name}" ACTION="${actionType}">
      <NAME.LIST>
        <NAME>${name}</NAME>
      </NAME.LIST>
      <PARENT>${parentGroup}</PARENT>
      <ISBILLWISEON>Yes</ISBILLWISEON>
      <AFFECTSSTOCK>No</AFFECTSSTOCK>
      ${address ? `<ADDRESS.LIST><ADDRESS>${address}</ADDRESS></ADDRESS.LIST>` : ""}
      ${state ? `<LEDSTATENAME>${state}</LEDSTATENAME>` : ""}
      ${pincode ? `<PINCODE>${pincode}</PINCODE>` : ""}
      ${gstin ? `<PARTYGSTIN>${gstin}</PARTYGSTIN>` : ""}
    </LEDGER>
  </TALLYMESSAGE>`;
}

function buildSaleXML(id, actionType, settings) {
  const mainDb = dbProxy;
  const sale = mainDb.prepare("SELECT * FROM sales WHERE id = ?").get(id);
  if (!sale && actionType !== "Delete") return null;

  const partyName = escapeXML(sale.customer_name || settings.cash_ledger);
  const date = formatTallyDate(sale.created_at);
  const ref = escapeXML(sale.reference_no);

  if (actionType === "Delete") {
    return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Delete"><DATE>${date}</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><VOUCHERNUMBER>${ref}</VOUCHERNUMBER></VOUCHER></TALLYMESSAGE>`;
  }

  const items = mainDb
    .prepare("SELECT * FROM sales_items WHERE sale_id = ?")
    .all(id);
  let totalTaxableRaw = 0,
    totalCGSTRaw = 0,
    totalSGSTRaw = 0;

  // Accurately split row totals into Taxable and Tax
  items.forEach((item) => {
    const gstRate = item.gst_rate || 0;
    const itemPrice = Number(item.price);
    const taxable = itemPrice / (1 + gstRate / 100);
    const tax = itemPrice - taxable;

    totalTaxableRaw += taxable;
    totalCGSTRaw += tax / 2;
    totalSGSTRaw += tax / 2;
  });

  // EXACT PRECISION MATCHING TO PREVENT TALLY REJECTION
  const xmlTaxable = Number(totalTaxableRaw.toFixed(2));
  const xmlCGST = Number(totalCGSTRaw.toFixed(2));
  const xmlSGST = Number(totalSGSTRaw.toFixed(2));
  const xmlTotalAmount = Number(sale.total_amount.toFixed(2));

  const calculatedTotal = Number((xmlTaxable + xmlCGST + xmlSGST).toFixed(2));
  const diff = Number((xmlTotalAmount - calculatedTotal).toFixed(2));

  let xml = `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="${actionType}">
    <DATE>${date}</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><VOUCHERNUMBER>${ref}</VOUCHERNUMBER><PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME><PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW><ISINVOICE>No</ISINVOICE>
    <!-- DEBIT PARTY -->
    <ALLLEDGERENTRIES.LIST><LEDGERNAME>${partyName}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${xmlTotalAmount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>
    <!-- CREDIT SALES -->
    <ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(settings.sales_ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${xmlTaxable.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;

  if (xmlCGST > 0)
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(settings.cgst_ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${xmlCGST.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
  if (xmlSGST > 0)
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(settings.sgst_ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${xmlSGST.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;

  // Automatically balance global discount / fractional round-offs exactly
  if (diff !== 0) {
    const isDebit = diff < 0 ? "Yes" : "No";
    const ledger =
      diff < -2 ? settings.discount_ledger : settings.round_off_ledger;
    const formattedDiff =
      isDebit === "Yes" ? diff.toFixed(2) : Math.abs(diff).toFixed(2);
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>${isDebit}</ISDEEMEDPOSITIVE><AMOUNT>${formattedDiff}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
  }

  return xml + `</VOUCHER></TALLYMESSAGE>`;
}

function buildPurchaseXML(id, actionType, settings) {
  const mainDb = dbProxy;
  const pur = mainDb
    .prepare(
      "SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?",
    )
    .get(id);
  if (!pur && actionType !== "Delete") return null;

  const partyName = escapeXML(pur.supplier_name || settings.cash_ledger);
  const date = formatTallyDate(pur.date);
  const ref = escapeXML(pur.reference_no);

  if (actionType === "Delete")
    return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Purchase" ACTION="Delete"><DATE>${date}</DATE><VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME><VOUCHERNUMBER>${ref}</VOUCHERNUMBER></VOUCHER></TALLYMESSAGE>`;

  const items = mainDb
    .prepare("SELECT * FROM purchase_items WHERE purchase_id = ?")
    .all(id);
  let totalTaxableRaw = 0,
    totalCGSTRaw = 0,
    totalSGSTRaw = 0;

  items.forEach((item) => {
    const gstRate = item.gst_rate || 0;
    const itemPrice = Number(item.price);
    const taxable = itemPrice / (1 + gstRate / 100);
    const tax = itemPrice - taxable;

    totalTaxableRaw += taxable;
    totalCGSTRaw += tax / 2;
    totalSGSTRaw += tax / 2;
  });

  const xmlTaxable = Number(totalTaxableRaw.toFixed(2));
  const xmlCGST = Number(totalCGSTRaw.toFixed(2));
  const xmlSGST = Number(totalSGSTRaw.toFixed(2));
  const xmlTotalAmount = Number(pur.total_amount.toFixed(2));

  const calculatedTotal = Number((xmlTaxable + xmlCGST + xmlSGST).toFixed(2));
  const diff = Number((xmlTotalAmount - calculatedTotal).toFixed(2));

  let xml = `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Purchase" ACTION="${actionType}">
    <DATE>${date}</DATE><VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME><VOUCHERNUMBER>${ref}</VOUCHERNUMBER><PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME><PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW><ISINVOICE>No</ISINVOICE>
    <!-- CREDIT PARTY -->
    <ALLLEDGERENTRIES.LIST><LEDGERNAME>${partyName}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${xmlTotalAmount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>
    <!-- DEBIT PURCHASE -->
    <ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(settings.purchase_ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${xmlTaxable.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;

  if (xmlCGST > 0)
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(settings.cgst_ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${xmlCGST.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
  if (xmlSGST > 0)
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(settings.sgst_ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${xmlSGST.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;

  if (diff !== 0) {
    const isDebit = diff > 0 ? "Yes" : "No";
    const ledger =
      diff < -2 ? settings.discount_ledger : settings.round_off_ledger;
    const formattedDiff =
      isDebit === "Yes"
        ? (-Math.abs(diff)).toFixed(2)
        : Math.abs(diff).toFixed(2);
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>${isDebit}</ISDEEMEDPOSITIVE><AMOUNT>${formattedDiff}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
  }

  return xml + `</VOUCHER></TALLYMESSAGE>`;
}

function buildTransactionXML(id, actionType, settings) {
  const mainDb = dbProxy;
  const txn = mainDb.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
  if (!txn && actionType !== "Delete") return null;

  const vchType = txn.type === "payment_in" ? "Receipt" : "Payment";
  const isReceipt = vchType === "Receipt";
  const date = formatTallyDate(txn.transaction_date);
  const ref = escapeXML(txn.reference_no);

  if (actionType === "Delete")
    return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${vchType}" ACTION="Delete"><DATE>${date}</DATE><VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME><VOUCHERNUMBER>${ref}</VOUCHERNUMBER></VOUCHER></TALLYMESSAGE>`;

  let partyName = "Unknown";
  if (txn.entity_type === "customer") {
    const c = mainDb
      .prepare("SELECT name FROM customers WHERE id = ?")
      .get(txn.entity_id);
    partyName = c ? c.name : "Cash";
  } else if (txn.entity_type === "supplier") {
    const s = mainDb
      .prepare("SELECT name FROM suppliers WHERE id = ?")
      .get(txn.entity_id);
    partyName = s ? s.name : "Cash";
  }
  partyName = escapeXML(partyName);

  const cashBankLedger =
    txn.payment_mode?.toLowerCase() === "cash"
      ? settings.cash_ledger
      : settings.bank_ledger;

  let xml = `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${vchType}" ACTION="${actionType}"><DATE>${date}</DATE><VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME><VOUCHERNUMBER>${ref}</VOUCHERNUMBER>`;

  if (isReceipt) {
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${partyName}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${txn.amount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(cashBankLedger)}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${txn.amount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
  } else {
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${partyName}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${txn.amount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
    xml += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(cashBankLedger)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${txn.amount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
  }

  return xml + `</VOUCHER></TALLYMESSAGE>`;
}

function buildExpenseXML(id, actionType, settings) {
  const mainDb = dbProxy;
  const exp = mainDb.prepare("SELECT * FROM expenses WHERE id = ?").get(id);
  if (!exp && actionType !== "Delete") return null;

  const date = formatTallyDate(exp.date);
  const ref = escapeXML(`EXP-${id}`);

  if (actionType === "Delete")
    return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Payment" ACTION="Delete"><DATE>${date}</DATE><VOUCHERTYPENAME>Payment</VOUCHERTYPENAME><VOUCHERNUMBER>${ref}</VOUCHERNUMBER></VOUCHER></TALLYMESSAGE>`;

  const cashBankLedger =
    exp.payment_mode?.toLowerCase() === "cash"
      ? settings.cash_ledger
      : settings.bank_ledger;
  const expenseLedger = escapeXML(exp.category);

  return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Payment" ACTION="${actionType}">
    <DATE>${date}</DATE><VOUCHERTYPENAME>Payment</VOUCHERTYPENAME><VOUCHERNUMBER>${ref}</VOUCHERNUMBER><NARRATION>${escapeXML(exp.description)}</NARRATION>
    <ALLLEDGERENTRIES.LIST><LEDGERNAME>${expenseLedger}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${exp.amount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXML(cashBankLedger)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${exp.amount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>
  </VOUCHER></TALLYMESSAGE>`;
}

// --- PHASE 3: PROCESS & PUSH TO HTTP PORT ---
export async function processSyncQueue() {
  const tDb = getTallyDb();
  const settings = tDb
    .prepare("SELECT * FROM tally_settings WHERE id = 1")
    .get();

  const pendingQueue = tDb
    .prepare(
      `
    SELECT * FROM sync_state 
    WHERE status = 'pending' 
    ORDER BY 
      CASE 
        WHEN entity_type IN ('customer', 'supplier') THEN 1 
        ELSE 2 
      END,
      entity_id 
    LIMIT 100
  `,
    )
    .all();

  if (pendingQueue.length === 0)
    return { success: true, message: "Queue is empty. Everything is synced!" };

  let successCount = 0;
  let failCount = 0;

  for (const item of pendingQueue) {
    let rawXml = null;
    let reportType = "Vouchers";

    if (item.entity_type === "customer" || item.entity_type === "supplier") {
      rawXml = buildLedgerXML(
        item.entity_id,
        item.entity_type,
        item.action_type,
      );
      reportType = "All Masters";
    } else if (item.entity_type === "sale")
      rawXml = buildSaleXML(item.entity_id, item.action_type, settings);
    else if (item.entity_type === "purchase")
      rawXml = buildPurchaseXML(item.entity_id, item.action_type, settings);
    else if (item.entity_type === "transaction")
      rawXml = buildTransactionXML(item.entity_id, item.action_type, settings);
    else if (item.entity_type === "expense")
      rawXml = buildExpenseXML(item.entity_id, item.action_type, settings);

    if (!rawXml) {
      tDb
        .prepare(
          "UPDATE sync_state SET status = 'failed', error_log = 'Orphaned record in main DB' WHERE entity_type = ? AND entity_id = ?",
        )
        .run(item.entity_type, item.entity_id);
      failCount++;
      continue;
    }

    const payload = wrapTallyXML(rawXml, reportType);

    try {
      const response = await fetch(settings.tally_url, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: payload,
      });
      const responseText = await response.text();

      if (
        responseText.includes("<CREATED>1</CREATED>") ||
        responseText.includes("<ALTERED>1</ALTERED>") ||
        responseText.includes("<DELETED>1</DELETED>")
      ) {
        if (item.action_type === "Delete") {
          tDb
            .prepare(
              "UPDATE sync_state SET status = 'deleted' WHERE entity_type = ? AND entity_id = ?",
            )
            .run(item.entity_type, item.entity_id);
        } else {
          tDb
            .prepare(
              "UPDATE sync_state SET status = 'success', action_type = 'Alter', error_log = NULL, retry_count = 0 WHERE entity_type = ? AND entity_id = ?",
            )
            .run(item.entity_type, item.entity_id);
        }
        successCount++;
      } else {
        // Detailed error parsing
        let errMsg =
          "Tally Rejected XML (Silent Failure). Usually caused by Date bounds in Edu mode.";
        const errMatch =
          responseText.match(/<LINEERROR>(.*?)<\/LINEERROR>/) ||
          responseText.match(/<DESC>(.*?)<\/DESC>/);
        if (errMatch) errMsg = errMatch[1];

        throw new Error(errMsg);
      }
    } catch (error) {
      tDb
        .prepare(
          "UPDATE sync_state SET status = 'failed', retry_count = retry_count + 1, error_log = ? WHERE entity_type = ? AND entity_id = ?",
        )
        .run(error.message, item.entity_type, item.entity_id);
      failCount++;
    }
  }

  return {
    success: true,
    message: `Synced: ${successCount}. Failed: ${failCount}.`,
  };
}
