import db from "../db/db.mjs";
import { getShop as getShopData } from "./shopRepository.mjs";
import { calculateGstPeriodDates } from "../utils/calculateGstPeriodDates.mjs";

/**
 * @description Fetches aggregated summary data for the GSTR-3B report.
 * It compiles data from BOTH Sales (Outward) and Purchases (Inward) to calculate
 * liabilities and eligible Input Tax Credit (ITC).
 */
export async function getGstr3bReportData({
  periodType,
  year,
  month,
  quarter,
}) {
  try {
    const shop = await getShopData();
    if (!shop || !shop.gstin || !shop.state) {
      throw new Error(
        "Shop GSTIN and State are required for GSTR-3B reporting.",
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

    // 1. Fetch RAW Sales (Outward) Data (using snapshot fields for Sales)
    const salesQuery = db.prepare(`
      SELECT 
        s.is_reverse_charge, COALESCE(s.state, c.state) as state,
        si.quantity, si.rate, si.discount, COALESCE(si.gst_rate, p.gst_rate, 0) as gst_rate
      FROM sales s
      JOIN sales_items si ON s.id = si.sale_id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE date(s.created_at) BETWEEN ? AND ? AND s.is_quote = 0
    `);
    const allSales = salesQuery.all(startDate, endDate);

    // 2. Fetch RAW Purchases (Inward/ITC) Data (Using strict schema columns)
    const purchasesQuery = db.prepare(`
      SELECT 
        pu.is_reverse_charge, s.state as state,
        pi.quantity, pi.rate, pi.discount, pi.gst_rate
      FROM purchases pu
      JOIN purchase_items pi ON pu.id = pi.purchase_id
      LEFT JOIN suppliers s ON pu.supplier_id = s.id
      WHERE date(pu.date) BETWEEN ? AND ?
    `);
    const allPurchases = purchasesQuery.all(startDate, endDate);

    // --- AGGREGATION OBJECTS ---
    const gstr3b = {
      outward_supplies: {
        os_tax: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 }, // 3.1 (a) Outward Taxable
        os_nil_exmp: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 }, // 3.1 (c) Outward Nil/Exempt
        is_rc: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 }, // 3.1 (d) Inward Reverse Charge (Liability)
      },
      itc_eligible: {
        itc_avl: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 }, // 4 (A) All Other ITC
      },
    };

    // --- PROCESS SALES (LIABILITY) ---
    for (const item of allSales) {
      const { taxableValue, taxAmount } = _calculateItemTax(item, isInclusive);
      const isInterstate =
        shop.state.toLowerCase() !== (item.state || shop.state).toLowerCase();

      const igst = isInterstate ? taxAmount : 0;
      const cgst = isInterstate ? 0 : taxAmount / 2;
      const sgst = isInterstate ? 0 : taxAmount / 2;

      if (item.gst_rate > 0) {
        // Taxable outward supplies
        gstr3b.outward_supplies.os_tax.txval += taxableValue;
        gstr3b.outward_supplies.os_tax.iamt += igst;
        gstr3b.outward_supplies.os_tax.camt += cgst;
        gstr3b.outward_supplies.os_tax.samt += sgst;
      } else {
        // Nil/Exempt outward supplies
        gstr3b.outward_supplies.os_nil_exmp.txval += taxableValue;
      }
    }

    // --- PROCESS PURCHASES (ITC & INWARD REVERSE CHARGE) ---
    for (const item of allPurchases) {
      // Typically, purchases are recorded exactly as billed (exclusive), but we use the global flag for safety if needed.
      const { taxableValue, taxAmount } = _calculateItemTax(item, isInclusive);
      const isInterstate =
        shop.state.toLowerCase() !== (item.state || shop.state).toLowerCase();

      const igst = isInterstate ? taxAmount : 0;
      const cgst = isInterstate ? 0 : taxAmount / 2;
      const sgst = isInterstate ? 0 : taxAmount / 2;

      if (item.is_reverse_charge) {
        // Liability: Inward supplies liable to reverse charge
        gstr3b.outward_supplies.is_rc.txval += taxableValue;
        gstr3b.outward_supplies.is_rc.iamt += igst;
        gstr3b.outward_supplies.is_rc.camt += cgst;
        gstr3b.outward_supplies.is_rc.samt += sgst;
      } else if (item.gst_rate > 0) {
        // Asset: All other Eligible ITC
        gstr3b.itc_eligible.itc_avl.txval += taxableValue;
        gstr3b.itc_eligible.itc_avl.iamt += igst;
        gstr3b.itc_eligible.itc_avl.camt += cgst;
        gstr3b.itc_eligible.itc_avl.samt += sgst;
      }
    }

    // Format final object to fixed 2 decimal places
    const formatSection = (section) => {
      Object.keys(section).forEach((key) => {
        section[key] = parseFloat(section[key].toFixed(2));
      });
      return section;
    };

    formatSection(gstr3b.outward_supplies.os_tax);
    formatSection(gstr3b.outward_supplies.os_nil_exmp);
    formatSection(gstr3b.outward_supplies.is_rc);
    formatSection(gstr3b.itc_eligible.itc_avl);

    return gstr3b;
  } catch (error) {
    console.error("Error generating GSTR-3B repository data:", error.message);
    throw new Error("Failed to fetch GSTR-3B data.");
  }
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

  return { taxableValue, taxAmount };
}
