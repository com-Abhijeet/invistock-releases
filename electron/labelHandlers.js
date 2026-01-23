const { getLabelTemplate } = require("./labelTemplate.js");
const bwipjs = require("bwip-js");
const { createPrintWindow } = require("./printLabel.js");
const { createCustomPrintWindow } = require("./customPrintLabel.js");

// =======================================================
// Dummy Data for Preview
// =======================================================

const DUMMY_LABEL_ITEM = {
  name: "Sample Product - Cotton Shirt (L)",
  product_code: "PRD-001",
  sku: "SKU-9988",
  rate: 1299,
  mrp: 1599,
  size: "L",
  color: "Blue",
  mfw_price: 850,
};

const DUMMY_SHOP = {
  shop_name: "My Awesome Store",
  shop_alias: "MAS",
  label_printer_width_mm: 50,
};

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
      },
    );
  });
};

// =======================================================
// REGISTER HANDLERS
// =======================================================

function registerLabelHandlers(ipcMain) {
  console.log("🟢 Label IPC handlers registered");

  // --------------------------------
  // Preview
  // --------------------------------
  ipcMain.handle("generate-label-preview", async (_, templateId) => {
    try {
      console.log("🟡 Preview requested:", templateId);

      const barcode = await generateDummyBarcode();

      const content = getLabelTemplate(
        templateId,
        { item: DUMMY_LABEL_ITEM, shop: { ...DUMMY_SHOP } },
        barcode,
      );

      return {
        success: true,
        html: `
          <!DOCTYPE html>
          <html>
            <body>${content}</body>
          </html>
        `,
      };
    } catch (err) {
      console.error("❌ Preview error:", err);
      return { success: false };
    }
  });

  // --------------------------------
  // Standard print
  // --------------------------------
  ipcMain.handle("print-label", async (_, payload) => {
    console.log("🖨️ print-label called");
    return createPrintWindow(payload);
  });

  // --------------------------------
  // Custom print
  // --------------------------------
  ipcMain.handle("print-custom-label", async (_, payload) => {
    console.log("🖨️ print-custom-label called");
    return createCustomPrintWindow(payload);
  });
}

module.exports = { registerLabelHandlers };
