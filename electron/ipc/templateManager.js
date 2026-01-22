const thermal80mm = require("./invoiceTemplates/thermal80mm");
const thermal58mm = require("./invoiceTemplates/thermal58mm");
const a4Standard = require("./invoiceTemplates/a4Standard");
const a4Modern = require("./invoiceTemplates/a4Modern");
const a5Landscape = require("./invoiceTemplates/a5Landscape");
const a5Portrait = require("./invoiceTemplates/a5Portrait");

const templates = {
  thermal_80mm: thermal80mm,
  thermal_58mm: thermal58mm,
  a4_standard: a4Standard,
  a4_modern: a4Modern,
  a5_landscape: a5Landscape,
  a5_portrait: a5Portrait,
};

const getTemplate = (templateId, data) => {
  const generator = templates[templateId] || templates["a4_standard"];
  return generator(data);
};

module.exports = { getTemplate, availableTemplates: Object.keys(templates) };
