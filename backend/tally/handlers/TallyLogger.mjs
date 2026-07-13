import fs from "fs";
import path from "path";

export class TallyLogger {
  static log(entityType, entityId, payload, responseText, isSuccess, errorMessage) {
    try {
      const logDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
      
      const logFile = path.join(logDir, isSuccess ? "tally_success.log" : "tally_error.log");
      const timestamp = new Date().toISOString();
      const status = isSuccess ? "SUCCESS" : "FAILED";
      
      const logData = `\n\n========================================
TIMESTAMP: ${timestamp}
ENTITY: ${entityType} ID: ${entityId}
STATUS: ${status}
ERROR: ${errorMessage || "None"}

[RAW XML PAYLOAD]
${payload}

[TALLY RESPONSE]
${responseText}
========================================\n`;
      
      fs.appendFileSync(logFile, logData);
    } catch (logErr) {
      console.error("Failed to write to tally log", logErr);
    }
  }
}
