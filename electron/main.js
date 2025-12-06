/**
 * ===================================================================
 * Main Electron Process (main.js)
 * ...
 * ===================================================================
 */

// 1. MODULE IMPORTS
// ===============================================================
const { app, BrowserWindow, ipcMain, dialog, protocol } = require("electron");
const os = require("os");
const path = require("path");
const fs = require("fs"); // Use synchronous fs for startup checks
const log = require("electron-log");
const xlsx = require("xlsx");
const { Bonjour } = require("bonjour-service");
const http = require("http");
const {
  getAuthUrl,
  handleAuthCallback,
  uploadBackup,
  isConnected,
} = require("./googleDriveService.js");

// --- Custom Application Modules ---
const { initializeLicenseHandlers } = require("./ipc/licenseHandlers.js");
const { getShop } = require("../backend/repositories/shopRepository.mjs");
const { createPrintWindow } = require("./printWindow.js");
const { printInvoice } = require("./invoicePrinter.js");
const { generateExcelReport } = require("./generateExcelReport.js");
const { createInvoiceHTML } = require("./invoiceTemplate.js");
const { copyProductImage, copyLogoImage } = require("./handleImageCopy.js");
const { createShippingLabelHTML } = require("./shippingLabelTemplate.js");
const { printShippingLabel } = require("./shippingLabelPrinter.js");
const { checkAppLicense } = require("../backend/services/licenseService.mjs");
const { createNonGstReceiptHTML } = require("./nonGstReceiptTemplate.js");
const { printNonGstReceipt } = require("./nonGstPrinter.js");
const { printBulkLabels } = require("./bulkLabelPrinter.js");
const {
  getCustomerLedger,
} = require("../backend/repositories/customerRepository.mjs");
const { createCustomerLedgerHTML } = require("./customerLedgerTemplate.js");
const {
  getNonGstSalesForPDFExport,
  getNonGstSaleItemsForExport,
} = require("../backend/repositories/nonGstSalesRepository.mjs");

const {
  initializeWhatsApp,
  sendWhatsAppMessage,
  getWhatsAppStatus,
  sendWhatsAppPdf,
} = require("./whatsappService");
const { initializeUpdater } = require("./updater.js");

const config = require("./config.js");
app.disableHardwareAcceleration();

const dbPath = config.paths.database;
let lastKnownServerUrl = null;
let lastKnownAppMode = config.isClientMode ? "client" : "server";

// --- Backend Modules (ESM) ---
const { startServer, shutdownBackend } = require("../backend/index.mjs");
const {
  getExportableSalesData,
  getSalesForPDFExport,
} = require("../backend/repositories/salesRepository.mjs");
const {
  getAllCategories,
} = require("../backend/repositories/categoryRepository.mjs");
const { machineIdSync } = require("node-machine-id");

// 3. GLOBAL CONFIGURATION & VARIABLES
// ===============================================================
Object.assign(console, log.functions); // Override console
console.log("--- Application Starting ---");
const isDev = !app.isPackaged;
let mainWindow; // Store the main window instance

function createLicenseWindow() {
  const licenseWin = new BrowserWindow({
    minWidth: 1100,
    minHeight: 700,
    width: 1280,
    height: 800,
    resizable: true,
    autoHideMenuBar: true,
    title: "Activate KOSH",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // ✅ ADD THIS LISTENER
  // This sends the mode to the AppInitializer
  licenseWin.webContents.on("did-finish-load", () => {
    // We are opening the license window, so we are always in "server" mode
    licenseWin.webContents.send("set-app-mode", "server");
  });

  // Load the /license route of your React app
  const licenseUrl = isDev
    ? "http://localhost:5173/#/license"
    : `file://${path.join(__dirname, "..", "dist", "index.html")}#/license`;
  licenseWin.loadURL(licenseUrl);
}

// 4. MAIN WINDOW CREATION
// ===============================================================
function createWindow() {
  mainWindow = new BrowserWindow({
    title: "KOSH - Inventory Management",
    icon: path.join(__dirname, "..", "assets", "icon.ico"),
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.on("did-finish-load", () => {
    const appMode = config.isClientMode ? "client" : "server";
    console.log("[ELECTRON] Sending app mode:", appMode);
    mainWindow.webContents.send("set-app-mode", appMode);

    // 🔁 Re-send a few times to ensure renderer catches it
    const repeat = [500, 1500, 3000]; // ms
    repeat.forEach((delay) => {
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          console.log(`[ELECTRON] Resending set-app-mode (${delay}ms)`);
          mainWindow.webContents.send("set-app-mode", appMode);
        }
      }, delay);
    });
  });

  initializeWhatsApp(mainWindow);
  // Load the appropriate URL
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    // Only run updater in production to avoid errors in dev
    initializeUpdater(mainWindow);
    if (!isDev) {
      initializeUpdater(mainWindow);
    }
  });
}

// 5. APPLICATION LIFECYCLE HOOKS
// ===============================================================
app.whenReady().then(() => {
  console.log("🟢 App is ready. User data path:", app.getPath("userData"));

  app.on(
    "certificate-error",
    (event, webContents, url, error, certificate, callback) => {
      // Allow self-signed certificates for your local server
      if (url.startsWith("https://localhost:5000") || url.includes(":5000")) {
        // Verification logic
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  protocol.registerFileProtocol("app-image", (request, callback) => {
    const url = request.url.substr("app-image://".length);
    const imagePath = path.join(config.paths.images, url); // Use config path
    callback({ path: imagePath });
  });

  // --- Client vs. Server Mode Logic ---
  if (config.isClientMode) {
    // --- CLIENT APP ---
    console.log("[CLIENT MODE] Starting. Looking for KOSH Server...");
    initializeLicenseHandlers(); // Initialize handlers even in client mode
    createWindow(); // Just create the window. The 'did-finish-load' will handle the rest.

    const bonjour = new Bonjour();
    const browser = bonjour.find({ type: "https" }, (service) => {
      if (service.name === "KOSH-Main-Server") {
        const serverUrl = `https://${service.host}:${service.port}`;
        lastKnownServerUrl = serverUrl; // ✅ store globally
        console.log(`[CLIENT MODE] Found server at ${serverUrl}`);

        // ✅ Send multiple times to ensure React renderer catches it
        [0, 500, 1500, 3000].forEach((delay) =>
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              console.log(
                `[ELECTRON] Sending server URL (${delay}ms): ${serverUrl}`
              );
              mainWindow.webContents.send("set-server-url", serverUrl);
            }
          }, delay)
        );

        // Stop discovery once we found the server
        browser.stop();
      }
    });
  } else {
    // --- SERVER (MAIN ADMIN) APP ---
    let serverStarted = false;
    // 1. Safe Server Start Logic
    try {
      console.log("[SERVER MODE] Checking database...");

      // ✅ FIX: Check if DB exists. If not, don't crash—just skip to license window.

      console.log("[SERVER MODE] Database found. Starting backend.");
      startServer(config.paths.database);
      serverStarted = true;
    } catch (error) {
      // ✅ FIX: Log error but DO NOT show blocking dialog.
      // We want to fall through to createLicenseWindow()
      console.error(
        "[CRITICAL] Backend failed to start (ignoring for fresh install):",
        error
      );
    }

    // 2. Initialize Handlers FIRST (Critical for License Window IPC)
    initializeLicenseHandlers();

    // 3. Check License
    let licenseStatus = { status: "invalid" };
    try {
      licenseStatus = checkAppLicense();
    } catch (e) {
      console.warn(
        "License check failed (expected on fresh install):",
        e.message
      );
    }

    // 4. Decide which window to open
    // Only open the Main Window if the Server started AND License is valid
    if (
      serverStarted &&
      (licenseStatus.status === "valid" ||
        licenseStatus.status === "grace_period")
    ) {
      createWindow(); // Open main app
    } else {
      console.log(
        "[APP] Opening License Window (Fresh Install or Invalid License)"
      );
      createLicenseWindow(); // Open activation screen
    }
  }

  // Handle macOS dock icon click
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (config.isClientMode) {
        createWindow();
      } else {
        // Re-run the safe check on activate
        const licenseStatus = checkAppLicense();
        if (
          licenseStatus.status === "valid" ||
          licenseStatus.status === "grace_period"
        ) {
          createWindow();
        } else {
          createLicenseWindow();
        }
      }
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (!config.isClientMode) {
      try {
        shutdownBackend();
      } catch (error) {
        console.log("[ELECTRON] : ERROR IN SHUTTING DOWN");
      }
    }
    console.log("--- Application Closing ---");
    app.quit();
  }
});

// Flag to prevent infinite loops
let isQuitting = false;

app.on("before-quit", async (event) => {
  // 1. If we have already finished our work, allow the quit to happen
  if (isQuitting) {
    return;
  }

  // 2. Prevent the app from quitting immediately
  event.preventDefault();

  // 3. Set the flag so the NEXT app.quit() call succeeds
  isQuitting = true;

  if (!config.isClientMode) {
    console.log("--- Application Shutting Down ---");

    try {
      // Dynamically load services to ensure they are ready
      const { isConnected, uploadBackup } = require("./googleDriveService.js");
      const { shutdownBackend } = await import("../backend/index.mjs");

      // ✅ Check connection and WAIT for upload
      if (isConnected()) {
        const date = new Date().toISOString().split("T")[0];
        const backupFileName = `KOSH-Backup-${date}.db`;

        console.log("[GDRIVE] Uploading backup...");
        await uploadBackup(config.paths.database, backupFileName);
        console.log("[GDRIVE] Upload complete.");
      }

      // Shutdown the Express server
      shutdownBackend();
    } catch (error) {
      console.error("[SHUTDOWN] Error during backup:", error);
    } finally {
      // 4. Force Quit (This triggers before-quit again, but isQuitting is true)
      app.quit();
    }
  } else {
    app.quit();
  }
});

// 6. IPC HANDLERS (Inter-Process Communication)
// ===============================================================

ipcMain.handle("get-app-mode", () => {
  return lastKnownAppMode;
});

ipcMain.handle("get-machine-id", () => {
  return machineIdSync();
});

ipcMain.handle("get-server-url", () => {
  return lastKnownServerUrl;
});

ipcMain.handle("get-local-ip", () => {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 1. Basic checks: must be IPv4 and not localhost
      if (iface.family === "IPv4" && !iface.internal) {
        // 2. BLACKLIST: Explicitly ignore VirtualBox / VMWare Host-Only ranges
        // 192.168.56.x is the standard VirtualBox internal IP
        if (
          iface.address.startsWith("192.168.56.") ||
          iface.address.startsWith("169.254.")
        ) {
          continue;
        }

        // 3. SCORING: Calculate a priority score based on the adapter name
        let priority = 0;
        const lowerName = name.toLowerCase();

        // High Priority: Actual Wi-Fi connections
        if (
          lowerName.includes("wi-fi") ||
          lowerName.includes("wireless") ||
          lowerName.includes("wlan")
        ) {
          priority = 10;
        }
        // Medium Priority: Ethernet connections
        else if (
          lowerName.includes("ethernet") ||
          lowerName.includes("en") ||
          lowerName.includes("eth")
        ) {
          priority = 5;
        }

        // Negative Priority: Explicit virtual adapters that might have slipped through
        if (
          lowerName.includes("virtual") ||
          lowerName.includes("v-ethernet") ||
          lowerName.includes("wsl")
        ) {
          priority = -1;
        }

        candidates.push({ name, address: iface.address, priority });
      }
    }
  }

  // 4. Pick the Winner: Sort by priority (highest first)
  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length > 0) {
    const winner = candidates[0];
    console.log(`[NETWORK] Selected IP: ${winner.address} (${winner.name})`);
    return winner.address;
  }

  return "localhost";
});

ipcMain.handle("gdrive-status", () => isConnected());

ipcMain.handle("gdrive-login", async () => {
  return new Promise((resolve) => {
    const authUrl = getAuthUrl();
    require("electron").shell.openExternal(authUrl); // Opens Browser

    // Create the temporary server
    const server = http.createServer(async (req, res) => {
      console.log(`[GDRIVE] Request received: ${req.url}`); // Debug Log

      if (req.url.startsWith("/callback")) {
        const urlParams = new URL(req.url, "http://127.0.0.1:5001");
        const code = urlParams.searchParams.get("code");

        if (code) {
          try {
            await handleAuthCallback(code);
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              "<h1>Success!</h1><p>KOSH is connected. You can close this tab.</p>"
            );

            if (mainWindow) mainWindow.webContents.send("gdrive-connected");
            console.log("[GDRIVE] Login successful, token saved.");
          } catch (err) {
            res.writeHead(500);
            res.end("Authentication failed.");
            console.error("[GDRIVE] Auth failed:", err);
          }
        }
        server.close();
      }
    });

    // Handle server errors (like port in use)
    server.on("error", (e) => {
      console.error("[GDRIVE] Server Error:", e);
    });

    // ✅ Explicitly listen on 127.0.0.1 and port 5001
    server.listen(5001, "127.0.0.1", () => {
      console.log(
        "[GDRIVE] Local auth server running at http://127.0.0.1:5001"
      );
      // Only resolve the IPC call once the server is ready
      resolve({ success: true });
    });

    // Safety timeout: close server after 5 mins
    setTimeout(() => {
      if (server.listening) {
        console.log("[GDRIVE] Auth timeout, closing server.");
        server.close();
      }
    }, 300000);
  });
});

ipcMain.handle("print-bulk-labels", async (event, items) => {
  try {
    const shop = await getShop();
    if (!shop) throw new Error("Shop settings not found");

    await printBulkLabels(items, shop, shop.label_printer_width_mm);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on("print-label", async (event, payload) => {
  try {
    console.log("🖨️ Printing label for product:", payload.product.name);
    await createPrintWindow(payload); // Pass the whole payload
  } catch (err) {
    console.error("❌ Label printing failed:", err);
  }
});

ipcMain.on("print-invoice", async (event, payload) => {
  try {
    console.log("🖨️ Printing invoice for sale:", payload.sale.reference_no);
    await printInvoice(payload);
  } catch (err) {
    console.error("❌ Invoice printing failed:", err);
  }
});

// 🧾 Export Excel Handler
ipcMain.handle("generate-excel-report", async (_event, args) => {
  const { data, fileName, columnMap } = args;
  const result = await generateExcelReport(data, fileName, columnMap);
  return result;
});

// 📁 Logo picker handler
ipcMain.handle("select-logo", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select Shop Logo",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
    ],
  });

  if (canceled || filePaths.length === 0) {
    return { success: false };
  }
  // ✅ Correctly copies the file and returns a safe, permanent filename
  const newFileName = await copyLogoImage(filePaths[0]);
  return { success: true, fileName: newFileName }; // Return the selected file path
});

ipcMain.handle("copy-product-image", async (event, originalPath) => {
  try {
    const newFileName = await copyProductImage(originalPath);
    return { success: true, fileName: newFileName };
  } catch (error) {
    console.error("Failed to copy product image:", error);
    return { success: false, error: error.message || "Failed to copy image." };
  }
});

ipcMain.handle("dialog:open-image", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select Product Image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

// 1. BACKUP HANDLER
ipcMain.handle("backup-database", async () => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save Database Backup",
      defaultPath: `backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: "Database Files", extensions: ["db"] }],
    });

    if (canceled || !filePath) {
      return { success: false, message: "Backup cancelled by user." };
    }

    // Copy the current database to the user's chosen location
    // ✅ THE FIX: Use fs.promises.copyFile
    await fs.promises.copyFile(dbPath, filePath);

    return {
      success: true,
      message: `Backup saved successfully to ${filePath}`,
    };
  } catch (error) {
    console.error("Backup failed:", error);
    // Send a more specific error message back to the frontend
    return { success: false, message: `Backup failed: ${error.message}` };
  }
});

// 2. RESTORE HANDLER
ipcMain.handle("restore-database", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select Database to Restore",
      properties: ["openFile"],
      filters: [{ name: "Database Files", extensions: ["db"] }],
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: "Restore cancelled by user." };
    }

    const backupPath = filePaths[0];

    // Overwrite the current database with the user's selected backup
    await fs.copyFile(backupPath, dbPath);

    // Relaunch the app to load the new database
    app.relaunch();
    app.exit();

    return { success: true }; // This won't be received due to relaunch, but is good practice
  } catch (error) {
    console.error("Restore failed:", error);
    return { success: false, message: "Restore failed." };
  }
});

ipcMain.handle("get-printers", async () => {
  try {
    const printers =
      await BrowserWindow.getAllWindows()[0].webContents.getPrintersAsync();
    return printers;
  } catch (error) {
    console.error("Failed to get printers:", error);
    return [];
  }
});

ipcMain.handle("dialog:open-file", async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(options);
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

// This handler reads the file and returns headers and a preview
ipcMain.handle("read-excel-file", async (event, filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read headers as raw strings.
    const headers =
      xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true, // ✅ Read headers as raw text
      })[0] || [];

    // Read the data preview with raw values.
    const dataPreview = xlsx.utils.sheet_to_json(worksheet, {
      range: 5,
      raw: true, // ✅ Read all cell data as raw text
    });

    return { success: true, headers, dataPreview };
  } catch (error) {
    console.error("Failed to read Excel file:", error);
    return { success: false, error: "Could not read the selected file." };
  }
});

ipcMain.handle(
  "export-sales-to-excel",
  async (event, { startDate, endDate }) => {
    try {
      // 1. Prompt user for a save location
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Save Sales Report",
        defaultPath: `Sales-Report-${startDate}-to-${endDate}.xlsx`,
        filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
      });

      if (canceled || !filePath)
        return { success: false, message: "Export cancelled." };

      // 2. Fetch all itemized sales data for the period
      const salesData = getExportableSalesData({ startDate, endDate });

      // 3. Generate the Excel file
      const result = await generateExcelReport(salesData, filePath, {
        // Define how your data columns map to Excel headers
        reference_no: "Invoice No",
        invoice_date: "Date",
        customer_name: "Customer",
        product_name: "Product",
        quantity: "Qty",
        rate: "Rate",
        price: "Total Price",
      });

      return result; // { success: true, path: '...' }
    } catch (error) {
      console.error("Excel export failed:", error);
      return { success: false, error: "Failed to export Excel file." };
    }
  }
);

ipcMain.handle(
  "export-sales-to-pdfs",
  async (event, { startDate, endDate, shop }) => {
    try {
      // 1. Prompt user to select a destination folder
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Select Folder to Save Invoices",
        properties: ["openDirectory"],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, message: "Export cancelled." };
      }
      const destFolder = filePaths[0];

      // 2. Fetch all sales with their items
      const sales = getSalesForPDFExport({ startDate, endDate });
      if (sales.length === 0) {
        return {
          success: true,
          message: "No sales found in the selected period.",
        };
      }

      // 3. Loop through each sale and generate a PDF
      for (const [index, sale] of sales.entries()) {
        // Send progress updates to the frontend
        event.sender.send("export-progress", {
          current: index + 1,
          total: sales.length,
          fileName: sale.reference_no,
        });

        const win = new BrowserWindow({ show: false });

        // The QR code and other dynamic data is now handled by the template function
        const htmlContent = createInvoiceHTML({ sale, shop });

        await win.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
        );

        const pdfBuffer = await win.webContents.printToPDF({
          printBackground: true,
        });

        const pdfPath = path.join(
          destFolder,
          `${sale.reference_no.replace(/\//g, "-")}.pdf`
        );
        await fs.promises.writeFile(pdfPath, pdfBuffer);

        win.close();
      }

      return {
        success: true,
        message: `${sales.length} invoices exported successfully.`,
      };
    } catch (error) {
      console.error("PDF export failed:", error);
      return { success: false, error: "Failed to export PDF files." };
    }
  }
);

ipcMain.handle("export-main-categories", async () => {
  try {
    const categoriesData = await getAllCategories();
    // We only need the parent category info for this report
    const mainCategories = categoriesData.map(({ id, name, code }) => ({
      id,
      name,
      code,
    }));

    const columnMap = {
      id: "Category Id",
      code: "Category Code",
      name: "Category Name",
    };

    const defaultFileName = `main_categories_${
      new Date().toISOString().split("T")[0]
    }`;

    return await generateExcelReport(
      mainCategories,
      defaultFileName,
      columnMap
    );
  } catch (error) {
    console.error("Failed to export main categories:", error);
    return { success: false, error: error.message };
  }
});

// ✅ HANDLER 2: Export a flattened list of ALL subcategories
// ✅ HANDLER 2: Export a flattened list of ALL subcategories
ipcMain.handle("export-all-subcategories", async () => {
  try {
    const categoriesData = await getAllCategories();

    // Flatten the nested data into a single list
    const flattenedSubcategories = [];
    for (const category of categoriesData) {
      for (const sub of category.subcategories) {
        flattenedSubcategories.push({
          // The missing ID is now included
          id: sub.id,
          subcategory_code: sub.code,
          subcategory_name: sub.name,
          parent_category_code: category.code,
          parent_category_name: category.name,
        });
      }
    }

    const columnMap = {
      id: "Subcategory Id",
      subcategory_code: "Subcategory Code",
      subcategory_name: "Subcategory Name",
      parent_category_code: "Parent Category Code",
      parent_category_name: "Parent Category Name",
    };

    const defaultFileName = `subcategories_${
      new Date().toISOString().split("T")[0]
    }`;

    return await generateExcelReport(
      flattenedSubcategories,
      defaultFileName,
      columnMap
    );
  } catch (error) {
    console.error("Failed to export subcategories:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.on("log", (event, { level, data }) => {
  if (log[level]) {
    // The '...data' spreads the array of arguments into the log function
    log[level](...data);
  } else {
    log.info(...data);
  }
});

ipcMain.handle("print-shipping-label", async (event, saleData) => {
  try {
    // 1. Fetch shop settings from the database
    const shop = await getShop();
    if (!shop) {
      throw new Error("Shop settings not found. Cannot print 'From' address.");
    }

    // 2. Generate the label HTML, passing in the printer width
    const html = await createShippingLabelHTML(
      shop,
      saleData,
      shop.invoice_printer_width_mm
    );

    // 3. Define print options, using the default printer from settings
    const printOptions = {
      silent: shop.silent_printing === 1,
      deviceName: shop.invoice_printer_name || undefined, // Use default if name is not set
    };

    // 4. Call the dedicated print function
    await printShippingLabel(html, printOptions);

    return { success: true };
  } catch (error) {
    console.error("Failed to print shipping label:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("print-non-gst-receipt", async (event, saleData) => {
  try {
    const shop = await getShop();
    if (!shop) {
      throw new Error("Shop settings not found.");
    }

    // Use the main invoice printer width and name for this receipt
    const printerWidth = shop.invoice_printer_width_mm || 80;
    const printerName = shop.invoice_printer_name || undefined;

    const html = await createNonGstReceiptHTML(shop, saleData, printerWidth);

    const printOptions = {
      silent: shop.silent_printing === 1,
      deviceName: printerName,
    };

    await printNonGstReceipt(html, printOptions);
    return { success: true };
  } catch (error) {
    console.error("Failed to print non-GST receipt:", error);
    throw new Error(
      error.message || "An unknown error occurred during printing."
    );
  }
});

ipcMain.handle(
  "print-customer-ledger",
  async (event, { customerId, filters }) => {
    try {
      // 1. Get all the data
      const shop = await getShop();
      const { customer, ledger } = getCustomerLedger(customerId, filters);

      // 2. Generate the HTML
      const htmlContent = createCustomerLedgerHTML(shop, customer, ledger);

      // 3. Create a print window
      const win = new BrowserWindow({ show: true });
      await win.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
      );

      // 4. Print
      win.webContents.on("did-finish-load", () => {
        win.webContents.print({ silent: false }, (success, error) => {
          if (!success) console.error("Ledger print failed:", error);
          win.close();
        });
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to print customer ledger:", error);
      throw new Error(error.message || "An unknown error occurred.");
    }
  }
);

/**
 * ✅ 1. BATCH PDF EXPORT HANDLER (for Non-GST)
 */
ipcMain.handle(
  "export-non-gst-sales-to-pdfs",
  async (event, { startDate, endDate }) => {
    try {
      // 1. Prompt user to select a destination folder
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Select Folder to Save Receipts",
        properties: ["openDirectory"],
      });
      if (canceled || filePaths.length === 0) {
        return { success: false, message: "Export cancelled." };
      }
      const destFolder = filePaths[0];

      // 2. Fetch all required data from the database
      const shop = await getShop();
      const sales = getNonGstSalesForPDFExport({ startDate, endDate });
      if (sales.length === 0) {
        return { success: true, message: "No sales found in this period." };
      }

      // 3. Loop through each sale and generate a PDF
      for (const [index, sale] of sales.entries()) {
        event.sender.send("export-progress", {
          // Send progress to frontend
          current: index + 1,
          total: sales.length,
          fileName: sale.reference_no,
        });

        const win = new BrowserWindow({ show: false });

        // Use your existing non-GST template
        const htmlContent = await createNonGstReceiptHTML(
          shop,
          sale,
          shop.invoice_printer_width_mm
        );
        await win.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
        );

        const pdfBuffer = await win.webContents.printToPDF({
          printBackground: true,
        });
        const pdfPath = path.join(
          destFolder,
          `${sale.reference_no.replace(/\//g, "-")}.pdf`
        );
        await fs.promises.writeFile(pdfPath, pdfBuffer);

        win.close();
      }

      return { success: true, message: `${sales.length} receipts exported.` };
    } catch (error) {
      console.error("Non-GST PDF export failed:", error);
      return { success: false, error: "Failed to export PDF files." };
    }
  }
);

/**
 * ✅ 2. ITEMIZED EXCEL EXPORT HANDLER (for Non-GST)
 */
ipcMain.handle(
  "export-non-gst-items-to-excel",
  async (event, { startDate, endDate }) => {
    try {
      // 1. Fetch the flat list of all items
      const items = getNonGstSaleItemsForExport({ startDate, endDate });
      if (items.length === 0) {
        return { success: true, message: "No items found in this period." };
      }

      // 2. Define the columns for the Excel file
      const columnMap = {
        created_at: "Date",
        reference_no: "Reference No.",
        customer_name: "Customer",
        product_code: "Product Code",
        product_name: "Product Name",
        hsn: "HSN Code",
        quantity: "Quantity",
        rate: "Rate",
        discount: "Discount (%)",
        price: "Total Price",
      };

      const fileName = `Non-GST_Sales_Items_${startDate}_to_${endDate}`;

      // 3. Use your existing Excel utility to generate and save the file
      return await generateExcelReport(items, fileName, columnMap);
    } catch (error) {
      console.error("Non-GST Excel export failed:", error);
      return { success: false, error: "Failed to export to Excel." };
    }
  }
);
ipcMain.handle("whatsapp-get-status", () => {
  return getWhatsAppStatus();
});

// ✅ Send Message (called by your Invoice page)
ipcMain.handle("whatsapp-send-message", async (event, { phone, message }) => {
  try {
    // Strip special characters from phone, ensure country code (defaulting to 91 India)
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
  async (event, { sale, shop, customerPhone }) => {
    try {
      if (!shop) shop = getShop(); // Fetch shop if not passed

      // 1. Generate HTML (Reuse your existing logic)
      // We use A4 width (210mm) for PDFs usually, or you can use the receipt width
      const htmlContent = await createInvoiceHTML({ sale, shop });

      // 2. Create hidden window to render PDF
      const win = new BrowserWindow({ show: false, width: 800, height: 1200 });
      await win.loadURL(
        "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
      );

      // 3. Generate PDF Data
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4", // Or 'Letter', or { width: ..., height: ... }
      });

      // 4. Convert buffer to Base64
      const pdfBase64 = pdfData.toString("base64");

      // 5. Send via WhatsApp Service
      const fileName = `Invoice-${sale.reference_no}.pdf`;
      await sendWhatsAppPdf(
        customerPhone,
        pdfBase64,
        fileName,
        "Here is your PDF Invoice"
      );

      win.close();
      return { success: true };
    } catch (error) {
      console.error("Failed to send WhatsApp PDF:", error);
      return { success: false, error: error.message };
    }
  }
);
