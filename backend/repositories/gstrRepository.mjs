import db from "../db/db.mjs";
import { getShop as getShopData } from "./shopRepository.mjs";
import { STATE_CODE_MAP } from "../utils/stateCodes.mjs";
import { calculateGstPeriodDates } from "../utils/calculateGstPeriodDates.mjs";
import { performance } from "perf_hooks";

/**
 * @description Fetches and categorizes data for a GSTR-1 report, excluding returned quantities.
 */
export async function getGstr1ReportData({ periodType, year, month, quarter }) {
  try {
    const shop = await getShopData();
    if (!shop || !shop.gstin || !shop.state) {
      throw new Error(
        "Shop GSTIN and State are required for GSTR-1 reporting.",
      );
    }

    const isInclusive =
      shop.is_inclusive || shop.print_type === "inclusive" || false;
    const { startDate, endDate } = calculateGstPeriodDates({
      periodType,
      year,
      month,
      quarter,
    });

    // --- 1. Fetch all sale items (Net of returns) ---
    // ✅ FIX: Use (si.quantity - si.return_quantity) and exclude fully returned items
    const taxableSalesQuery = db.prepare(`
    SELECT
      s.id as sale_id,
      s.reference_no,
      s.created_at as invoice_date,
      s.total_amount as invoice_value,
      s.is_reverse_charge,
      COALESCE(s.gstin, c.gst_no) as customer_gstin,
      COALESCE(s.state, c.state) as customer_state,
      COALESCE(si.hsn, p.hsn) as hsn,
      COALESCE(si.product_name, p.name) as product_description,
      (si.quantity - COALESCE(si.return_quantity, 0)) as quantity,
      si.rate,
      si.discount,
      COALESCE(si.gst_rate, p.gst_rate, 0) as gst_rate
    FROM sales s
    JOIN sales_items si ON s.id = si.sale_id
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE date(s.created_at) BETWEEN ? AND ? 
      AND s.is_quote = 0 
      AND (si.quantity - COALESCE(si.return_quantity, 0)) > 0
  `);

    const allTaxableSaleItems = taxableSalesQuery.all(startDate, endDate);

    const salesGroupedById = _groupSaleItems(allTaxableSaleItems);
    const { b2b, b2cl, b2cs } = _processTaxableSales(
      salesGroupedById,
      shop,
      isInclusive,
    );
    const hsn = _processHsnSummary(allTaxableSaleItems, shop, isInclusive);
    const { cdnr, cdnur } = _fetchAndProcessNotes(shop, startDate, endDate);
    const nil = _fetchNilRatedSummary(shop, startDate, endDate);

    return { b2b, b2cl, b2cs, hsn, cdnr, cdnur, nil };
  } catch (error) {
    console.error("Error generating GSTR-1 repository data:", error.message);
    throw new Error("Failed to fetch GSTR-1 data.");
  }
}

// ✅ ---------------- HELPER: Group raw SQL results ----------------
function _groupSaleItems(allSaleItems) {
  return allSaleItems.reduce((acc, item) => {
    if (!acc[item.sale_id]) {
      acc[item.sale_id] = {
        invoice_no: item.reference_no,
        invoice_date: item.invoice_date,
        invoice_value: item.invoice_value,
        is_reverse_charge: item.is_reverse_charge,
        customer_gstin: item.customer_gstin,
        customer_state: item.customer_state,
        items: [],
      };
    }
    acc[item.sale_id].items.push(item);
    return acc;
  }, {});
}

// ✅ ---------------- HELPER: Tax Calculation ----------------
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

// ✅ ---------------- HELPER: Process sections ----------------
function _processTaxableSales(salesGroupedById, shop, isInclusive) {
  const b2bMap = new Map();
  const b2cl = [];
  const b2csAggregator = {};

  for (const saleId in salesGroupedById) {
    const sale = salesGroupedById[saleId];
    const customerState = sale.customer_state || shop.state;
    const isInterstate =
      shop.state.toLowerCase() !== customerState.toLowerCase();

    const invoiceJson = {
      inum: sale.invoice_no,
      idt: new Date(sale.invoice_date)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-"),
      val: parseFloat(sale.invoice_value.toFixed(2)),
      pos: STATE_CODE_MAP[customerState] || STATE_CODE_MAP[shop.state],
      rchrg: sale.is_reverse_charge ? "Y" : "N",
      itms: [],
    };

    for (const item of sale.items) {
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

    if (sale.customer_gstin) {
      if (!b2bMap.has(sale.customer_gstin)) {
        b2bMap.set(sale.customer_gstin, { ctin: sale.customer_gstin, inv: [] });
      }
      b2bMap.get(sale.customer_gstin).inv.push(invoiceJson);
    } else {
      if (isInterstate && sale.invoice_value > 250000) {
        b2cl.push(invoiceJson);
      } else {
        for (const itemJson of invoiceJson.itms) {
          const pos = invoiceJson.pos;
          const rate = itemJson.itm_det.rt;
          const b2csKey = `${pos}-${rate}`;
          if (!b2csAggregator[b2csKey]) {
            b2csAggregator[b2csKey] = {
              pos,
              rt: rate,
              txval: 0,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
            };
          }
          b2csAggregator[b2csKey].txval += itemJson.itm_det.txval;
          b2csAggregator[b2csKey].iamt += itemJson.itm_det.iamt;
          b2csAggregator[b2csKey].camt += itemJson.itm_det.camt;
          b2csAggregator[b2csKey].samt += itemJson.itm_det.samt;
        }
      }
    }
  }

  return {
    b2b: Array.from(b2bMap.values()),
    b2cl,
    b2cs: Object.values(b2csAggregator),
  };
}

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
    const customerState = item.customer_state || shop.state;
    const isInterstate =
      shop.state.toLowerCase() !== customerState.toLowerCase();

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

  const hsnData = Array.from(hsnMap.values()).map((item, index) => ({
    num: index + 1,
    hsn_sc: item.hsn_sc,
    desc: item.desc,
    uqc: item.uqc,
    qty: parseFloat(item.qty.toFixed(2)),
    val: parseFloat(item.val.toFixed(2)),
    txval: parseFloat(item.txval.toFixed(2)),
    iamt: parseFloat(item.iamt.toFixed(2)),
    camt: parseFloat(item.camt.toFixed(2)),
    samt: parseFloat(item.samt.toFixed(2)),
    csamt: 0,
  }));

  return { data: hsnData };
}

function _fetchAndProcessNotes(shop, startDate, endDate) {
  const notesQuery = db.prepare(`
    SELECT t.reference_no as note_no, t.transaction_date as note_date, t.type as note_type, t.amount as note_value, t.gst_amount,
           COALESCE(s.gstin, c.gst_no) as customer_gstin, COALESCE(s.state, c.state) as customer_state
    FROM transactions t
    LEFT JOIN customers c ON t.entity_id = c.id AND t.entity_type = 'customer'
    LEFT JOIN sales s ON t.bill_id = s.id AND t.bill_type = 'sale'
    WHERE t.type IN ('credit_note', 'debit_note') AND date(t.transaction_date) BETWEEN ? AND ?
  `);
  const allNotes = notesQuery.all(startDate, endDate);
  const cdnrMap = new Map();
  const cdnur = [];

  for (const note of allNotes) {
    const gstAmt = note.gst_amount || 0;
    const taxable_value = note.note_value - gstAmt;
    const calculated_rate =
      taxable_value > 0 ? (gstAmt / taxable_value) * 100 : 0;
    const customerState = note.customer_state || shop.state;
    const isInterstate =
      shop.state.toLowerCase() !== customerState.toLowerCase();

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

    if (note.customer_gstin) {
      if (!cdnrMap.has(note.customer_gstin))
        cdnrMap.set(note.customer_gstin, { ctin: note.customer_gstin, nt: [] });
      cdnrMap.get(note.customer_gstin).nt.push(noteJson);
    } else {
      cdnur.push({ ...noteJson, typ: "B2CS" });
    }
  }
  return { cdnr: Array.from(cdnrMap.values()), cdnur };
}

function _fetchNilRatedSummary(shop, startDate, endDate) {
  const nilRatedQuery = db.prepare(`
    SELECT
      CASE WHEN COALESCE(s.state, c.state) IS NOT NULL AND LOWER(COALESCE(s.state, c.state)) != LOWER(?) THEN 'INTER' ELSE 'INTRA' END as supply_type,
      SUM((si.quantity - COALESCE(si.return_quantity, 0)) * si.rate * (1 - si.discount/100.0)) as total_nil_rated_value
    FROM sales s
    JOIN sales_items si ON s.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE date(s.created_at) BETWEEN ? AND ? AND COALESCE(si.gst_rate, p.gst_rate, 0) = 0 
      AND (si.quantity - COALESCE(si.return_quantity, 0)) > 0
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
