/**
 * invoiceHandlebarsEngine.js
 * Handlebars Template Compiler for Custom Invoices.
 */

const Handlebars = require("handlebars");
const { enrichInvoiceData } = require("./invoiceDataResolver");

// --- REGISTER HANDLEBARS HELPERS ---
Handlebars.registerHelper("formatCurrency", function (value) {
  const val = Number(value || 0);
  return val.toFixed(2);
});

Handlebars.registerHelper("add", function (a, b) {
  return (Number(a || 0) + Number(b || 0)).toFixed(2);
});

Handlebars.registerHelper("subtract", function (a, b) {
  return (Number(a || 0) - Number(b || 0)).toFixed(2);
});

Handlebars.registerHelper("multiply", function (a, b) {
  return (Number(a || 0) * Number(b || 0)).toFixed(2);
});

Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
  return String(arg1) === String(arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("calculateSavings", function (items) {
  if (!Array.isArray(items)) return "0.00";
  let totalMrp = 0;
  let totalFinal = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity || 1);
    const mrp = Number(item.mrp || item.rate || 0);
    const price = Number(item.total_price || item.price || 0);
    totalMrp += mrp * qty;
    totalFinal += price;
  });

  const savings = Math.max(0, totalMrp - totalFinal);
  return savings.toFixed(2);
});

Handlebars.registerHelper("cipherEncode", function (value, cipherKey) {
  if (!value) return "";
  const key = (cipherKey || "MONEYTALKS").toUpperCase();
  const digits = String(value).replace(/[^0-9]/g, "");

  // Default mapping for 1-9, 0 (index 0=1, index 8=9, index 9=0)
  return digits
    .split("")
    .map((d) => {
      const num = parseInt(d, 10);
      if (num === 0) return key[9] || "0";
      return key[num - 1] || d;
    })
    .join("");
});

/**
 * Render HTML for custom invoice using Handlebars.
 */
function renderCustomInvoiceHTML(templateHtml, payload) {
  const enrichedData = enrichInvoiceData(payload);
  const compiledTemplate = Handlebars.compile(templateHtml);
  return compiledTemplate(enrichedData);
}

module.exports = {
  renderCustomInvoiceHTML,
  enrichInvoiceData,
};
