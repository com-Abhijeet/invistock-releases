const {
  getWhatsAppStatus,
  sendWhatsAppMessage,
  sendWhatsAppPdf,
  restartWhatsApp, // ✅ Import restart function
} = require("../whatsappService");
const { BrowserWindow } = require("electron");
const QRCode = require("qrcode");
const { getShop } = require("../../backend/repositories/shopRepository.mjs");
const { createInvoiceHTML } = require("../invoiceTemplate.js");
const db = require("../../backend/db/db.mjs").default;

const REMINDER_TEMPLATES = [
  `Dear {{Name}},\n\nThis is a friendly reminder from {{ShopName}} regarding your outstanding balance of *₹{{Total}}*.\n\n*Pending Invoices:*{{Bills}}\n\nPlease arrange the payment at your earliest convenience. Thank you!`,

  `Hello {{Name}},\n\nWe hope you are having a great day. Just writing to gently remind you about your pending dues with {{ShopName}}.\n\n*Account Overview:*{{Bills}}\n\n*Total Due: ₹{{Total}}*\n\nKindly process the payment soon. Ignore if already paid.`,

  `Greetings from {{ShopName}}, {{Name}}!\n\nWe truly value your continued business. Please find the details of your outstanding invoices below:\n{{Bills}}\n\n*Total Pending: ₹{{Total}}*\n\nLooking forward to your prompt response.`,

  `Hi {{Name}},\n\nJust a quick note from {{ShopName}} to remind you of your overdue account balance.\n\n*Pending Details:*{{Bills}}\n\n*Net Balance: ₹{{Total}}*\n\nPlease let us know if you need any clarification. Thank you!`,

  `Dear {{Name}},\n\nThis is an automated statement update from {{ShopName}}. Your account currently shows an outstanding balance of *₹{{Total}}*.\n\n*Invoice Breakdown:*{{Bills}}\n\nWe request you to kindly clear these dues.`,

  `Hello {{Name}},\n\nThank you for your association with {{ShopName}}. We wanted to bring to your attention the following pending bills:\n{{Bills}}\n\n*Total Amount Left: ₹{{Total}}*\n\nYour prompt payment would be highly appreciated.`,

  `Hi {{Name}},\n\nGentle reminder regarding your pending balance of *₹{{Total}}* with {{ShopName}}.\n\n*Details:*{{Bills}}\n\nPlease initiate the payment at your earliest convenience. Have a great day!`,

  `Greetings {{Name}},\n\nWe are reaching out to share your latest outstanding statement from {{ShopName}}.\n\n*Unpaid Bills:*{{Bills}}\n\n*Total Overdue: ₹{{Total}}*\n\nKindly clear your dues to ensure uninterrupted service.`,

  `Dear {{Name}},\n\nPlease note that your account with {{ShopName}} has overdue invoices pending clearance.\n\n*Summary:*{{Bills}}\n\n*Total Due: ₹{{Total}}*\n\nWe request your cooperation in settling this soon.`,

  `Hello {{Name}},\n\nWe appreciate your trust in {{ShopName}}. This is a soft reminder for your pending payment of *₹{{Total}}*.\n\n*Invoice Reference:*{{Bills}}\n\nThank you for your timely assistance in clearing this balance.`,
];

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

  ipcMain.handle("whatsapp-bulk-reminders", async (event, { customers }) => {
    // Run asynchronously to release the UI immediately
    (async () => {
      console.log(
        `[WHATSAPP] Starting background bulk reminder job for ${customers.length} customers.`,
      );
      const shop = await getShop();
      const shopName = shop?.shop_name || "Our Shop";

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        if (!customer.phone || customer.phone.length < 10) continue;

        try {
          // Fetch exact unpaid invoices for this customer
          const stmt = db.prepare(`
            SELECT 
              reference_no, 
              total_amount, 
              paid_amount,
              (total_amount - paid_amount) as balance,
              CAST(julianday('now') - julianday(created_at) AS INTEGER) as days_overdue
            FROM sales
            WHERE customer_id = ? AND status IN ('pending', 'partial') AND is_quote = 0
            ORDER BY created_at ASC
          `);
          const overdueBills = stmt.all(customer.id);

          if (overdueBills.length === 0) continue;

          // Format the bills breakdown
          let billsText = "";
          let totalDue = 0;
          overdueBills.forEach((bill) => {
            billsText += `\n🔹 *Inv: ${bill.reference_no}*\n      Bill: ₹${bill.total_amount.toFixed(2)} | Paid: ₹${bill.paid_amount.toFixed(2)}\n      *Due: ₹${bill.balance.toFixed(2)}* (${bill.days_overdue} days overdue)\n`;
            totalDue += bill.balance;
          });

          // Pick a random template (Not serial/sequential)
          const randomIndex = Math.floor(
            Math.random() * REMINDER_TEMPLATES.length,
          );
          const rawTemplate = REMINDER_TEMPLATES[randomIndex];

          let finalMessage = rawTemplate
            .replace(/\{\{Name\}\}/g, customer.name)
            .replace(/\{\{ShopName\}\}/g, shopName)
            .replace(/\{\{Total\}\}/g, totalDue.toFixed(2))
            .replace(/\{\{Bills\}\}/g, billsText);

          // Append Pay Link if UPI ID exists (Fallback to shopName if upi_banking_name is missing)
          console.log("SHOP UPI", shop.upi_id);
          if (shop?.upi_id) {
            const payeeName = shop.upi_banking_name || shopName;
            const payLink = `https://getkosh.co.in/pay?pay_to=${encodeURIComponent(shop.upi_id)}&name=${encodeURIComponent(payeeName)}&am=${totalDue.toFixed(2)}`;
            finalMessage += `\n\n💳 *Pay Online Instantly:*\n${payLink}`;
          }

          let cleanPhone = customer.phone.replace(/[^0-9]/g, "");
          if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

          // Enqueue the message
          await sendWhatsAppMessage(cleanPhone, finalMessage);
          console.log(`[WHATSAPP] Reminder queued for ${customer.name}`);
        } catch (e) {
          console.error(
            `[WHATSAPP] Failed to process reminder for ${customer.name}:`,
            e,
          );
        }

        // Random delay between 5 to 10 seconds (5000ms - 10000ms) to bypass bot-detection
        const randomDelay =
          Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
        await new Promise((r) => setTimeout(r, randomDelay));
      }

      console.log(`[WHATSAPP] Bulk reminder background job completed.`);
    })();

    // Return immediately to the frontend so the UI doesn't hang
    return { success: true, message: "Background job started successfully." };
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
    async (event, { sale, shop, localSettings, customerPhone }) => {
      let win;

      try {
        // ===================================================
        // SHOP (FIX: must await)
        // ===================================================

        if (!shop) {
          shop = await getShop();
        }

        // ===================================================
        // ✅ GENERATE UPI QR (same as invoice printer)
        // ===================================================

        if (shop?.upi_id && shop?.upi_banking_name) {
          const upiUrl = `upi://pay?pa=${encodeURIComponent(
            shop.upi_id,
          )}&pn=${encodeURIComponent(
            shop.upi_banking_name,
          )}&am=${sale.total_amount.toFixed(2)}&cu=INR`;

          shop.generated_upi_qr = await QRCode.toDataURL(upiUrl);
        } else {
          shop.generated_upi_qr = null;
        }

        // ===================================================
        // HTML
        // ===================================================

        const htmlContent = createInvoiceHTML({ sale, shop, localSettings });

        // ===================================================
        // WINDOW (hidden is fine for PDF generation)
        // ===================================================

        win = new BrowserWindow({
          show: false,
          width: 800,
          height: 1200,
        });

        await win.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent),
        );

        // ===================================================
        // PDF
        // ===================================================

        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: "A4",
        });

        const pdfBase64 = pdfData.toString("base64");
        const fileName = `Invoice-${sale.reference_no}.pdf`;

        // ===================================================
        // SEND WHATSAPP
        // ===================================================

        await sendWhatsAppPdf(
          customerPhone,
          pdfBase64,
          fileName,
          "Here is your PDF Invoice",
        );

        return { success: true };
      } catch (error) {
        console.error("Failed to send WhatsApp PDF:", error);
        return { success: false, error: error.message };
      } finally {
        if (win && !win.isDestroyed()) win.close();
      }
    },
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
          "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent),
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
    },
  );
}

module.exports = { registerWhatsAppHandlers };
