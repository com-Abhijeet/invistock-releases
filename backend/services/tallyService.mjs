import db from "../db/db.mjs";
import {
  getTallyConfigs,
  logTallySync,
  isEntitySynced,
  setTallyConfig,
} from "../db/tallyDb.mjs";
import { sendToTally } from "../tally-sync/tallyHttpClient.mjs";
import * as xmlGen from "../tally-sync/tallyXMLGenerator.mjs";

const getDb = () => db;

function emitProgress(emitCb, type, message) {
  if (emitCb) {
    emitCb({ type, message });
  }
}

export const tallyService = {
  getConfigs: () => {
    return getTallyConfigs();
  },

  saveConfigs: (configs) => {
    for (const [key, value] of Object.entries(configs)) {
      setTallyConfig(key, value);
    }
    return getTallyConfigs();
  },

  pingTally: async () => {
    // Just send an empty request to check connection
    const result = await sendToTally("<ENVELOPE></ENVELOPE>");
    return result; // It will probably fail parsing, but if success is true or false without ECONNREFUSED, it's alive.
  },

  ensureBaseLedgers: async (emitCb) => {
    const configs = getTallyConfigs();
    const baseLedgers = [
      {
        name: configs.default_sales_ledger || "Sales A/c",
        parent: "Sales Accounts",
      },
      {
        name: configs.default_purchase_ledger || "Purchase A/c",
        parent: "Purchase Accounts",
      },
      {
        name: configs.default_discount_ledger || "Discount",
        parent: "Indirect Expenses",
      },
      {
        name: configs.default_roundoff_ledger || "Round Off",
        parent: "Indirect Expenses",
      },
      { name: configs.default_cgst_ledger || "CGST", parent: "Duties & Taxes" },
      { name: configs.default_sgst_ledger || "SGST", parent: "Duties & Taxes" },
      { name: configs.default_igst_ledger || "IGST", parent: "Duties & Taxes" },
      { name: configs.default_cash_ledger || "Cash", parent: "Cash-in-hand" },
      {
        name: configs.default_bank_ledger || "Bank A/c",
        parent: "Bank Accounts",
      },
      {
        name: configs.default_expense_ledger || "General Expenses",
        parent: "Indirect Expenses",
      },
    ];

    for (const bl of baseLedgers) {
      if (!bl.name) continue;
      const alterId = `KOSH-BASE-LEDGER-${bl.name.replace(/\s+/g, "-")}`;
      const xml = xmlGen.generateBaseLedgerXML(bl.name, bl.parent);
      const res = await sendToTally(xml);
      logTallySync(
        "base_ledger",
        bl.name,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        alterId,
      );
    }

    // Ensure Godown
    const godownName = configs.default_godown || "Main Location";
    const godownAlterId = `KOSH-GODOWN-${godownName.replace(/\s+/g, "-")}`;
    const godownXml = xmlGen.generateGodownXML(godownName);
    const gRes = await sendToTally(godownXml);
    logTallySync(
      "godown",
      godownName,
      gRes.success ? "SUCCESS" : "FAILED",
      gRes.error,
      gRes.request,
      gRes.response,
      godownAlterId,
    );

    // Ensure Voucher Types have Automatic (Manual Override)
    const voucherTypes = ["Sales", "Purchase", "Receipt", "Payment", "Journal"];
    for (const vt of voucherTypes) {
      const vtXml = xmlGen.generateVoucherTypeXML(vt);
      const vtRes = await sendToTally(vtXml);
      logTallySync(
        "voucher_type",
        vt,
        vtRes.success ? "SUCCESS" : "FAILED",
        vtRes.error,
        vtRes.request,
        vtRes.response,
        `KOSH-VT-${vt}`,
      );
    }

    // Ensure Units of Measure (From config + DB)
    const uomSet = new Set();

    // 1. Configured default units
    const defaultUnits = (configs.default_units || "pcs,kg,g,ltr,doz,box")
      .split(",")
      .map((u) => u.trim())
      .filter((u) => u);
    defaultUnits.forEach((u) => uomSet.add(u));

    // 2. Extracted from Database
    try {
      const db = getDb();
      db.prepare(
        `SELECT DISTINCT base_unit FROM products WHERE base_unit IS NOT NULL`,
      )
        .all()
        .forEach((r) => uomSet.add(r.base_unit));
      db.prepare(
        `SELECT DISTINCT secondary_unit FROM products WHERE secondary_unit IS NOT NULL`,
      )
        .all()
        .forEach((r) => uomSet.add(r.secondary_unit));
      db.prepare(`SELECT DISTINCT unit FROM sales_items WHERE unit IS NOT NULL`)
        .all()
        .forEach((r) => uomSet.add(r.unit));
      db.prepare(
        `SELECT DISTINCT unit FROM purchase_items WHERE unit IS NOT NULL`,
      )
        .all()
        .forEach((r) => uomSet.add(r.unit));
    } catch (e) {
      console.error("[TallySync] Error extracting DB units:", e);
    }

    for (const unitName of uomSet) {
      const xml = xmlGen.generateUnitXML(unitName);
      const res = await sendToTally(xml);
      logTallySync(
        "uom",
        unitName,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-UOM-${unitName}`,
      );
    }

    // Ensure Expense Categories (From DB)
    try {
      const db = getDb();
      const expenseCategories = db
        .prepare(
          `SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL`,
        )
        .all();
      for (const row of expenseCategories) {
        const catName = row.category.trim();
        if (!catName) continue;
        const alterId = `KOSH-EXP-LEDGER-${catName.replace(/\s+/g, "-")}`;
        const xml = xmlGen.generateBaseLedgerXML(catName, "Indirect Expenses");
        const res = await sendToTally(xml);
        logTallySync(
          "base_ledger",
          catName,
          res.success ? "SUCCESS" : "FAILED",
          res.error,
          res.request,
          res.response,
          alterId,
        );
      }
    } catch (e) {
      console.error("[TallySync] Error extracting DB expense categories:", e);
    }
  },

  syncMasters: async (emitCb) => {
    const db = getDb();
    emitProgress(emitCb, "info", "Starting Master Data Sync...");

    await tallyService.ensureBaseLedgers(emitCb);
    emitProgress(emitCb, "info", "Base Configs, Godowns, and Units Synced.");

    // 1. Product Categories (Stock Groups)
    const categories = db.prepare(`SELECT * FROM categories`).all();
    for (const cat of categories) {
      if (isEntitySynced("category", cat.id)) continue;
      const xml = xmlGen.generateStockGroupXML(cat);
      const res = await sendToTally(xml);
      logTallySync(
        "category",
        cat.id,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-CAT-${cat.id}`,
      );
      emitProgress(
        emitCb,
        res.success ? "success" : "error",
        `Category [${cat.name}]: ${res.success ? "Synced" : res.error}`,
      );
    }

    // 3. Products (STOCKITEM)
    const products = db
      .prepare(
        `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category = c.id
        `,
      )
      .all();
    for (const prod of products) {
      if (isEntitySynced("product", prod.id)) continue;
      const xml = xmlGen.generateStockItemXML(prod, prod.category_name);
      const res = await sendToTally(xml);
      logTallySync(
        "product",
        prod.id,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-ITEM-${prod.id}`,
      );
      emitProgress(
        emitCb,
        res.success ? "success" : "error",
        `Product [${prod.name}]: ${res.success ? "Synced" : res.error}`,
      );
    }

    // 4. Customers (LEDGER - Sundry Debtors)
    const customers = db.prepare(`SELECT * FROM customers`).all();
    for (const cust of customers) {
      if (isEntitySynced("customer", cust.id)) continue;
      const xml = xmlGen.generateLedgerXML(cust, "Sundry Debtors");
      const res = await sendToTally(xml);
      logTallySync(
        "customer",
        cust.id,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-LEDGER-${cust.id}`,
      );
      emitProgress(
        emitCb,
        res.success ? "success" : "error",
        `Customer [${cust.name}]: ${res.success ? "Synced" : res.error}`,
      );
    }

    // 5. Suppliers (LEDGER - Sundry Creditors)
    const suppliers = db.prepare(`SELECT * FROM suppliers`).all();
    for (const sup of suppliers) {
      if (isEntitySynced("supplier", sup.id)) continue;
      const xml = xmlGen.generateLedgerXML(sup, "Sundry Creditors");
      const res = await sendToTally(xml);
      logTallySync(
        "supplier",
        sup.id,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-LEDGER-${sup.id}`,
      );
      emitProgress(
        emitCb,
        res.success ? "success" : "error",
        `Supplier [${sup.name}]: ${res.success ? "Synced" : res.error}`,
      );
    }

    emitProgress(emitCb, "info", "Master Data Sync Complete.");
  },

  syncSales: async (startDate, endDate, emitCb) => {
    const db = getDb();
    const configs = getTallyConfigs();
    emitProgress(
      emitCb,
      "info",
      `Starting Sales Sync (${startDate || "All Time"} to ${endDate || "Now"})...`,
    );

    await tallyService.ensureBaseLedgers(emitCb);

    let query = `SELECT * FROM sales`;
    let params = [];
    if (startDate && endDate) {
      query += ` WHERE created_at BETWEEN ? AND ?`;
      params = [startDate, endDate];
    } else if (startDate) {
      query += ` WHERE created_at >= ?`;
      params = [startDate];
    }

    const sales = db.prepare(query).all(...params);

    for (const sale of sales) {
      if (isEntitySynced("sale", sale.id)) continue;

      const items = db
        .prepare(`SELECT * FROM sales_items WHERE sale_id = ?`)
        .all(sale.id);
      const xml = xmlGen.generateVoucherXML(sale, items, "Sales", configs);
      const res = await sendToTally(xml);

      logTallySync(
        "sale",
        sale.id,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-SALES-${sale.id}`,
      );
      emitProgress(
        emitCb,
        res.success ? "success" : "error",
        `Sale [${sale.reference_no}]: ${res.success ? "Synced" : res.error}`,
      );
    }
    emitProgress(emitCb, "info", "Sales Sync Complete.");
  },

  syncPurchases: async (startDate, endDate, emitCb) => {
    const db = getDb();
    const configs = getTallyConfigs();
    emitProgress(emitCb, "info", `Starting Purchases Sync...`);

    await tallyService.ensureBaseLedgers(emitCb);

    let query = `SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id`;
    let params = [];
    if (startDate && endDate) {
      query += ` WHERE p.created_at BETWEEN ? AND ?`;
      params = [startDate, endDate];
    }

    const purchases = db.prepare(query).all(...params);

    for (const purchase of purchases) {
      if (isEntitySynced("purchase", purchase.id)) continue;

      const items = db
        .prepare(
          `SELECT pi.*, pr.name as product_name FROM purchase_items pi JOIN products pr ON pi.product_id = pr.id WHERE pi.purchase_id = ?`,
        )
        .all(purchase.id);
      const xml = xmlGen.generateVoucherXML(
        purchase,
        items,
        "Purchase",
        configs,
      );
      const res = await sendToTally(xml);

      logTallySync(
        "purchase",
        purchase.id,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-PURCHASE-${purchase.id}`,
      );
      emitProgress(
        emitCb,
        res.success ? "success" : "error",
        `Purchase [${purchase.reference_no}]: ${res.success ? "Synced" : res.error}`,
      );
    }
    emitProgress(emitCb, "info", "Purchase Sync Complete.");
  },

  syncTransactions: async (startDate, endDate, emitCb) => {
    const db = getDb();
    const configs = getTallyConfigs();
    emitProgress(emitCb, "info", `Starting Transactions Sync...`);

    await tallyService.ensureBaseLedgers(emitCb);
    emitProgress(emitCb, "info", "Base Config Ledgers Synced.");

    let query = `
            SELECT t.*, 
                   CASE WHEN t.bill_type = 'sale' THEN s.customer_name ELSE sup.name END as entity_name,
                   CASE WHEN t.bill_type = 'sale' THEN s.reference_no ELSE p.reference_no END as bill_reference_no
            FROM transactions t
            LEFT JOIN sales s ON t.bill_id = s.id AND t.bill_type = 'sale'
            LEFT JOIN purchases p ON t.bill_id = p.id AND t.bill_type = 'purchase'
            LEFT JOIN suppliers sup ON p.supplier_id = sup.id
            WHERE t.status != 'deleted' AND t.status != 'cancelled'
        `;
    let params = [];
    if (startDate && endDate) {
      query += ` AND DATE(t.transaction_date) BETWEEN DATE(?) AND DATE(?)`;
      params.push(startDate, endDate);
    }

    const transactions = db.prepare(query).all(...params);
    for (const txn of transactions) {
      // Check if already synced (optional - for now we push, Tally alters on duplicate GUID)
      const xml = xmlGen.generateTransactionXML(txn, configs);
      const res = await sendToTally(xml);
      logTallySync(
        "transaction",
        txn.id,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-TXN-${txn.id}`,
      );
      emitProgress(
        emitCb,
        res.success ? "success" : "error",
        `Transaction [${txn.reference_no}]: ${res.success ? "Synced" : res.error}`,
      );
    }
  },

  syncExpenses: async (startDate, endDate, emitCb) => {
    const db = getDb();
    const configs = getTallyConfigs();
    emitProgress(emitCb, "info", `Starting Expenses Sync...`);

    await tallyService.ensureBaseLedgers(emitCb);
    emitProgress(emitCb, "info", "Base Config Ledgers Synced.");

    let query = `SELECT * FROM expenses`;
    let params = [];
    if (startDate && endDate) {
      query += ` WHERE DATE(date) BETWEEN DATE(?) AND DATE(?)`;
      params.push(startDate, endDate);
    }

    const expenses = db.prepare(query).all(...params);
    for (const exp of expenses) {
      const xml = xmlGen.generateExpenseXML(exp, configs);
      const res = await sendToTally(xml);
      logTallySync(
        "expense",
        exp.id,
        res.success ? "SUCCESS" : "FAILED",
        res.error,
        res.request,
        res.response,
        `KOSH-EXP-${exp.id}`,
      );
      emitProgress(
        emitCb,
        res.success ? "success" : "error",
        `Expense [${exp.id} - ${exp.category}]: ${res.success ? "Synced" : res.error}`,
      );
    }
  },
};
