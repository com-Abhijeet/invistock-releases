const http = require("http");
const { shell } = require("electron");
const {
  getAuthUrl,
  handleAuthCallback,
  isConnected,
} = require("../googleDriveService.js");

function registerGDriveHandlers(ipcMain, { mainWindow } = {}) {
  ipcMain.handle("gdrive-status", () => isConnected());

  ipcMain.handle("gdrive-login", async () => {
    return new Promise((resolve) => {
      const authUrl = getAuthUrl();
      shell.openExternal(authUrl);

      const server = http.createServer(async (req, res) => {
        console.log(`[GDRIVE] Request received: ${req.url}`);

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

      server.on("error", (e) => {
        console.error("[GDRIVE] Server Error:", e);
      });

      server.listen(5001, "127.0.0.1", () => {
        console.log(
          "[GDRIVE] Local auth server running at http://127.0.0.1:5001"
        );
        resolve({ success: true });
      });

      setTimeout(() => {
        if (server.listening) {
          console.log("[GDRIVE] Auth timeout, closing server.");
          server.close();
        }
      }, 300000);
    });
  });
  // ✅ NEW: Get token expiry timestamp
  ipcMain.handle("get-gdrive-token-expiry", () => {
    return getTokenExpiry(); // Returns milliseconds or null
  });

  // ✅ NEW: Emit event when token is about to expire (optional)
  ipcMain.handle("check-gdrive-token-expiry", () => {
    const expiry = getTokenExpiry();
    if (expiry) {
      const now = Date.now();
      const daysUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24);

      if (daysUntilExpiry <= 0) {
        mainWindow?.webContents.send("gdrive-token-expired");
      } else if (daysUntilExpiry <= 7) {
        mainWindow?.webContents.send("gdrive-token-expiring", {
          daysUntilExpiry,
        });
      }
    }
  });
}

module.exports = { registerGDriveHandlers };
