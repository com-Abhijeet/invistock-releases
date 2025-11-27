const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

// Singleton instance variables
let client = null;
let qrCodeDataUrl = "";
let status = "disconnected";
let mainWindow = null;
let isInitializing = false;

/**
 * ✅ Helper to find the user's installed Chrome or Edge browser.
 * This prevents the "spawn ENOENT" error by avoiding the bundled Chromium.
 */
function getBrowserExecutablePath() {
  const possiblePaths = [
    // Chrome (64-bit)
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    // Chrome (32-bit)
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    // Microsoft Edge (Standard on Windows 10/11)
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log("[WHATSAPP] Using browser at:", p);
      return p;
    }
  }

  // Fallback: If we can't find a browser, return null.
  // Puppeteer will try its default, which might fail if not unpacked,
  // but this covers 99% of Windows users.
  console.warn("[WHATSAPP] No system browser found. Trying default...");
  return null;
}

/**
 * Initializes WhatsApp. If already running, it just updates the window reference.
 */
function initializeWhatsApp(win) {
  mainWindow = win;

  if (client || isInitializing) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("whatsapp-status", {
        status,
        qr: qrCodeDataUrl,
      });
    }
    return;
  }

  isInitializing = true;

  try {
    console.log("[WHATSAPP] Starting Client...");

    const execPath = getBrowserExecutablePath();

    client = new Client({
      authStrategy: new LocalAuth({ clientId: "KOSH-client" }),
      puppeteer: {
        // ✅ CRITICAL: Point to the external browser
        executablePath: execPath,
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      },
    });

    client.on("qr", (qr) => {
      QRCode.toDataURL(qr, (err, url) => {
        if (err) return;
        qrCodeDataUrl = url;
        status = "scanning";
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("whatsapp-status", {
            status,
            qr: qrCodeDataUrl,
          });
        }
      });
    });

    client.on("ready", () => {
      status = "ready";
      qrCodeDataUrl = null;
      isInitializing = false;
      console.log("[WHATSAPP] Client is ready!");
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", { status, qr: null });
      }
    });

    client.on("authenticated", () => {
      status = "authenticated";
      qrCodeDataUrl = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", { status, qr: null });
      }
    });

    client.on("disconnected", (reason) => {
      status = "disconnected";
      client = null;
      isInitializing = false;
      console.log("[WHATSAPP] Client was logged out:", reason);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", { status, qr: null });
      }
    });

    client.initialize();
  } catch (e) {
    console.error("[WHATSAPP] Initialization failed:", e);
    isInitializing = false;
    client = null;
  }
}

async function sendWhatsAppMessage(number, message) {
  if (status !== "ready" || !client) {
    throw new Error("WhatsApp is not connected. Please scan QR in Settings.");
  }

  let cleanPhone = number.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  const chatId = `${cleanPhone}@c.us`;

  try {
    if (client.pupPage && client.pupPage.isClosed()) {
      throw new Error(
        "Browser session closed unexpectedly. Restarting service..."
      );
    }

    const response = await client.sendMessage(chatId, message);
    return { success: true, response };
  } catch (error) {
    console.error("[WHATSAPP] Send failed:", error);

    if (
      error.message.includes("Session closed") ||
      error.message.includes("Protocol error")
    ) {
      status = "disconnected";
      client = null;
      isInitializing = false;
      initializeWhatsApp(mainWindow);
      throw new Error(
        "Connection lost. Restarting WhatsApp service... Please try again in a moment."
      );
    }

    throw new Error("Failed to send message: " + error.message);
  }
}

// ... (Keep sendWhatsAppPdf as it was, no changes needed there)
async function sendWhatsAppPdf(number, pdfBase64, fileName, caption) {
  // ... (Paste your existing sendWhatsAppPdf function here if you used it)
  // If you need me to provide this again, let me know.
  // But for the TEXT message error, the code above is what matters.

  // Reuse logic from sendWhatsAppMessage for connection check...
  if (status !== "ready" || !client) {
    throw new Error("WhatsApp is not connected.");
  }

  let cleanPhone = number.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  const chatId = `${cleanPhone}@c.us`;

  // We need MessageMedia, make sure to import it at the top if you use this
  const { MessageMedia } = require("whatsapp-web.js");

  const media = new MessageMedia("application/pdf", pdfBase64, fileName);
  await client.sendMessage(chatId, media, { caption });
  return { success: true };
}

function getWhatsAppStatus() {
  return { status, qr: qrCodeDataUrl };
}

module.exports = {
  initializeWhatsApp,
  sendWhatsAppMessage,
  getWhatsAppStatus,
  sendWhatsAppPdf,
};
