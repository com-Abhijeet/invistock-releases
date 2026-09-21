const {
  getWhatsAppStatus,
  restartWhatsApp,
} = require("../whatsappService");
const {
  routeAndSendMessage,
  routeAndSendPdf,
} = require("../whatsappRouter");
const {
  testOfficialConnection,
} = require("../whatsappOfficialService");
const {
  testMsg91Connection,
} = require("../whatsappMsg91Service");
const { BrowserWindow } = require("electron");
const QRCode = require("qrcode");
const { getShop } = require("../../backend/repositories/shopRepository.mjs");
const { createInvoiceHTML } = require("../invoiceTemplate.js");
const db = require("../../backend/db/db.mjs").default;

async function getSettingsRepo() {
  return await import("../../backend/repositories/whatsappSettingsRepository.mjs");
}

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

  ipcMain.handle("whatsapp-restart", async () => {
    try {
      await restartWhatsApp();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Settings & Analytics Handlers
  ipcMain.handle("whatsapp-get-settings", async () => {
    try {
      const { getWhatsAppSettings } = await getSettingsRepo();
      return { success: true, settings: getWhatsAppSettings() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-save-settings", async (event, data) => {
    try {
      const { updateWhatsAppSettings } = await getSettingsRepo();
      const updated = updateWhatsAppSettings(data);
      return { success: true, settings: updated };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-test-official", async (event, credentials) => {
    console.log("[KOSH-IPC] whatsapp-test-official called with credentials:", credentials);
    return await testOfficialConnection(credentials);
  });

  ipcMain.handle("whatsapp-test-msg91", async (event, credentials) => {
    console.log("[KOSH-IPC] whatsapp-test-msg91 called with credentials:", {
      authKey: credentials?.authKey ? credentials.authKey.slice(0, 5) + "..." : "MISSING",
      integratedNumber: credentials?.integratedNumber,
    });

    if (credentials?.authKey || credentials?.integratedNumber) {
      try {
        const { updateWhatsAppSettings } = await getSettingsRepo();
        updateWhatsAppSettings({
          msg91_auth_key: credentials.authKey || "",
          msg91_integrated_number: credentials.integratedNumber || "",
          official_provider: "msg91",
        });
        console.log("[KOSH-IPC] Saved MSG91 credentials to DB successfully.");
      } catch (err) {
        console.error("[KOSH-IPC] Failed to save MSG91 credentials to DB:", err.message);
      }
    }

    return await testMsg91Connection(credentials);
  });

  ipcMain.handle("whatsapp-open-msg91-signup", async (event) => {
    const { shell, BrowserWindow } = require("electron");
    try {
      const win = new BrowserWindow({
        width: 1050,
        height: 780,
        title: "MSG91 Official WhatsApp Embedded Signup",
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      win.loadURL("https://control.msg91.com/signup/");

      win.webContents.on("will-navigate", (evt, url) => {
        try {
          const parsed = new URL(url);
          const authKey =
            parsed.searchParams.get("authkey") ||
            parsed.searchParams.get("auth_key");
          const phone =
            parsed.searchParams.get("integrated_number") ||
            parsed.searchParams.get("phone");
          if (authKey || phone) {
            event.sender.send("msg91-signup-captured", {
              authKey,
              integratedNumber: phone,
            });
          }
        } catch (e) {}
      });

      return { success: true };
    } catch (e) {
      shell.openExternal("https://control.msg91.com/signup/");
      return { success: true };
    }
  });

  ipcMain.handle("whatsapp-get-analytics", async (event, days = 30) => {
    try {
      const { getWhatsAppUsageStats } = await getSettingsRepo();
      const stats = getWhatsAppUsageStats(days);
      return { success: true, stats };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Template Management IPC Handlers
  ipcMain.handle("whatsapp-get-templates", async (event, category) => {
    try {
      const { getWhatsAppTemplates } = await import(
        "../../backend/repositories/whatsappTemplateRepository.mjs"
      );
      return { success: true, templates: getWhatsAppTemplates(category) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-save-template", async (event, data) => {
    try {
      const { createWhatsAppTemplate, updateWhatsAppTemplate } = await import(
        "../../backend/repositories/whatsappTemplateRepository.mjs"
      );
      if (data.id) {
        updateWhatsAppTemplate(data.id, data);
      } else {
        createWhatsAppTemplate(data);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-delete-template", async (event, id) => {
    try {
      const { deleteWhatsAppTemplate } = await import(
        "../../backend/repositories/whatsappTemplateRepository.mjs"
      );
      deleteWhatsAppTemplate(id);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-set-default-template", async (event, { id, category }) => {
    try {
      const { setDefaultTemplate } = await import(
        "../../backend/repositories/whatsappTemplateRepository.mjs"
      );
      setDefaultTemplate(id, category);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-verify-meta-templates", async () => {
    try {
      const { getWhatsAppSettings } = await getSettingsRepo();
      const settings = getWhatsAppSettings();
      const provider = settings.official_provider || "msg91";

      const {
        getWhatsAppTemplates,
        updateMetaStatus,
        createWhatsAppTemplate,
      } = await import(
        "../../backend/repositories/whatsappTemplateRepository.mjs"
      );

      if (provider === "msg91") {
        if (!settings.msg91_auth_key) {
          return {
            success: false,
            error: "MSG91 Auth Key is required in Setup tab.",
          };
        }

        const { fetchMsg91Templates } = require("../whatsappMsg91Service");
        const msgRes = await fetchMsg91Templates({
          authKey: settings.msg91_auth_key,
          integratedNumber: settings.msg91_integrated_number,
        });

        if (!msgRes.success) {
          return { success: false, error: msgRes.error };
        }

        const remoteList = msgRes.templates || [];
        const remoteMap = new Map();
        remoteList.forEach((t) => {
          if (t.name) remoteMap.set(String(t.name).toLowerCase(), t.status);
        });

        let localTemplates = getWhatsAppTemplates();
        localTemplates.forEach((tpl) => {
          const key1 = tpl.meta_template_name ? String(tpl.meta_template_name).toLowerCase() : "";
          const key2 = tpl.name ? String(tpl.name).toLowerCase() : "";
          const remoteStatus = remoteMap.get(key1) || remoteMap.get(key2);
          const status = remoteStatus || "LOCAL_ONLY";
          updateMetaStatus(tpl.meta_template_name || tpl.name, status);
        });

        // Auto-import missing MSG91 templates into local SQLite database
        remoteList.forEach((remoteTpl) => {
          const remoteName = String(remoteTpl.name || remoteTpl.template_name || "").toLowerCase();
          if (!remoteName) return;
          const exists = localTemplates.some((l) => {
            const lMeta = l.meta_template_name ? String(l.meta_template_name).toLowerCase() : "";
            const lName = l.name ? String(l.name).toLowerCase() : "";
            return lMeta === remoteName || lName === remoteName;
          });
          if (!exists) {
            try {
              createWhatsAppTemplate({
                name: remoteTpl.name || remoteTpl.template_name,
                category: (remoteTpl.category || "UTILITY").toLowerCase(),
                content: remoteTpl.content || remoteTpl.body || `[Synced template from MSG91]`,
                meta_template_name: remoteTpl.name || remoteTpl.template_name,
                language: remoteTpl.language || "en_US",
              });
              updateMetaStatus(remoteTpl.name || remoteTpl.template_name, remoteTpl.status || "PENDING");
            } catch (err) {
              console.warn(`[DB] Failed to auto-import MSG91 template '${remoteName}':`, err.message);
            }
          }
        });

        return {
          success: true,
          templates: getWhatsAppTemplates(),
          syncedCount: remoteList.length,
        };
      } else {
        if (!settings.official_waba_id || !settings.official_access_token) {
          return {
            success: false,
            error: "WABA Account ID and Access Token are required in Setup tab.",
          };
        }

        const { fetchMetaTemplates } = require("../whatsappOfficialService");
        const metaRes = await fetchMetaTemplates({
          wabaId: settings.official_waba_id,
          accessToken: settings.official_access_token,
        });

        if (!metaRes.success) {
          return { success: false, error: metaRes.error };
        }

        const metaList = metaRes.templates || [];
        const metaMap = new Map();
        metaList.forEach((t) => {
          if (t.name) metaMap.set(t.name.toLowerCase(), t.status);
        });

        let localTemplates = getWhatsAppTemplates();
        localTemplates.forEach((tpl) => {
          if (tpl.meta_template_name || tpl.name) {
            const key1 = tpl.meta_template_name ? String(tpl.meta_template_name).toLowerCase() : "";
            const key2 = tpl.name ? String(tpl.name).toLowerCase() : "";
            const status = metaMap.get(key1) || metaMap.get(key2) || "LOCAL_ONLY";
            updateMetaStatus(tpl.meta_template_name || tpl.name, status);
          }
        });

        return {
          success: true,
          templates: getWhatsAppTemplates(),
          syncedCount: metaList.length,
        };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-register-all-templates", async () => {
    try {
      const { getWhatsAppSettings } = await getSettingsRepo();
      const settings = getWhatsAppSettings();
      const provider = settings.official_provider || "msg91";

      const {
        getWhatsAppTemplates,
        updateMetaStatus,
        seedDefaultTemplates,
      } = await import(
        "../../backend/repositories/whatsappTemplateRepository.mjs"
      );

      seedDefaultTemplates();
      const templates = getWhatsAppTemplates();
      let registeredCount = 0;
      let errors = [];

      if (provider === "msg91") {
        if (!settings.msg91_auth_key) {
          return {
            success: false,
            error: "MSG91 Auth Key is required in Setup tab.",
          };
        }

        const { registerMsg91Template } = require("../whatsappMsg91Service");
        for (const tpl of templates) {
          try {
            const res = await registerMsg91Template({
              authKey: settings.msg91_auth_key,
              integratedNumber: settings.msg91_integrated_number,
              template: tpl,
            });

            if (res.success) {
              updateMetaStatus(
                tpl.meta_template_name || tpl.name,
                res.status || "APPROVED"
              );
              registeredCount++;
            }
          } catch (err) {
            errors.push(`${tpl.name}: ${err.message}`);
          }
        }
      } else {
        if (!settings.official_waba_id || !settings.official_access_token) {
          return {
            success: false,
            error: "WABA Account ID and Access Token are required in Meta Settings.",
          };
        }

        const { registerMetaTemplate } = require("../whatsappOfficialService");
        for (const tpl of templates) {
          try {
            const res = await registerMetaTemplate({
              wabaId: settings.official_waba_id,
              accessToken: settings.official_access_token,
              template: tpl,
            });

            if (res.success) {
              updateMetaStatus(
                tpl.meta_template_name || tpl.name,
                res.status || "PENDING"
              );
              registeredCount++;
            }
          } catch (err) {
            errors.push(`${tpl.name}: ${err.message}`);
          }
        }
      }

      if (registeredCount === 0 && errors.length > 0) {
        return {
          success: false,
          error: errors[0],
          errorCount: errors.length,
          errors,
          templates: getWhatsAppTemplates(),
        };
      }

      return {
        success: true,
        registeredCount,
        errorCount: errors.length,
        errors,
        templates: getWhatsAppTemplates(),
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-register-single-template", async (event, templateId) => {
    try {
      const { getWhatsAppSettings } = await getSettingsRepo();
      const settings = getWhatsAppSettings();
      const provider = settings.official_provider || "msg91";

      const {
        getTemplateById,
        updateMetaStatus,
        getWhatsAppTemplates,
      } = await import(
        "../../backend/repositories/whatsappTemplateRepository.mjs"
      );

      const tpl = getTemplateById(templateId);
      if (!tpl) {
        return { success: false, error: "Template not found." };
      }

      if (provider === "msg91") {
        if (!settings.msg91_auth_key) {
          return {
            success: false,
            error: "MSG91 Auth Key is required in Setup tab.",
          };
        }

        const { registerMsg91Template } = require("../whatsappMsg91Service");
        const res = await registerMsg91Template({
          authKey: settings.msg91_auth_key,
          integratedNumber: settings.msg91_integrated_number,
          template: tpl,
        });

        if (res.success) {
          const newStatus = res.status || "APPROVED";
          updateMetaStatus(tpl.meta_template_name || tpl.name, newStatus);
          return {
            success: true,
            status: newStatus,
            template: getTemplateById(templateId),
            templates: getWhatsAppTemplates(),
          };
        } else {
          return { success: false, error: res.error || "Failed to register template with MSG91" };
        }
      } else {
        if (!settings.official_waba_id || !settings.official_access_token) {
          return {
            success: false,
            error: "WABA Account ID and Access Token are required in Setup tab.",
          };
        }

        const { registerMetaTemplate } = require("../whatsappOfficialService");
        const res = await registerMetaTemplate({
          wabaId: settings.official_waba_id,
          accessToken: settings.official_access_token,
          template: tpl,
        });

        if (res.success) {
          const newStatus = res.status || "PENDING";
          updateMetaStatus(tpl.meta_template_name || tpl.name, newStatus);
          return {
            success: true,
            status: newStatus,
            template: getTemplateById(templateId),
            templates: getWhatsAppTemplates(),
          };
        } else {
          return { success: false, error: res.error || "Failed to register template with Meta" };
        }
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-verify-single-template", async (event, templateId) => {
    try {
      const { getWhatsAppSettings } = await getSettingsRepo();
      const settings = getWhatsAppSettings();
      const provider = settings.official_provider || "msg91";

      const {
        getTemplateById,
        updateMetaStatus,
        getWhatsAppTemplates,
      } = await import(
        "../../backend/repositories/whatsappTemplateRepository.mjs"
      );

      const tpl = getTemplateById(templateId);
      if (!tpl) {
        return { success: false, error: "Template not found." };
      }

      const metaName = (tpl.meta_template_name || tpl.name).toLowerCase();

      if (provider === "msg91") {
        if (!settings.msg91_auth_key) {
          return {
            success: false,
            error: "MSG91 Auth Key is required in Setup tab.",
          };
        }

        const { fetchMsg91Templates } = require("../whatsappMsg91Service");
        const msgRes = await fetchMsg91Templates({
          authKey: settings.msg91_auth_key,
          integratedNumber: settings.msg91_integrated_number,
        });

        if (!msgRes.success) {
          return { success: false, error: msgRes.error };
        }

        const match = (msgRes.templates || []).find(
          (t) => String(t.name || "").toLowerCase() === metaName
        );

        const newStatus = match ? match.status : "LOCAL_ONLY";
        updateMetaStatus(tpl.meta_template_name || tpl.name, newStatus);
        return {
          success: true,
          status: newStatus,
          template: getTemplateById(templateId),
          templates: getWhatsAppTemplates(),
        };
      } else {
        if (!settings.official_waba_id || !settings.official_access_token) {
          return {
            success: false,
            error: "WABA Account ID and Access Token are required in Setup tab.",
          };
        }

        const { fetchMetaTemplates } = require("../whatsappOfficialService");
        const metaRes = await fetchMetaTemplates({
          wabaId: settings.official_waba_id,
          accessToken: settings.official_access_token,
        });

        if (!metaRes.success) {
          return { success: false, error: metaRes.error };
        }

        const match = (metaRes.templates || []).find(
          (t) => String(t.name || "").toLowerCase() === metaName
        );

        const newStatus = match ? match.status : "LOCAL_ONLY";
        updateMetaStatus(tpl.meta_template_name || tpl.name, newStatus);
        return {
          success: true,
          status: newStatus,
          template: getTemplateById(templateId),
          templates: getWhatsAppTemplates(),
        };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whatsapp-bulk-reminders", async (event, { customers }) => {
    (async () => {
      console.log(
        `[WHATSAPP] Starting background bulk reminder job for ${customers.length} customers.`
      );
      const shop = await getShop();
      const shopName = shop?.shop_name || "Our Shop";

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        if (!customer.phone || customer.phone.length < 10) continue;

        try {
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

          let billsText = "";
          let totalDue = 0;
          overdueBills.forEach((bill) => {
            billsText += `\n🔹 *Inv: ${bill.reference_no}*\n      Bill: ₹${bill.total_amount.toFixed(2)} | Paid: ₹${bill.paid_amount.toFixed(2)}\n      *Due: ₹${bill.balance.toFixed(2)}* (${bill.days_overdue} days overdue)\n`;
            totalDue += bill.balance;
          });

          const randomIndex = Math.floor(
            Math.random() * REMINDER_TEMPLATES.length
          );
          const rawTemplate = REMINDER_TEMPLATES[randomIndex];

          let finalMessage = rawTemplate
            .replace(/\{\{Name\}\}/g, customer.name)
            .replace(/\{\{ShopName\}\}/g, shopName)
            .replace(/\{\{Total\}\}/g, totalDue.toFixed(2))
            .replace(/\{\{Bills\}\}/g, billsText);

          if (shop?.upi_id) {
            const payeeName = shop.upi_banking_name || shopName;
            const payLink = `https://getkosh.co.in/pay?pay_to=${encodeURIComponent(shop.upi_id)}&name=${encodeURIComponent(payeeName)}&am=${totalDue.toFixed(2)}`;
            finalMessage += `\n\n💳 *Pay Online Instantly:*\n${payLink}`;
          }

          let cleanPhone = customer.phone.replace(/[^0-9]/g, "");
          if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

          // Dispatch via WhatsApp Router with category 'outstandings'
          await routeAndSendMessage({
            category: "outstandings",
            phone: cleanPhone,
            message: finalMessage,
          });
          console.log(`[WHATSAPP] Reminder processed for ${customer.name}`);
        } catch (e) {
          console.error(
            `[WHATSAPP] Failed to process reminder for ${customer.name}:`,
            e
          );
        }

        const randomDelay =
          Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
        await new Promise((r) => setTimeout(r, randomDelay));
      }

      console.log(`[WHATSAPP] Bulk reminder background job completed.`);
    })();

    return { success: true, message: "Background job started successfully." };
  });

  ipcMain.handle(
    "whatsapp-send-message",
    async (event, { phone, message, category = "marketing" }) => {
      try {
        let cleanPhone = phone.replace(/[^0-9]/g, "");
        if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
        await routeAndSendMessage({
          category,
          phone: cleanPhone,
          message,
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "whatsapp-send-invoice-pdf",
    async (event, { sale, shop, localSettings, customerPhone }) => {
      let win;

      try {
        if (!shop) {
          shop = await getShop();
        }

        if (shop?.upi_id && shop?.upi_banking_name) {
          const upiUrl = `upi://pay?pa=${encodeURIComponent(
            shop.upi_id
          )}&pn=${encodeURIComponent(
            shop.upi_banking_name
          )}&am=${sale.total_amount.toFixed(2)}&cu=INR`;

          shop.generated_upi_qr = await QRCode.toDataURL(upiUrl);
        } else {
          shop.generated_upi_qr = null;
        }

        const htmlContent = createInvoiceHTML({ sale, shop, localSettings });

        win = new BrowserWindow({
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
        const safeRef = String(sale.reference_no || "INV").replace(/[^a-zA-Z0-9_-]/g, "_");
        const fileName = `Invoice-${safeRef}.pdf`;

        // Save PDF to temp_pdfs for static HTTP serving if needed
        let pdfUrl = null;
        try {
          const { app } = require("electron");
          const fs = require("fs");
          const path = require("path");
          const userDataPath = app.getPath("userData");
          const tempPdfsDir = path.join(userDataPath, "temp_pdfs");
          if (!fs.existsSync(tempPdfsDir)) {
            fs.mkdirSync(tempPdfsDir, { recursive: true });
          }
          const tempFilePath = path.join(tempPdfsDir, fileName);
          fs.writeFileSync(tempFilePath, pdfData);

          // Build local HTTP URL (accessible on port 5000 or custom port)
          pdfUrl = `http://127.0.0.1:5000/temp-pdfs/${encodeURIComponent(fileName)}`;
        } catch (fileErr) {
          console.warn("[WHATSAPP-IPC] Temp PDF write warning:", fileErr.message);
        }

        try {
          const { uploadInvoiceToDrive, isConnected } = require("../googleDriveService");
          if (isConnected && isConnected()) {
            const invoiceData = {
              shopName: shop?.shop_name || "Store",
              invoiceNo: sale.reference_no,
              date: sale.created_at || Date.now(),
              customerName: sale.customer_name || "Customer",
              customerPhone: customerPhone,
              items: (sale.items || []).map((item) => ({
                name: item.product_name,
                qty: item.quantity,
                rate: item.rate,
                amount: item.quantity * item.rate,
              })),
              totalAmount: sale.total_amount,
            };
            const fileId = await uploadInvoiceToDrive(invoiceData);
            if (fileId) {
              pdfUrl = `https://getkosh.co.in/invoice/web-view/${fileId}`;
            }
          }
        } catch (e) {
          console.warn("[WHATSAPP] Cloud link generation notice:", e.message);
        }

        // Fetch active/selected WhatsApp template for invoice category
        let invoiceCaption = `Here is your invoice PDF (${sale.reference_no})`;
        let templateName = null;
        let templateParams = [];

        try {
          const { getSalesBillingSettings } = await import("../../backend/repositories/salesBillingSettingsRepository.mjs");
          const { getTemplateById, getWhatsAppTemplates } = await import("../../backend/repositories/whatsappTemplateRepository.mjs");
          const billingSettings = getSalesBillingSettings();

          let selectedTpl = null;
          if (billingSettings?.whatsapp_template_id) {
            selectedTpl = getTemplateById(billingSettings.whatsapp_template_id);
          }
          if (!selectedTpl) {
            const invoiceTemplates = getWhatsAppTemplates("invoice");
            selectedTpl = invoiceTemplates.find((t) => t.is_default === 1 && t.meta_status === "APPROVED") || 
                           invoiceTemplates.find((t) => t.meta_status === "APPROVED") || 
                           invoiceTemplates.find((t) => t.is_default === 1) || 
                           invoiceTemplates[0];
          }

          if (selectedTpl) {
            templateName = selectedTpl.meta_template_name || selectedTpl.name;
            if (selectedTpl.content) {
              const shopName = shop?.shop_name || "Store";
              const customerName = sale.customer_name || "Customer";
              const totalAmt = sale.total_amount ? Number(sale.total_amount).toFixed(2) : "0.00";
              const refNo = sale.reference_no || "";

              invoiceCaption = selectedTpl.content
                .replace(/\{\{name\}\}/gi, customerName)
                .replace(/\{\{shop_name\}\}/gi, shopName)
                .replace(/\{\{total\}\}/gi, totalAmt)
                .replace(/\{\{amount\}\}/gi, totalAmt)
                .replace(/\{\{reference_no\}\}/gi, refNo)
                .replace(/\{\{invoiceno\}\}/gi, refNo);

              // Extract order of variables in content to populate templateParams for Meta/MSG91 template dispatch
              const matches = selectedTpl.content.match(/\{\{([A-Za-z0-9_]+)\}\}/g) || [];
              const paramValueMap = {
                name: customerName,
                shopname: shopName,
                shop_name: shopName,
                total: totalAmt,
                amount: totalAmt,
                referenceno: refNo,
                reference_no: refNo,
                invoiceno: refNo,
                invoice_no: refNo,
              };

              templateParams = matches.map((m) => {
                const key = m.replace(/[\{\}]/g, "").toLowerCase();
                return paramValueMap[key] || customerName;
              });
            }
          }
        } catch (err) {
          console.warn("[WHATSAPP-IPC] Invoice template resolution notice:", err.message);
        }

        // Dispatch via WhatsApp Router with category 'invoice'
        await routeAndSendPdf({
          category: "invoice",
          phone: customerPhone,
          pdfBase64,
          pdfUrl,
          fileName,
          caption: invoiceCaption,
          templateName,
          templateParams,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to send WhatsApp PDF:", error);
        return { success: false, error: error.message };
      } finally {
        if (win && !win.isDestroyed()) win.close();
      }
    }
  );

  ipcMain.handle(
    "whatsapp-customer-ledger",
    async (event, { customerId, phone, filters }) => {
      console.log("[KOSH] Generating Ledger PDF for Customer ID:", customerId);

      try {
        const {
          getCustomerLedger,
        } = require("../../backend/repositories/customerRepository.mjs");
        const {
          createCustomerLedgerHTML,
        } = require("../customerLedgerTemplate.js");

        const shop = await getShop();
        const ledgerData = await getCustomerLedger(customerId, filters);

        if (!ledgerData) {
          throw new Error("Could not fetch ledger data from database");
        }

        const customer = ledgerData.customer;
        const ledger = ledgerData.ledger;

        const htmlContent = createCustomerLedgerHTML(shop, customer, ledger);

        const win = new BrowserWindow({
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
        const safeName = ledgerData.customer.name.replace(/[^a-z0-9]/gi, "_");
        const fileName = `Ledger-${safeName}.pdf`;
        const caption = `Dear ${ledgerData.customer.name}, here is your account ledger statement from ${filters.startDate} to ${filters.endDate}.`;

        // Dispatch via WhatsApp Router with category 'ledgers'
        await routeAndSendPdf({
          category: "ledgers",
          phone,
          pdfBase64,
          fileName,
          caption,
        });

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
