const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Singleton instance variables
let client = null;
let qrCodeDataUrl = "";
let status = "disconnected";
let mainWindow = null;
let isInitializing = false;
let initTimer = null;
let initRetryCount = 0;
const MAX_RETRIES = 3;

/**
 * ✅ Helper to find the user's installed Chrome or Edge browser.
 */
function getBrowserExecutablePath() {
  console.log("[WHATSAPP] STEP 2: Searching for browser executable...");

  const possiblePaths = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    path.join(
      os.homedir(),
      "AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe"
    ),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(
      os.homedir(),
      "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
    ),
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        console.log(`[WHATSAPP] ✅ Found browser at: ${p}`);
        return p;
      }
    } catch (err) {
      console.error(`[WHATSAPP] Error checking path ${p}:`, err.message);
    }
  }

  console.warn("[WHATSAPP] ❌ No system browser found in standard paths.");
  return null;
}

// ✅ Clean up function to prevent zombies
async function cleanupService() {
  console.log("[WHATSAPP] Cleaning up service...");
  if (initTimer) clearTimeout(initTimer);
  initTimer = null;

  isInitializing = false;
  status = "disconnected";
  qrCodeDataUrl = null;

  if (client) {
    try {
      await client.destroy();
      console.log("[WHATSAPP] Old client destroyed.");
    } catch (e) {
      console.error("[WHATSAPP] Error destroying client:", e.message);
    }
    client = null;
  }

  // Notify UI
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("whatsapp-status", {
      status: "disconnected",
      qr: null,
    });
  }
}

/**
 * Initializes WhatsApp.
 */
async function initializeWhatsApp(win) {
  console.log("[WHATSAPP] STEP 1: initializeWhatsApp called");

  // Update window reference even if already running
  if (win) mainWindow = win;

  if (client && (status === "ready" || status === "scanning")) {
    console.log("[WHATSAPP] Client already running. Sending status to UI.");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("whatsapp-status", {
        status,
        qr: qrCodeDataUrl,
      });
    }
    return;
  }

  if (isInitializing) {
    console.log("[WHATSAPP] Initialization already in progress... skipping.");
    return;
  }

  isInitializing = true;
  console.log(`[WHATSAPP] Starting Client (Attempt ${initRetryCount + 1})...`);

  // SAFETY TIMEOUT
  if (initTimer) clearTimeout(initTimer);
  initTimer = setTimeout(async () => {
    console.error(
      "[WHATSAPP] ⚠️ Initialization timed out (Stuck). Restarting..."
    );
    await cleanupService();
    if (initRetryCount < MAX_RETRIES) {
      initRetryCount++;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", {
          status: "disconnected",
          qr: null,
        });
      }
      setTimeout(() => initializeWhatsApp(mainWindow), 2000);
    } else {
      console.error("[WHATSAPP] Max retries reached. Giving up.");
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", {
          status: "error", // Use specific error status
          qr: null,
        });
      }
    }
  }, 30000); // Increased to 30s

  try {
    const execPath = getBrowserExecutablePath();

    if (!execPath) {
      console.error("[WHATSAPP] CRITICAL: No browser found. CANNOT START.");
      // Force status update so UI shows error instead of spinning forever
      status = "error";
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", {
          status: "error", // Update UI to handle 'error' state if possible
          qr: null,
        });
      }
      await cleanupService();
      return;
    }

    console.log("[WHATSAPP] STEP 3: Creating Client instance...");

    client = new Client({
      authStrategy: new LocalAuth({
        clientId: "KOSH-client",
        dataPath: path.join(
          require("electron").app.getPath("userData"),
          ".wwebjs_auth"
        ),
      }),
      puppeteer: {
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
          "--disable-extensions",
          "--disable-software-rasterizer",
        ],
      },
    });

    client.on("qr", (qr) => {
      console.log("[WHATSAPP] STEP 4: QR Code Received!");
      if (initTimer) clearTimeout(initTimer);
      initRetryCount = 0;

      QRCode.toDataURL(qr, (err, url) => {
        if (err) {
          console.error("[WHATSAPP] QR Gen Error:", err);
          return;
        }
        qrCodeDataUrl = url;
        status = "scanning";
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log("[WHATSAPP] Sending QR to UI...");
          mainWindow.webContents.send("whatsapp-status", {
            status,
            qr: qrCodeDataUrl,
          });
        }
      });
    });

    client.on("ready", () => {
      console.log("[WHATSAPP] STEP 5: Client is READY!");
      if (initTimer) clearTimeout(initTimer);
      initRetryCount = 0;
      status = "ready";
      qrCodeDataUrl = null;
      isInitializing = false;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", { status, qr: null });
      }
    });

    client.on("authenticated", () => {
      console.log("[WHATSAPP] Client Authenticated");
      status = "authenticated";
      qrCodeDataUrl = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", { status, qr: null });
      }
    });

    client.on("disconnected", async (reason) => {
      console.log("[WHATSAPP] Disconnected:", reason);
      await cleanupService();
    });

    client.on("auth_failure", async (msg) => {
      console.error("[WHATSAPP] Auth Failure:", msg);
      await cleanupService();
    });

    console.log("[WHATSAPP] STEP 3.5: Await client.initialize()...");
    await client.initialize();
  } catch (e) {
    console.error("[WHATSAPP] Init Exception:", e);
    await cleanupService();
    if (initRetryCount < MAX_RETRIES) {
      initRetryCount++;
      setTimeout(() => initializeWhatsApp(mainWindow), 2000);
    }
  }
}

async function sendWhatsAppMessage(number, message) {
  if (status !== "ready" || !client)
    throw new Error("WhatsApp is not connected.");
  let cleanPhone = number.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  const chatId = `${cleanPhone}@c.us`;

  try {
    if (client.pupPage && client.pupPage.isClosed())
      throw new Error("Browser closed");
    const response = await client.sendMessage(chatId, message);
    return { success: true, response };
  } catch (error) {
    console.error("[WHATSAPP] Send Error:", error);
    // Add logic to restart if session died
    if (
      error.message &&
      (error.message.includes("Session closed") ||
        error.message.includes("Protocol error"))
    ) {
      await cleanupService();
      initializeWhatsApp(mainWindow);
    }
    throw new Error("Failed to send: " + error.message);
  }
}

async function sendWhatsAppPdf(number, pdfBase64, fileName, caption) {
  if (status !== "ready" || !client)
    throw new Error("WhatsApp is not connected.");
  let cleanPhone = number.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  const chatId = `${cleanPhone}@c.us`;
  const { MessageMedia } = require("whatsapp-web.js");
  const media = new MessageMedia("application/pdf", pdfBase64, fileName);
  await client.sendMessage(chatId, media, { caption });
  return { success: true };
}

function getWhatsAppStatus() {
  return { status, qr: qrCodeDataUrl };
}

async function restartWhatsApp() {
  console.log("[WHATSAPP] Manual Restart Triggered");
  await cleanupService();
  initRetryCount = 0;
  if (mainWindow) {
    setTimeout(() => initializeWhatsApp(mainWindow), 1000);
  }
  return { success: true };
}

module.exports = {
  initializeWhatsApp,
  sendWhatsAppMessage,
  getWhatsAppStatus,
  sendWhatsAppPdf,
  restartWhatsApp,
};
