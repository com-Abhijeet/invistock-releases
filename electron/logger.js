const log = require("electron-log");
const path = require("path");
const electron = require("electron");
const app = electron?.app || electron;
const fs = require("fs");

function getUserDataPath() {
  if (app && typeof app.getPath === "function") {
    try {
      return app.getPath("userData");
    } catch (e) {}
  }
  return path.join(process.cwd(), "userData");
}

function createLogger(logId, fileName) {
  const logger = log.create(logId);

  // Set file path
  logger.transports.file.resolvePath = () =>
    path.join(getUserDataPath(), "logs", fileName);

  // LOG ROTATION / CLEANUP
  logger.transports.file.maxSize = 5 * 1024 * 1024;

  // Format: [Date] [Level] Message
  logger.transports.file.format =
    "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

  return logger;
}

// 1. Main Process Logger (Application Lifecycle)
const mainLogger = createLogger("main", "electron-main.log");

// 2. Backend Logger (Express / API)
const backendLogger = createLogger("backend", "backend.log");

// 3. Renderer Logger (Frontend / React)
const rendererLogger = createLogger("renderer", "renderer.log");

// 4. Session Logger (API routes without body, cleared on restart)
const sessionLogger = createLogger("session", "session.log");

// Clear session log on app startup
try {
  const sessionLogPath = sessionLogger.transports.file.resolvePath();
  if (fs.existsSync(sessionLogPath)) {
    fs.writeFileSync(sessionLogPath, "");
  }
} catch (e) {
  mainLogger.error("Failed to clear session log on startup:", e);
}

// Catch global errors and log them to main
log.catchErrors({
  showDialog: false,
  onError: (error) => mainLogger.error("Uncaught Exception:", error),
});

module.exports = {
  mainLogger,
  backendLogger,
  rendererLogger,
  sessionLogger,
};
