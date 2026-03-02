import db from "../db/db.mjs";
import { getShop as getShopData } from "./shopRepository.mjs";
import { STATE_CODE_MAP } from "../utils/stateCodes.mjs";
import { calculateGstPeriodDates } from "../utils/calculateGstPeriodDates.mjs";

/**
 * @description Fetches and categorizes data for a GSTR-2 (Purchases/Inward Supplies) report.
 */
export async function getGstr2ReportData({ periodType, year, month, quarter }) {
  try {
    const shop = await getShopData();
    if (!shop || !shop.gstin || !shop.state) {
      throw new Error(
        "Shop GSTIN and State are required for GSTR-2 reporting.",
      );
    }

    // Default to exclusive if the flag isn't set
    const isInclusive =
      shop.is_inclusive || shop.print_type === "inclusive" || false;

    const { startDate, endDate } = calculateGstPeriodDates({
      periodType,
      year,
      month,
      quarter,
    });

    // --- 1. Fetch all purchase items within the calculated date range ---
    // Uses direct joins based on the provided purchase schema
    const taxablePurchasesQuery = db.prepare(`
      SELECT
        p.id as purchase_id,
        p.reference_no,
        p.date as invoice_date,
        p.total_amount as invoice_value,
        p.is_reverse_charge,
        s.gst_number as supplier_gstin,
        s.state as supplier_state,
        pr.hsn as hsn,
        pr.name as product_description,
        pi.quantity,
        pi.rate,
        pi.discount,
        pi.gst_rate
      FROM purchases p
      JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN products pr ON pi.product_id = pr.id
      WHERE date(p.date) BETWEEN ? AND ?
    `);

    const allTaxablePurchaseItems = taxablePurchasesQuery.all(
      startDate,
      endDate,
    );

    // --- 2. Process data into GSTR-2 sections ---
    const purchasesGroupedById = _groupPurchaseItems(allTaxablePurchaseItems);
    const { b2b, b2bur } = _processInwardSupplies(
      purchasesGroupedById,
      shop,
      isInclusive,
    );
    const hsn = _processHsnSummary(allTaxablePurchaseItems, shop, isInclusive);
    const { cdnr, cdnur } = _fetchAndProcessPurchaseNotes(
      shop,
      startDate,
      endDate,
    );
    const nil = _fetchNilRatedPurchases(shop, startDate, endDate);

    return { b2b, b2bur, hsn, cdnr, cdnur, nil };
  } catch (error) {
    console.error("Error generating GSTR-2 repository data:", error.message);
    throw new Error("Failed to fetch GSTR-2 data.");
  }
}

// ✅ ---------------- HELPER: Group raw SQL results ----------------
function _groupPurchaseItems(allItems) {
  return allItems.reduce((acc, item) => {
    if (!acc[item.purchase_id]) {
      acc[item.purchase_id] = {
        invoice_no: item.reference_no,
        invoice_date: item.invoice_date,
        invoice_value: item.invoice_value,
        is_reverse_charge: item.is_reverse_charge,
        supplier_gstin: item.supplier_gstin,
        supplier_state: item.supplier_state,
        items: [],
      };
    }
    acc[item.purchase_id].items.push(item);
    return acc;
  }, {});
}

// ✅ ---------------- HELPER: Shared Tax Calculation Logic ----------------
function _calculateItemTax(item, isInclusive) {
  const rate = parseFloat(item.rate) || 0;
  const quantity = parseFloat(item.quantity) || 0;
  const discount = parseFloat(item.discount) || 0;
  const gstRate = parseFloat(item.gst_rate) || 0;

  const baseValue = rate * quantity * (1 - discount / 100.0);
  let taxableValue = 0;
  let taxAmount = 0;

  if (isInclusive) {
    taxableValue = baseValue / (1 + gstRate / 100.0);
    taxAmount = baseValue - taxableValue;
  } else {
    taxableValue = baseValue;
    taxAmount = taxableValue * (gstRate / 100.0);
  }

  return { taxableValue, taxAmount, totalValue: taxableValue + taxAmount };
}

// ✅ ---------------- HELPER: Process Inward Supplies (B2B & B2BUR) ----------------
function _processInwardSupplies(purchasesGrouped, shop, isInclusive) {
  const b2bMap = new Map(); // Purchases from Registered Suppliers
  const b2bur = []; // Purchases from Unregistered Suppliers

  for (const purchaseId in purchasesGrouped) {
    const purchase = purchasesGrouped[purchaseId];
    const supplierState = purchase.supplier_state || shop.state;
    const isInterstate =
      shop.state.toLowerCase() !== supplierState.toLowerCase();

    const invoiceJson = {
      inum: purchase.invoice_no,
      idt: new Date(purchase.invoice_date)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-"),
      val: parseFloat(purchase.invoice_value.toFixed(2)),
      pos: STATE_CODE_MAP[supplierState] || STATE_CODE_MAP[shop.state],
      rchrg: purchase.is_reverse_charge ? "Y" : "N",
      itms: [],
    };

    for (const item of purchase.items) {
      const { taxableValue, taxAmount } = _calculateItemTax(item, isInclusive);
      const igst_amount = isInterstate ? taxAmount : 0;
      const cgst_amount = isInterstate ? 0 : taxAmount / 2;
      const sgst_amount = isInterstate ? 0 : taxAmount / 2;

      invoiceJson.itms.push({
        num: invoiceJson.itms.length + 1,
        itm_det: {
          txval: parseFloat(taxableValue.toFixed(2)),
          rt: item.gst_rate,
          iamt: parseFloat(igst_amount.toFixed(2)),
          camt: parseFloat(cgst_amount.toFixed(2)),
          samt: parseFloat(sgst_amount.toFixed(2)),
          csamt: 0,
        },
      });
    }

    if (purchase.supplier_gstin) {
      // B2B (Registered)
      if (!b2bMap.has(purchase.supplier_gstin)) {
        b2bMap.set(purchase.supplier_gstin, {
          ctin: purchase.supplier_gstin,
          inv: [],
        });
      }
      b2bMap.get(purchase.supplier_gstin).inv.push(invoiceJson);
    } else {
      // B2BUR (Unregistered)
      b2bur.push(invoiceJson);
    }
  }

  return {
    b2b: Array.from(b2bMap.values()),
    b2bur,
  };
}

// ✅ ---------------- HELPER: Process HSN Summary ----------------
function _processHsnSummary(allTaxableItems, shop, isInclusive) {
  const hsnMap = new Map();

  for (const item of allTaxableItems) {
    if (item.gst_rate <= 0) continue;

    const hsnCode = item.hsn || "UNKNOWN";
    const key = `${hsnCode}-${item.product_description}`;

    if (!hsnMap.has(key)) {
      hsnMap.set(key, {
        hsn_sc: hsnCode,
        desc: item.product_description,
        uqc: "NOS",
        qty: 0,
        val: 0,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      });
    }

    const entry = hsnMap.get(key);
    const { taxableValue, taxAmount, totalValue } = _calculateItemTax(
      item,
      isInclusive,
    );
    const supplierState = item.supplier_state || shop.state;
    const isInterstate =
      shop.state.toLowerCase() !== supplierState.toLowerCase();

    entry.qty += item.quantity;
    entry.txval += taxableValue;
    entry.val += totalValue;

    if (isInterstate) {
      entry.iamt += taxAmount;
    } else {
      entry.camt += taxAmount / 2;
      entry.samt += taxAmount / 2;
    }
  }

  return {
    data: Array.from(hsnMap.values()).map((item, index) => ({
      ...item,
      num: index + 1,
      qty: parseFloat(item.qty.toFixed(2)),
      val: parseFloat(item.val.toFixed(2)),
      txval: parseFloat(item.txval.toFixed(2)),
      iamt: parseFloat(item.iamt.toFixed(2)),
      camt: parseFloat(item.camt.toFixed(2)),
      samt: parseFloat(item.samt.toFixed(2)),
    })),
  };
}

// ✅ ---------------- HELPER: Fetch Purchase Notes ----------------
function _fetchAndProcessPurchaseNotes(shop, startDate, endDate) {
  const notesQuery = db.prepare(`
    SELECT
        t.reference_no as note_no, t.transaction_date as note_date, t.type as note_type, t.amount as note_value, t.gst_amount,
        s.gst_number as supplier_gstin, s.state as supplier_state
    FROM transactions t
    LEFT JOIN suppliers s ON t.entity_id = s.id AND t.entity_type = 'supplier'
    LEFT JOIN purchases p ON t.bill_id = p.id AND t.bill_type = 'purchase'
    WHERE t.type IN ('credit_note', 'debit_note') AND date(t.transaction_date) BETWEEN ? AND ? AND t.entity_type = 'supplier'
  `);

  const allNotes = notesQuery.all(startDate, endDate);
  const cdnrMap = new Map();
  const cdnur = [];

  for (const note of allNotes) {
    const gstAmt = note.gst_amount || 0;
    const taxable_value = note.note_value - gstAmt;
    const calculated_rate =
      taxable_value > 0 ? (gstAmt / taxable_value) * 100 : 0;
    const supplierState = note.supplier_state || shop.state;
    const isInterstate =
      shop.state.toLowerCase() !== supplierState.toLowerCase();

    const noteJson = {
      nt_num: note.note_no,
      nt_dt: new Date(note.note_date)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-"),
      ntty: note.note_type === "credit_note" ? "C" : "D",
      p_gst: "N",
      rchrg: "N",
      val: parseFloat(note.note_value.toFixed(2)),
      itms: [
        {
          num: 1,
          itm_det: {
            txval: parseFloat(taxable_value.toFixed(2)),
            rt: parseFloat(calculated_rate.toFixed(2)),
            iamt: parseFloat((isInterstate ? gstAmt : 0).toFixed(2)),
            camt: parseFloat((isInterstate ? 0 : gstAmt / 2).toFixed(2)),
            samt: parseFloat((isInterstate ? 0 : gstAmt / 2).toFixed(2)),
            csamt: 0,
          },
        },
      ],
    };

    if (note.supplier_gstin) {
      if (!cdnrMap.has(note.supplier_gstin))
        cdnrMap.set(note.supplier_gstin, { ctin: note.supplier_gstin, nt: [] });
      cdnrMap.get(note.supplier_gstin).nt.push(noteJson);
    } else {
      cdnur.push({ ...noteJson, typ: "B2BUR" });
    }
  }

  return { cdnr: Array.from(cdnrMap.values()), cdnur };
}

// ✅ ---------------- HELPER: Nil Rated Purchases ----------------
function _fetchNilRatedPurchases(shop, startDate, endDate) {
  const nilRatedQuery = db.prepare(`
    SELECT
      CASE WHEN s.state IS NOT NULL AND LOWER(s.state) != LOWER(?) THEN 'INTER' ELSE 'INTRA' END as supply_type,
      SUM(pi.quantity * pi.rate * (1 - pi.discount/100.0)) as total_nil_rated_value
    FROM purchases p
    JOIN purchase_items pi ON p.id = pi.purchase_id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE date(p.date) BETWEEN ? AND ? AND pi.gst_rate = 0
    GROUP BY supply_type
  `);

  return {
    inv: nilRatedQuery
      .all(shop.state.toLowerCase(), startDate, endDate)
      .map((row) => ({
        sply_ty: row.supply_type,
        nil_amt: row.total_nil_rated_value,
        expt_amt: 0,
        ngsup_amt: 0,
      })),
  };
}
