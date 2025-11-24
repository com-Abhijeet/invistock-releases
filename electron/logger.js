const log = require("electron-log");

// ... your existing configurations ...
log.transports.file.level = "info";

// ✅ ADD THIS LINE
// This will automatically catch all console.log, .error, .warn, etc.
// and route them through electron-log.
log.overrideConsole;

log.catchErrors;
module.exports = log;
