const log = require("electron-log");
const path = require("path");
const { app } = require("electron");

/**
 * Configure a logger instance with specific file path and rotation settings.
 * @param {string} logId - Unique ID for the logger
 * @param {string} fileName - The filename for the log
 */
function createLogger(logId, fileName) {
  const logger = log.create(logId);

  // Set file path
  logger.transports.file.resolvePath = () =>
    path.join(app.getPath("userData"), "logs", fileName);

  // LOG ROTATION / CLEANUP
  // Max size: 5MB. When exceeded, moves to .old.log.
  // This prevents logs from becoming GBs in size.
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

// Catch global errors and log them to main
log.catchErrors({
  showDialog: false,
  onError: (error) => mainLogger.error("Uncaught Exception:", error),
});

module.exports = {
  mainLogger,
  backendLogger,
  rendererLogger,
};
