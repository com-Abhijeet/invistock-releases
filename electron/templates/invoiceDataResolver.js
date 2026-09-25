/**
 * invoiceDataResolver.js
 * Normalizes and enriches sale & invoice data for Handlebars rendering.
 */

function enrichInvoiceData(payload) {
  const sale = payload?.sale || {};
  const shop = payload?.shop || {};
  const localSettings = payload?.localSettings || {};

  const itemsList = Array.isArray(sale.items) ? sale.items : [];

  let sumMrpTotal = 0;
  let sumSavingsTotal = 0;
  let sumQty = 0;

  const taxGroupMap = {};

  const enrichedItems = itemsList.map((item, idx) => {
    const qty = Number(item.quantity || 1);
    const mrp = Number(item.mrp || item.batch_mrp || item.rate || 0);
    const rate = Number(item.rate || 0);
    const discount = Number(item.discount || 0);
    const gstRate = Number(item.gst_rate || 0);
    const totalPrice = Number(item.price || item.total_amount || (rate * qty));

    const discountedUnitPrice = rate - (discount > 0 ? (discount / qty) : 0);
    const unitSavings = Math.max(0, mrp - discountedUnitPrice);
    const itemTotalMrp = mrp * qty;
    const itemTotalSavings = unitSavings * qty;

    sumQty += qty;
    sumMrpTotal += itemTotalMrp;
    sumSavingsTotal += itemTotalSavings;

    // Group taxes
    if (gstRate > 0) {
      if (!taxGroupMap[gstRate]) {
        taxGroupMap[gstRate] = {
          gst_rate: gstRate,
          taxable_amount: 0,
          tax_amount: 0,
          cgst_amount: 0,
          sgst_amount: 0,
        };
      }
      const taxable = totalPrice;
      const taxAmt = (taxable * gstRate) / 100;
      taxGroupMap[gstRate].taxable_amount += taxable;
      taxGroupMap[gstRate].tax_amount += taxAmt;
      taxGroupMap[gstRate].cgst_amount += taxAmt / 2;
      taxGroupMap[gstRate].sgst_amount += taxAmt / 2;
    }

    return {
      sl_no: idx + 1,
      ...item,
      sid: item.employee_id || sale.employee_id || "",
      employee_id: item.employee_id || sale.employee_id || "",
      employee_name: item.employee_name || sale.employee_name || "",
      name: item.product_name || item.name || "Item",
      code: item.barcode || item.product_code || "",
      hsn: item.hsn || item.hsn_code || item.hsn_sac || item.product?.hsn || "",
      quantity: qty,
      unit: item.unit || "pcs",
      mrp: mrp.toFixed(2),
      rate: rate.toFixed(2),
      discounted_unit_price: discountedUnitPrice.toFixed(2),
      unit_savings: unitSavings.toFixed(2),
      total_mrp: itemTotalMrp.toFixed(2),
      total_savings: itemTotalSavings.toFixed(2),
      total_price: totalPrice.toFixed(2),
      gst_rate: gstRate,
    };
  });

  const taxSummary = Object.values(taxGroupMap).map((grp) => ({
    gst_rate: grp.gst_rate,
    taxable_amount: grp.taxable_amount.toFixed(2),
    tax_amount: grp.tax_amount.toFixed(2),
    cgst_rate: (grp.gst_rate / 2).toFixed(1),
    sgst_rate: (grp.gst_rate / 2).toFixed(1),
    cgst_amount: grp.cgst_amount.toFixed(2),
    sgst_amount: grp.sgst_amount.toFixed(2),
  }));

  const finalAmount = Number(sale.total_amount || sale.final_amount || 0);
  const calculatedTotalSavings = Math.max(
    sumSavingsTotal,
    sumMrpTotal > 0 ? Math.max(0, sumMrpTotal - finalAmount) : 0,
  );

  return {
    shop,
    localSettings,
    sale: {
      ...sale,
      reference_no: sale.reference_no || sale.invoice_no || "",
      date: sale.date || new Date().toLocaleDateString("en-IN"),
      customer_name: sale.customer_name || sale.customer?.name || "Walk-in Customer",
      customer_mobile: sale.customer_mobile || sale.customer?.mobile || "",
      customer_address: sale.customer_address || sale.customer?.address || "",
      customer_gstin: sale.customer_gstin || sale.customer?.gstin || "",
      employee_id: sale.employee_id || "",
      employee_name: sale.employee_name || "",
      payment_type: sale.payment_type || "Cash",
    },
    items: enrichedItems,
    summary: {
      total_qty: sumQty,
      total_mrp: sumMrpTotal.toFixed(2),
      total_savings: calculatedTotalSavings.toFixed(2),
      subtotal: Number(sale.subtotal || finalAmount).toFixed(2),
      discount: Number(sale.discount || 0).toFixed(2),
      tax_total: Number(sale.tax_amount || sale.tax_total || 0).toFixed(2),
      final_amount: finalAmount.toFixed(2),
      round_off: Number(sale.round_off || 0).toFixed(2),
    },
    tax_summary: taxSummary,
  };
}

module.exports = { enrichInvoiceData };
