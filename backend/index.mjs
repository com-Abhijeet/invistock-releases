import express from "express";
import cors from "cors";
import { Bonjour } from "bonjour-service"; // ✅ Import Bonjour
import https from "https"; // ✅ Import HTTPS
import selfsigned from "selfsigned"; // ✅ Import selfsigned for auto SSL
import fs from "fs"; // ✅ Import fs
import path from "path"; // ✅ Import path

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

import { initializeDatabase, closeDatabase } from "./db/db.mjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const config = require("../electron/config.js");

// ✅ We'll store the bonjour instance here to manage it
let bonjourInstance;
let serverInstance; // To properly close the server

export function startServer(dbPath) {
  const app = express();
  const PORT = 5000;

  initializeDatabase(dbPath);

  // ✅ Allow cross-origin requests
  app.use(
    cors({
      origin: "*", // You can restrict to a specific domain like "http://localhost:3000"
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());
  app.use(auditLog);

  // ... (All your app.use("/api/...", routes) are unchanged)
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
  // ✅ 1. Serve the Mobile HTML Page
  app.use("/mobile", mobileHtmlRoutes);

  // ✅ 2. Serve Images Statically for Mobile Devices
  app.get(/^\/images\/(.*)/, (req, res) => {
    const relativePath = req.params[0]; // Captures the part inside (.*)
    const imagesDir = config.paths?.images;

    if (!imagesDir || !relativePath) {
      console.error("[IMAGE ERROR] Invalid path or filename.");
      return res.status(400).send("Invalid Request");
    }

    // Decode URI component to handle spaces/special chars in filenames
    const decodedPath = decodeURIComponent(relativePath);
    const imagePath = path.join(imagesDir, decodedPath);

    // console.log(`[IMAGE REQUEST] Looking for: ${imagePath}`);

    if (fs.existsSync(imagePath)) {
      res.sendFile(imagePath);
    } else {
      console.error(`[IMAGE ERROR] File not found: ${imagePath}`);
      res.status(404).send("Image not found");
    }
  });

  // ✅ GENERATE SELF-SIGNED CERTIFICATE
  const attrs = [{ name: "commonName", value: "InviStock" }];
  const pems = selfsigned.generate(attrs, { days: 365 });

  // ✅ START HTTPS SERVER
  serverInstance = https
    .createServer({ key: pems.private, cert: pems.cert }, app)
    .listen(PORT, "0.0.0.0", () => {
      console.log(
        `[BACKEND] Secure Server running at https://localhost:${PORT}`
      );

      // ✅ Announce the server on the local network
      try {
        bonjourInstance = new Bonjour();
        bonjourInstance.publish({
          name: "InviStock-Main-Server", // Unique name for your service
          type: "https", // ✅ Change type to https
          port: PORT,
          txt: { version: "1.0.0" }, // You can add extra info here
        });
        console.log(
          "[BONJOUR] InviStock Server is now discoverable on the local network."
        );
      } catch (error) {
        console.error("[BONJOUR] Failed to announce service:", error);
      }
    });
}

/**
 * Gracefully shuts down the backend services.
 */
export function shutdownBackend() {
  console.log("[BACKEND] Shutting down services...");
  closeDatabase();

  // ✅ Stop the server
  if (serverInstance) {
    serverInstance.close(() => {
      console.log("[BACKEND] Server has been shut down.");
    });
  }

  // ✅ Stop the network announcement
  if (bonjourInstance) {
    bonjourInstance.destroy();
    console.log("[BONJOUR] Service announcement stopped.");
  }
}
