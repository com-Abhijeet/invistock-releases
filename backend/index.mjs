import express from "express";
import cors from "cors";
import { Bonjour } from "bonjour-service";
import fs from "fs";
import path from "path";

// --- Your Route Imports ---
import productRoutes from "./routes/productRoutes.mjs";
import shopRoutes from "./routes/shopRoutes.mjs";
import categoryRoutes from "./routes/categoryRoutes.mjs";
import storageRoutes from "./routes/storageRoutes.mjs";
import supplierRoutes from "./routes/supplierRoutes.mjs";
import customerRoutes from "./routes/customerRoutes.mjs";
import salesRoutes from "./routes/salesRoutes.mjs";
import { auditLog } from "./middlewares/auditLog.mjs";
import purchaseRoutes from "./routes/purchaseRoutes.mjs";
import purchaseStatsRoutes from "./routes/purchaseStatsRoutes.mjs";
import inventoryDashboardRoutes from "./routes/inventoryDashboardRoutes.mjs";
import referenceRoutes from "./routes/referenceRoutes.mjs";
import transactionsRoutes from "./routes/transactionRoutes.mjs";
import gstrRoutes from "./routes/gstRoutes.mjs";
import licenseRouter from "./routes/licenseRoutes.mjs";
import nonGstSalesRoutes from "./routes/nonGstSalesRoutes.mjs";
import mobileHtmlRoutes from "./routes/mobileHtmlRoutes.mjs";
import dashboardRoutes from "./routes/dashboardRoutes.mjs";
import expenseRoutes from "./routes/expenseRoutes.mjs";
import stockAdjustmentRouter from "./routes/stockAdjustmentRoutes.mjs";
import analyticsRouter from "./routes/analyticsRoutes.mjs";
import reportRoutes from "./routes/reportRoutes.mjs";
import userRoutes from "./routes/userRoutes.mjs";
import searchRoutes from "./routes/searchRoutes.mjs";
import batchRoutes from "./routes/batchRoutes.mjs";
import salesOrderRoutes from "./routes/salesOrderRoutes.mjs";

// ✅ NEW: Import the Sync Routes for Mobile
import syncRoutes from "./routes/syncRoutes.mjs";

import { initializeDatabase, closeDatabase } from "./db/db.mjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const config = require("../electron/config.js");

const { backendLogger } = require("../electron/logger.js");

// ---------------------------------------------------------------------------
// ✅ GLOBAL LOGGER OVERRIDE
// This ensures console.log/error in ALL controllers/services go to backend.log
// ---------------------------------------------------------------------------
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

console.log = (...args) => {
  backendLogger.info(...args); // Write to file
  originalConsole.log(...args); // Keep writing to terminal
};

console.error = (...args) => {
  backendLogger.error(...args);
  originalConsole.error(...args);
};

console.warn = (...args) => {
  backendLogger.warn(...args);
  originalConsole.warn(...args);
};

console.info = (...args) => {
  backendLogger.info(...args);
  originalConsole.info(...args);
};
// ---------------------------------------------------------------------------

let bonjourInstance;
let serverInstance;

// ✅ UPDATED: Accepts userDataPath for image serving
export function startServer(dbPath, userDataPath) {
  const app = express();
  const PORT = 5000; // Keeping 5000 as per your file (Mobile QR should use this port)

  initializeDatabase(dbPath);

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(express.json({ limit: "50mb" })); // Increased limit for large syncs
  app.use(auditLog);

  // --- Routes ---
  app.use("/api/shop", shopRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/storage", storageRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/suppliers", supplierRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/sales", salesRoutes);
  app.use("/api/purchases", purchaseRoutes);
  app.use("/api/purchases/stats", purchaseStatsRoutes);
  app.use("/api/inventory-dashboard", inventoryDashboardRoutes);
  app.use("/api/transactions", transactionsRoutes);
  app.use("/api/reference", referenceRoutes);
  app.use("/api/gst", gstrRoutes);
  app.use("/api/sales-non-gst", nonGstSalesRoutes);
  app.use("/api/license", licenseRouter);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api/inventory", stockAdjustmentRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/reports", reportRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/batches", batchRoutes);
  app.use("/api/sales-orders", salesOrderRoutes);

  // ✅ Register Sync Routes
  app.use("/api/sync", syncRoutes);

  // Mobile HTML (Optional now, but kept if you still need the web view)
  app.use("/mobile", mobileHtmlRoutes);

  // ✅ SERVE IMAGES STATICALLY (For Mobile)
  if (userDataPath) {
    const imagesPath = path.join(userDataPath, "images");
    // This exposes: http://IP:5000/images/products/filename.jpg
    app.use("/images", express.static(imagesPath));
    // Now this log will appear in backend.log due to the override,
    // but we can still use backendLogger explicitly if we want.
    backendLogger.info(`[BACKEND] Serving images from: ${imagesPath}`);
  } else {
    backendLogger.warn(
      "[BACKEND] No userDataPath provided. Images will not be served.",
    );
  }

  // 1. Connection Check (Health Ping for Mobile)
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      server_name: "Kosh Mothership",
      version: "1.0.0",
    });
  });

  // 2. Login Endpoint (Verify against your 'users' table)
  const db = require("./db/db.mjs").default;
  const bcrypt = require("bcrypt");

  app.post("/api/login", (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get(username);

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({
        id: user.id,
        name: user.name,
        role: user.role,
        token: "mobile-session-token",
      });
    } catch (e) {
      console.error("Login Error", e);
      res.status(500).json({ error: "Server error during login" });
    }
  });

  // ✅ START HTTP SERVER (Simplified)
  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    backendLogger.info(`[BACKEND] Server running at http://0.0.0.0:${PORT}`);

    // Announce on LAN (HTTP)
    try {
      bonjourInstance = new Bonjour();
      bonjourInstance.publish({
        name: "KOSH-Main-Server",
        type: "http", // ✅ HTTP now
        port: PORT,
        txt: { version: "1.0.0" },
      });
      backendLogger.info(
        "[BONJOUR] KOSH Server is now discoverable on the local network.",
      );
    } catch (error) {
      backendLogger.error("[BONJOUR] Failed to announce service:", error);
    }
  });
}

export function shutdownBackend() {
  backendLogger.info("[BACKEND] Shutting down services...");
  closeDatabase();

  if (serverInstance) {
    serverInstance.close(() => {
      backendLogger.info("[BACKEND] Server has been shut down.");
    });
  }

  if (bonjourInstance) {
    bonjourInstance.destroy();
    backendLogger.info("[BONJOUR] Service announcement stopped.");
  }
}
