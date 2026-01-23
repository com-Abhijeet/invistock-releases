const { createInvoiceHTML } = require("../../invoiceTemplate.js");
const { BRANDING_FOOTER } = require("./utils.js");

const a4Standard = (data) => {
  // We utilize the robust base generator from invoiceTemplate.js but inject our footer
  const html = createInvoiceHTML(data);
  return html;
};

module.exports = a4Standard;
