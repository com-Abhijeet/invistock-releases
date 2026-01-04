const { ipcMain } = require("electron");
const { getLabelTemplate } = require("./labelTemplate.js");
const bwipjs = require("bwip-js");

// Dummy Data for Preview
const DUMMY_LABEL_ITEM = {
  name: "Sample Product - Cotton Shirt (L)",
  product_code: "PRD-001",
  sku: "SKU-9988",
  rate: 1299,
  mrp: 1599,
  size: "L",
  color: "Blue",
  mfw_price: 850, // For discreet code
};

const DUMMY_SHOP = {
  shop_name: "My Awesome Store",
  shop_alias: "MAS",
  label_printer_width_mm: 50, // Default preview width
};

// Generate a simple dummy barcode
const generateDummyBarcode = async () => {
  return new Promise((resolve) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: "123456789",
        scale: 3,
        height: 10,
        includetext: false,
      },
      (err, png) => {
        if (err) resolve("");
        else resolve(`data:image/png;base64,${png.toString("base64")}`);
      }
    );
  });
};

function registerLabelHandlers(ipcMain) {
  ipcMain.handle("generate-label-preview", async (event, templateId) => {
    try {
      const barcode = await generateDummyBarcode();

      const data = {
        item: DUMMY_LABEL_ITEM,
        shop: { ...DUMMY_SHOP },
      };

      // Generate HTML (Includes <style> blocks)
      const content = getLabelTemplate(templateId, data, barcode);

      // Wrap in standard HTML structure for the iframe
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Label Preview</title>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `;

      return { success: true, html };
    } catch (error) {
      console.error("Label Preview Error:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerLabelHandlers };
