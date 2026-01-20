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
      "AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe",
    ),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(
      os.homedir(),
      "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
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

/**
 * ✅ Helper to DELETE the session data folder.
 * This is necessary when session data becomes corrupted or incompatible
 * with the pinned web version.
 */
async function deleteSessionData() {
  const authPath = path.join(
    require("electron").app.getPath("userData"),
    ".wwebjs_auth",
  );
  console.log(`[WHATSAPP] ⚠️ DELETING Corrupted Session Data at: ${authPath}`);

  try {
    if (fs.existsSync(authPath)) {
      // Use fs.rm if available (Node 14.14+), otherwise rmdir
      if (fs.rm) {
        await fs.promises.rm(authPath, { recursive: true, force: true });
      } else {
        await fs.promises.rmdir(authPath, { recursive: true });
      }
      console.log("[WHATSAPP] ✅ Session data deleted successfully.");
    }
  } catch (e) {
    console.error("[WHATSAPP] ❌ Error deleting session data:", e.message);
  }
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
      "[WHATSAPP] ⚠️ Initialization timed out (Stuck). Restarting...",
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
  }, 45000); // Increased to 45s to allow for remote version download

  try {
    const execPath = getBrowserExecutablePath();

    if (!execPath) {
      console.error("[WHATSAPP] CRITICAL: No browser found. CANNOT START.");
      status = "error";
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("whatsapp-status", {
          status: "error",
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
          ".wwebjs_auth",
        ),
      }),
      // ✅ FIX: Using the specific alpha version provided
      webVersionCache: {
        type: "remote",
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/refs/heads/main/html/2.3000.1031490220-alpha.html`,
      },
      puppeteer: {
        executablePath: execPath,
        headless: true, // Keeping it headless for production feel, change to false if debugging needed
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
      // console.log("[WHATSAPP] STEP 4: QR Code Received!");
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
          // console.log("[WHATSAPP] Sending QR to UI...");
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
    // ✅ FIX: Passing sendSeen: false to avoid markedUnread error
    const response = await client.sendMessage(chatId, message, {
      sendSeen: false,
    });
    return { success: true, response };
  } catch (error) {
    console.error("[WHATSAPP] Send Error:", error);

    // ✅ CHECK FOR SESSION INCOMPATIBILITY (markedUnread)
    // We still keep this as a failsafe
    if (error.message && error.message.includes("markedUnread")) {
      console.error(
        "[WHATSAPP] 🚨 DETECTED SESSION INCOMPATIBILITY! Wiping session and restarting...",
      );
      await cleanupService();
      await deleteSessionData();
      initializeWhatsApp(mainWindow);
      throw new Error(
        "WhatsApp session was incompatible. The system is resetting. Please scan QR code again.",
      );
    }

    if (
      error.message &&
      (error.message.includes("Session closed") ||
        error.message.includes("Protocol error") ||
        error.message.includes("Evaluation failed"))
    ) {
      console.log("[WHATSAPP] Critical error detected. Restarting service...");
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
  try {
    // ✅ FIX: Passing sendSeen: false to avoid markedUnread error
    await client.sendMessage(chatId, media, { caption, sendSeen: false });
    return { success: true };
  } catch (error) {
    console.error("[WHATSAPP] PDF Send Error:", error);

    // ✅ CHECK FOR SESSION INCOMPATIBILITY (markedUnread)
    if (error.message && error.message.includes("markedUnread")) {
      console.error(
        "[WHATSAPP] 🚨 DETECTED SESSION INCOMPATIBILITY! Wiping session and restarting...",
      );
      await cleanupService();
      await deleteSessionData();
      initializeWhatsApp(mainWindow);
      throw new Error(
        "WhatsApp session was incompatible. The system is resetting. Please scan QR code again.",
      );
    }

    if (
      error.message &&
      (error.message.includes("Session closed") ||
        error.message.includes("Protocol error") ||
        error.message.includes("Evaluation failed"))
    ) {
      console.log(
        "[WHATSAPP] Critical error detected during PDF send. Restarting...",
      );
      await cleanupService();
      initializeWhatsApp(mainWindow);
    }
    throw error;
  }
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
