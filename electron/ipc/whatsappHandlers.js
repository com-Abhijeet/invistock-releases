const {
  getWhatsAppStatus,
  sendWhatsAppMessage,
  sendWhatsAppPdf,
  restartWhatsApp, // ✅ Import restart function
} = require("../whatsappService");

function registerWhatsAppHandlers(ipcMain) {
  console.log("[KOSH] Registering WhatsApp Handlers...");

  ipcMain.handle("whatsapp-get-status", () => {
    return getWhatsAppStatus();
  });

  // ✅ New handler for manual restart
  ipcMain.handle("whatsapp-restart", async () => {
    try {
      await restartWhatsApp();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-send-message", async (event, { phone, message }) => {
    try {
      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
      await sendWhatsAppMessage(cleanPhone, message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "whatsapp-send-invoice-pdf",
    async (event, { sale, shop, customerPhone }) => {
      try {
        if (!shop)
          shop =
            require("../../backend/repositories/shopRepository.mjs").getShop();
        const htmlContent = require("../invoiceTemplate.js").createInvoiceHTML({
          sale,
          shop,
        });
        const win = new (require("electron").BrowserWindow)({
          show: false,
          width: 800,
          height: 1200,
        });
        await win.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
        );
        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: "A4",
        });
        const pdfBase64 = pdfData.toString("base64");
        const fileName = `Invoice-${sale.reference_no}.pdf`;
        await sendWhatsAppPdf(
          customerPhone,
          pdfBase64,
          fileName,
          "Here is your PDF Invoice"
        );
        win.close();
        return { success: true };
      } catch (error) {
        console.error("Failed to send WhatsApp PDF:", error);
        return { success: false, error: error.message };
      }
    }
  );

  // ✅ UPDATED HANDLER: Fetch Data Internally (Like Print Function)
  ipcMain.handle(
    "whatsapp-customer-ledger",
    async (event, { customerId, phone, filters }) => {
      console.log("[KOSH] Generating Ledger PDF for Customer ID:", customerId);

      try {
        // 1. Fetch Data Fresh (Just like print-customer-ledger)
        const {
          getCustomerLedger,
        } = require("../../backend/repositories/customerRepository.mjs");
        const {
          getShop,
        } = require("../../backend/repositories/shopRepository.mjs");
        const {
          createCustomerLedgerHTML,
        } = require("../customerLedgerTemplate.js");

        const shop = await getShop();
        // Fetch the exact same data structure used for printing
        const ledgerData = await getCustomerLedger(customerId, filters);

        if (!ledgerData) {
          throw new Error("Could not fetch ledger data from database");
        }

        const customer = ledgerData.customer;
        const ledger = ledgerData.ledger;

        // 2. Generate HTML using the fetched data
        const htmlContent = createCustomerLedgerHTML(shop, customer, ledger);

        // 3. Render to PDF
        const win = new (require("electron").BrowserWindow)({
          show: false,
          width: 800,
          height: 1200,
        });

        await win.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
        );

        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: "A4",
        });

        // 4. Send via WhatsApp
        const pdfBase64 = pdfData.toString("base64");
        const safeName = ledgerData.customer.name.replace(/[^a-z0-9]/gi, "_");
        const fileName = `Ledger-${safeName}.pdf`;
        const caption = `Dear ${ledgerData.customer.name}, here is your account ledger statement from ${filters.startDate} to ${filters.endDate}.`;

        await sendWhatsAppPdf(phone, pdfBase64, fileName, caption);

        win.close();
        console.log("[KOSH] Ledger PDF sent successfully");
        return { success: true };
      } catch (error) {
        console.error("Failed to send WhatsApp Ledger PDF:", error);
        return { success: false, error: error.message };
      }
    }
  );
}

module.exports = { registerWhatsAppHandlers };
