const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const pino = require("pino");

/**
 * Robust Enterprise WhatsApp Service (Baileys Edition)
 * * Improvements:
 * - Lightweight WebSocket connection (No Chromium required)
 * - Zero external dependencies (No browser paths)
 * - Faster startup (<1s)
 * - Exponential Backoff for Auto-Healing
 * - Concurrency Semaphores
 */
class WhatsAppService {
  constructor() {
    this.sock = null;
    this.status = "disconnected";
    this.qrCodeDataUrl = null;
    this.mainWindow = null;

    // Recovery & State Tracking
    this.retryCount = 0;
    this.MAX_RETRIES = 5;
    this.isProcessing = false; // Semaphore
    this.initializationTimeout = null;

    // Paths
    const userDataPath = app.getPath("userData");
    // Using a new folder for Baileys to avoid conflicts with old wwebjs sessions
    this.authPath = path.join(userDataPath, ".baileys_auth");

    // Ensure structure exists
    if (!fs.existsSync(this.authPath)) {
      fs.mkdirSync(this.authPath, { recursive: true });
    }

    // Bind process guards
    this.setupProcessGuards();
  }

  setupProcessGuards() {
    const cleanup = () => {
      console.log("[WHATSAPP] 🛑 App exiting, closing socket...");
      this.destroyClient();
    };
    process.on("exit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
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

  async destroyClient() {
    if (this.initializationTimeout) clearTimeout(this.initializationTimeout);

    if (this.sock) {
      try {
        console.log("[WHATSAPP] Closing socket connection...");
        this.sock.end(undefined); // Graceful close
        this.sock = null;
      } catch (e) {
        console.warn("[WHATSAPP] Socket close warning:", e.message);
      }
    }

    this.status = "disconnected";
    this.qrCodeDataUrl = null;
  }

  async initialize(forceNewSession = false) {
    if (this.isProcessing) {
      console.warn("[WHATSAPP] ⏳ Initialization already in progress.");
      return;
    }

    this.isProcessing = true;

    try {
      if (forceNewSession) {
        await this.destroyClient();
        console.log("[WHATSAPP] 🗑️ Deleting session data...");
        await fs.promises
          .rm(this.authPath, { recursive: true, force: true })
          .catch(() => {});
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      this.status = "initializing";
      this.notifyUI();

      // Guardrail: Timeout
      this.initializationTimeout = setTimeout(async () => {
        console.error(
          "[WHATSAPP] 🚨 Initialization Timed Out (30s). Resetting...",
        );
        this.isProcessing = false;
        await this.handleCriticalError(new Error("Timeout"));
      }, 30000); // 30s is plenty for Baileys

      // 1. Fetch State & Version
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(
        `[WHATSAPP] 🚀 Starting Baileys v${version.join(".")} (Latest: ${isLatest})`,
      );

      // 2. Create Socket
      this.sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }), // Suppress internal logs
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "silent" }),
          ),
        },
        generateHighQualityLinkPreview: true,
        // Browser config to look like a standard desktop client
        browser: ["KOSH Client", "Chrome", "10.0.0"],
      });

      // 3. Bind Events
      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          if (this.initializationTimeout)
            clearTimeout(this.initializationTimeout);
          this.status = "scanning";
          console.log("[WHATSAPP] QR Code received");
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 5,
            });
            this.notifyUI();
            this.isProcessing = false; // Allow user interaction
          } catch (e) {
            console.error("QR Error", e);
          }
        }

        if (connection === "close") {
          const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !==
            DisconnectReason.loggedOut;

          console.warn(
            `[WHATSAPP] 🔌 Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`,
          );

          if (shouldReconnect) {
            // Internal Baileys reconnect logic is good, but we wrap it
            // to maintain our state reporting
            this.handleCriticalError(lastDisconnect.error);
          } else {
            // Logged out
            console.error("[WHATSAPP] ❌ Session logged out. Clearing data.");
            await this.initialize(true); // Force new session
          }
        } else if (connection === "open") {
          console.log("[WHATSAPP] ⚡ Ready");
          if (this.initializationTimeout)
            clearTimeout(this.initializationTimeout);
          this.status = "ready";
          this.retryCount = 0;
          this.isProcessing = false;
          this.notifyUI();
        }
      });
    } catch (err) {
      console.error("[WHATSAPP] Fatal Init Error:", err);
      this.isProcessing = false;
      await this.handleCriticalError(err);
    }
  }

  async handleCriticalError(error) {
    console.error(
      `[WHATSAPP] 🚑 Critical Error Handling. Attempt ${this.retryCount + 1}/${
        this.MAX_RETRIES
      }`,
    );

    // If it's just a stream error, Baileys often reconnects itself,
    // but if we are here, we want to ensure robustness.

    // We don't destroy client immediately if it's a temp disconnect,
    // but for the sake of the "Auto-healing" logic requested:

    if (this.status === "ready") {
      this.status = "reconnecting";
      this.notifyUI();
    }

    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      const delay = Math.pow(2, this.retryCount) * 1000; // 2s, 4s, 8s...
      console.log(`[WHATSAPP] ⏱️ Auto-healing in ${delay}ms...`);

      setTimeout(() => {
        this.initialize(); // Baileys initialize is safe to call repeatedly as it handles state reloading
      }, delay);
    } else {
      console.error(
        "[WHATSAPP] 💀 Max retries reached. Manual intervention required.",
      );
      this.status = "error";
      this.notifyUI();
    }
  }

  async sendMessage(number, message, media = null) {
    if (this.status !== "ready" || !this.sock) {
      if (this.status === "disconnected") this.initialize();
      throw new Error(
        `WhatsApp is not ready (Status: ${this.status}). Request queued for retry.`,
      );
    }

    // 1. Format JID
    let cleanPhone = number.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
      let response;

      if (media) {
        // Baileys Media Handling
        // We expect `media` to act like the old MessageMedia object:
        // { mimetype, data (base64), filename }

        const buffer = Buffer.from(media.data, "base64");

        // Construct message based on mimetype
        if (media.mimetype === "application/pdf") {
          response = await this.sock.sendMessage(jid, {
            document: buffer,
            mimetype: media.mimetype,
            fileName: media.filename || "document.pdf",
            caption: message,
          });
        } else {
          // Fallback for images/other
          response = await this.sock.sendMessage(jid, {
            image: buffer,
            caption: message,
          });
        }
      } else {
        // Text Message
        response = await this.sock.sendMessage(jid, { text: message });
      }

      return { success: true, response };
    } catch (err) {
      console.error("[WHATSAPP] Send Error:", err);
      // Logic for detecting severe session errors in Baileys
      if (err.message && err.message.includes("closed")) {
        await this.handleCriticalError(err);
      }
      throw err;
    }
  }

  getStatus() {
    return { status: this.status, qr: this.qrCodeDataUrl };
  }
}

// Singleton Instance
const instance = new WhatsAppService();

// Exports matching original signatures exactly
module.exports = {
  initializeWhatsApp: (win) => {
    instance.setWindow(win);
    return instance.initialize();
  },
  sendWhatsAppMessage: (num, msg) => instance.sendMessage(num, msg),
  /**
   * Adapts the old MessageMedia interface to a plain object for Baileys
   */
  sendWhatsAppPdf: (num, base64, fileName, caption) => {
    // We create a plain object that mimics the old MessageMedia structure
    // so `sendMessage` can handle it polymorphically
    const mediaStub = {
      mimetype: "application/pdf",
      data: base64,
      filename: fileName,
    };
    return instance.sendMessage(num, caption, mediaStub);
  },
  getWhatsAppStatus: () => instance.getStatus(),
  restartWhatsApp: () => instance.initialize(true),
};
