const log = require("electron-log");
const path = require("path");
const { app } = require("electron");

// file level
log.transports.file.level = "info";

// put logs under %APPDATA%/<your app>/logs/main.log
log.transports.file.resolvePath = () =>
  path.join(app.getPath("userData"), "logs", "main.log");

// catch uncaught exceptions / unhandled rejections
log.catchErrors({ showDialog: false });

// manual override of console.* to ensure output goes to electron-log
["log", "info", "warn", "error", "debug"].forEach((method) => {
  const original = console[method] ? console[method].bind(console) : () => {};
  console[method] = (...args) => {
    // map console.log -> info
    const level = method === "log" ? "info" : method;
    if (typeof log[level] === "function") {
      log[level](...args);
    } else {
      log.info(...args);
    }
    original(...args);
  };
});

module.exports = log;
