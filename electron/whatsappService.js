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
 * - In-Memory Bounded Queue with Stale Message Pruning
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
    this.healingTimeout = null;

    // Queue Management
    this.messageQueue = [];
    this.MAX_QUEUE_SIZE = 500; // Restrict queue size to prevent memory leaks
    this.QUEUE_TIMEOUT_MS = 60 * 60 * 1000; // 1 Hour timeout for stale messages
    this.isProcessingQueue = false;

    // Periodic cleanup to avoid memory leaks
    this.queueCleanupInterval = setInterval(
      () => this.cleanupQueue(),
      10 * 60 * 1000,
    ); // Check every 10 mins

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

    // Safely hook into Electron's lifecycle
    if (app) {
      app.on("before-quit", cleanup);
    }

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
        queueSize: this.messageQueue.length,
      });
    }
  }

  cleanupQueue() {
    const now = Date.now();
    const initialLength = this.messageQueue.length;

    this.messageQueue = this.messageQueue.filter((item) => {
      if (now - item.timestamp > this.QUEUE_TIMEOUT_MS) {
        item.reject(new Error("Message timed out in queue."));
        return false; // Remove from queue
      }
      return true; // Keep in queue
    });

    if (initialLength !== this.messageQueue.length) {
      console.log(
        `[WHATSAPP] 🧹 Cleaned up ${initialLength - this.messageQueue.length} stale messages from queue.`,
      );
      this.notifyUI();
    }
  }

  async destroyClient() {
    if (this.initializationTimeout) clearTimeout(this.initializationTimeout);
    if (this.healingTimeout) clearTimeout(this.healingTimeout);
    if (this.queueCleanupInterval) clearInterval(this.queueCleanupInterval);

    // Reject all pending queue items
    this.messageQueue.forEach((item) =>
      item.reject(new Error("WhatsApp client destroyed.")),
    );
    this.messageQueue = [];

    if (this.sock) {
      try {
        console.log("[WHATSAPP] Closing socket connection...");
        this.sock.ev.removeAllListeners(); // CRITICAL: Prevent zombie listeners
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

        // Restart cleanup interval since destroyClient clears it
        this.queueCleanupInterval = setInterval(
          () => this.cleanupQueue(),
          10 * 60 * 1000,
        );
      } else if (this.sock) {
        try {
          this.sock.ev.removeAllListeners(); // CRITICAL: Prevent zombie listeners
          this.sock.end(undefined);
        } catch (e) {}
        this.sock = null;
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

      // 1. Fetch State & Version - with robust corruption handling
      let state, saveCreds;
      try {
        const authState = await useMultiFileAuthState(this.authPath);
        state = authState.state;
        saveCreds = authState.saveCreds;
      } catch (authErr) {
        console.error(
          "[WHATSAPP] 🚨 Auth state files corrupted on disk. Wiping...",
          authErr,
        );
        this.isProcessing = false;
        if (this.initializationTimeout)
          clearTimeout(this.initializationTimeout);
        return this.initialize(true); // Force wipe and restart
      }

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
        browser: ["KOSH App", "Chrome", "111.0.0.0"], // Updated user agent
        syncFullHistory: false, // CRITICAL: Stop history sync from crashing the socket
        markOnlineOnConnect: true,
        getMessage: async () => {
          // CRITICAL: Required for message retries, prevents crash on receipt/retry
          return { conversation: "" };
        },
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
            this.isProcessing = false;
          } catch (e) {
            console.error("QR Error", e);
          }
        }

        if (connection === "close") {
          if (this.initializationTimeout)
            clearTimeout(this.initializationTimeout);
          this.isProcessing = false;

          const statusCode = lastDisconnect?.error?.output?.statusCode;

          // 401 = Logged Out, 440 = Bad Session (Out of Sync)
          const isTerminalState =
            statusCode === DisconnectReason.loggedOut ||
            statusCode === 401 ||
            statusCode === 440;

          console.warn(
            `[WHATSAPP] 🔌 Connection closed due to ${lastDisconnect?.error?.message || statusCode}. Terminal State: ${isTerminalState}`,
          );

          if (isTerminalState) {
            console.error(
              "[WHATSAPP] ❌ Session logged out or corrupted. Clearing data.",
            );
            await this.initialize(true); // Force new session
            return;
          }

          if (statusCode === DisconnectReason.restartRequired) {
            console.log("[WHATSAPP] 🔄 WhatsApp requested immediate restart.");
            return this.initialize(); // Instant reconnect without exponential backoff
          }

          this.handleCriticalError(lastDisconnect.error);
        } else if (connection === "open") {
          console.log("[WHATSAPP] ⚡ Ready");
          if (this.initializationTimeout)
            clearTimeout(this.initializationTimeout);
          this.status = "ready";
          this.retryCount = 0;
          this.isProcessing = false;
          this.notifyUI();

          // Trigger queue processing when connection is established
          this.processQueue();
        }
      });
    } catch (err) {
      console.error("[WHATSAPP] Fatal Init Error:", err);
      this.isProcessing = false;
      await this.handleCriticalError(err);
    }
  }

  async handleCriticalError(error) {
    if (this.healingTimeout) {
      clearTimeout(this.healingTimeout);
    }

    console.error(
      `[WHATSAPP] 🚑 Critical Error Handling. Attempt ${this.retryCount + 1}/${
        this.MAX_RETRIES
      }`,
    );

    if (this.status === "ready" || this.status === "initializing") {
      this.status = "reconnecting";
      this.notifyUI();
    }

    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      const delay = Math.pow(2, this.retryCount) * 1000;
      console.log(`[WHATSAPP] ⏱️ Auto-healing in ${delay}ms...`);

      this.healingTimeout = setTimeout(() => {
        this.initialize();
      }, delay);
    } else {
      console.error(
        "[WHATSAPP] 💀 Max retries reached. Manual intervention required.",
      );
      this.status = "error";
      this.notifyUI();
    }
  }

  async processQueue() {
    if (this.isProcessingQueue || this.status !== "ready" || !this.sock) {
      return;
    }

    this.isProcessingQueue = true;

    while (
      this.messageQueue.length > 0 &&
      this.status === "ready" &&
      this.sock
    ) {
      const item = this.messageQueue[0]; // Peek at front item

      // Format JID
      let cleanPhone = item.number.replace(/[^0-9]/g, "");
      if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
      const jid = `${cleanPhone}@s.whatsapp.net`;

      try {
        let response;
        if (item.media) {
          const buffer = Buffer.from(item.media.data, "base64");
          if (item.media.mimetype === "application/pdf") {
            response = await this.sock.sendMessage(jid, {
              document: buffer,
              mimetype: item.media.mimetype,
              fileName: item.media.filename || "document.pdf",
              caption: item.message,
            });
          } else {
            response = await this.sock.sendMessage(jid, {
              image: buffer,
              caption: item.message,
            });
          }
        } else {
          response = await this.sock.sendMessage(jid, { text: item.message });
        }

        // Successfully sent, remove from queue and resolve
        this.messageQueue.shift();
        item.resolve({ success: true, response });
        this.notifyUI();

        // Delay slightly between messages to prevent rate-limiting bans
        // Increased from 500ms to 1500ms to give media payloads time to clear
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error("[WHATSAPP] Send Error processing queue:", err);

        const errMsg = (err.message || "").toLowerCase();
        // Broader check for network/disconnect errors
        const isNetworkError =
          errMsg.includes("closed") ||
          errMsg.includes("timeout") ||
          errMsg.includes("disconnect") ||
          errMsg.includes("stream");

        if (isNetworkError || this.status !== "ready") {
          // Break loop, keep item in queue, trigger auto-heal
          this.isProcessingQueue = false;
          await this.handleCriticalError(err);
          return;
        }

        // Invalid number or hard send error - reject and drop from queue
        this.messageQueue.shift();
        item.reject(err);
        this.notifyUI();
      }
    }

    this.isProcessingQueue = false;
  }

  async sendMessage(number, message, media = null) {
    return new Promise((resolve, reject) => {
      // 1. Guard against memory leaks
      if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
        return reject(
          new Error("WhatsApp message queue is full. Please try again later."),
        );
      }

      // 2. Enqueue item
      this.messageQueue.push({
        number,
        message,
        media,
        timestamp: Date.now(),
        resolve,
        reject,
      });

      console.log(
        `[WHATSAPP] 📥 Message queued. Queue size: ${this.messageQueue.length}`,
      );
      this.notifyUI();

      // 3. Trigger mechanisms
      if (this.status === "disconnected") {
        this.initialize();
      } else if (this.status === "ready") {
        this.processQueue();
      }
    });
  }

  getStatus() {
    return {
      status: this.status,
      qr: this.qrCodeDataUrl,
      queueSize: this.messageQueue.length,
    };
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
  sendWhatsAppPdf: (num, base64, fileName, caption) => {
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
