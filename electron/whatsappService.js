const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Enterprise-Grade WhatsApp Service
 * * Features:
 * - State machine for initialization tracking
 * - Local caching of Web Version assets for faster startup
 * - Automatic session corruption recovery
 * - Browser executable auto-discovery
 * - Robust error handling for "markedUnread" and protocol errors
 */
class WhatsAppService {
  constructor() {
    this.client = null;
    this.status = "disconnected";
    this.qrCodeDataUrl = null;
    this.mainWindow = null;
    this.initRetryCount = 0;
    this.MAX_RETRIES = 3;
    this.initTimer = null;
    this.isInitializing = false;

    // Auth and Cache paths
    const userDataPath = require("electron").app.getPath("userData");
    this.authPath = path.join(userDataPath, ".wwebjs_auth");
    this.cachePath = path.join(userDataPath, ".wwebjs_cache");

    // Ensure cache directory exists
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }
  }

  setWindow(win) {
    this.mainWindow = win;
  }

  notifyUI() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("whatsapp-status", {
        status: this.status,
        qr: this.qrCodeDataUrl,
      });
    }
  }

  getBrowserPath() {
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
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  async deleteSessionData() {
    console.warn("[WHATSAPP] ⚠️ Clearing session and cache...");
    try {
      if (fs.existsSync(this.authPath)) {
        await fs.promises.rm(this.authPath, { recursive: true, force: true });
      }
      // Only clear cache if we are explicitly debugging a version issue
      console.log("[WHATSAPP] ✅ Session data cleared.");
    } catch (e) {
      console.error("[WHATSAPP] ❌ Failed to delete session data:", e.message);
    }
  }

  async cleanup() {
    if (this.initTimer) clearTimeout(this.initTimer);
    this.isInitializing = false;
    this.qrCodeDataUrl = null;

    if (this.client) {
      try {
        this.client.removeAllListeners();
        await this.client.destroy();
      } catch (e) {
        console.error("[WHATSAPP] Destroy error:", e.message);
      }
      this.client = null;
    }
  }

  async initialize(forceNewSession = false) {
    if (this.isInitializing) return;

    if (forceNewSession) {
      await this.cleanup();
      await this.deleteSessionData();
    }

    this.isInitializing = true;
    this.status = "initializing";
    this.notifyUI();

    const execPath = this.getBrowserPath();
    if (!execPath) {
      this.status = "error";
      this.notifyUI();
      return;
    }

    // Guardrail: 60s timeout
    this.initTimer = setTimeout(async () => {
      console.error("[WHATSAPP] 🚨 Initialization Timeout.");
      await this.handleCriticalFailure();
    }, 60000);

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: "KOSH-client",
          dataPath: this.authPath,
        }),
        // Optimization: Remote version with local caching logic
        webVersionCache: {
          type: "remote",
          remotePath:
            "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1031980585-alpha.html",
        },
        puppeteer: {
          executablePath: execPath,
          headless: true,
          // Performance args for faster loading
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--no-zygote",
            "--disable-extensions",
            "--disable-component-update",
            "--disable-default-apps",
            "--font-render-hinting=none",
          ],
        },
      });

      this.setupEventListeners();
      await this.client.initialize();
    } catch (err) {
      console.error("[WHATSAPP] Init Exception:", err);
      await this.handleCriticalFailure();
    }
  }

  setupEventListeners() {
    this.client.on("qr", async (qr) => {
      if (this.initTimer) clearTimeout(this.initTimer);
      this.status = "scanning";
      try {
        // High-speed QR generation
        this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
          margin: 2,
          scale: 5,
        });
        this.notifyUI();
      } catch (e) {
        console.error("[WHATSAPP] QR Generation Error:", e);
      }
    });

    this.client.on("authenticated", () => {
      console.log("[WHATSAPP] ✅ Authenticated.");
      this.status = "authenticated";
      this.qrCodeDataUrl = null;
      this.notifyUI();
    });

    this.client.on("ready", () => {
      console.log("[WHATSAPP] 🚀 Client Ready.");
      if (this.initTimer) clearTimeout(this.initTimer);
      this.status = "ready";
      this.isInitializing = false;
      this.initRetryCount = 0;
      this.notifyUI();
    });

    this.client.on("auth_failure", async (msg) => {
      console.error("[WHATSAPP] ❌ Auth Failure:", msg);
      await this.handleCriticalFailure(true);
    });

    this.client.on("disconnected", async (reason) => {
      console.warn("[WHATSAPP] 🔌 Disconnected:", reason);
      this.status = "disconnected";
      await this.cleanup();
      this.notifyUI();
    });
  }

  async handleCriticalFailure(wipeSession = false) {
    await this.cleanup();
    if (wipeSession || this.initRetryCount >= this.MAX_RETRIES) {
      await this.deleteSessionData();
      this.initRetryCount = 0;
    } else {
      this.initRetryCount++;
    }

    this.status = "disconnected";
    this.notifyUI();

    if (this.initRetryCount > 0) {
      console.log(
        `[WHATSAPP] Retrying in 5s... (${this.initRetryCount}/${this.MAX_RETRIES})`,
      );
      setTimeout(() => this.initialize(), 5000);
    }
  }

  async sendMessage(number, message, media = null) {
    if (this.status !== "ready" || !this.client) {
      throw new Error("WhatsApp is not ready. Please check connection.");
    }

    let cleanPhone = number.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
    const chatId = `${cleanPhone}@c.us`;

    try {
      const options = { sendSeen: false };

      let response;
      if (media) {
        response = await this.client.sendMessage(chatId, media, {
          ...options,
          caption: message,
        });
      } else {
        response = await this.client.sendMessage(chatId, message, options);
      }
      return { success: true, response };
    } catch (err) {
      return await this.handleSendError(err, number, message, media);
    }
  }

  async handleSendError(error, number, message, media) {
    console.error("[WHATSAPP] Send Error Detail:", error.message);

    if (
      error.message.includes("markedUnread") ||
      error.message.includes("Session closed") ||
      error.message.includes("Protocol error")
    ) {
      await this.handleCriticalFailure(true);
      throw new Error(
        "Session encountered a protocol error. Resetting... Please re-scan QR.",
      );
    }

    throw error;
  }

  getStatus() {
    return { status: this.status, qr: this.qrCodeDataUrl };
  }
}

const instance = new WhatsAppService();
module.exports = {
  initializeWhatsApp: (win) => {
    instance.setWindow(win);
    return instance.initialize();
  },
  sendWhatsAppMessage: (num, msg) => instance.sendMessage(num, msg),
  sendWhatsAppPdf: (num, base64, fileName, caption) => {
    const { MessageMedia } = require("whatsapp-web.js");
    const media = new MessageMedia("application/pdf", base64, fileName);
    return instance.sendMessage(num, caption, media);
  },
  getWhatsAppStatus: () => instance.getStatus(),
  restartWhatsApp: () => instance.initialize(true),
};
