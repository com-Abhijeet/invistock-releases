const {
  getWhatsAppStatus,
  sendWhatsAppMessage,
  sendWhatsAppPdf,
  restartWhatsApp, // ✅ Import restart function
} = require("../whatsappService");

function registerWhatsAppHandlers(ipcMain) {
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
}

module.exports = { registerWhatsAppHandlers };
