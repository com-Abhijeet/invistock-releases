const fs = require("fs");
const path = require("path");
const { mainLogger } = require("./logger.js");

const MAX_BACKUPS = 30;

/**
 * Runs the automated local backup by querying the shop_setup table for configuration,
 * backing up the databases safely using better-sqlite3, and cleaning up old backups.
 */
async function runLocalAutoBackup() {
  try {
    mainLogger.info("[LOCAL AUTO-BACKUP] Starting local automated backup check...");
    
    // We dynamically require dbProxy so we get the connected instance.
    const dbModule = require("../backend/db/db.mjs");
    const dbProxy = dbModule.default;
    const nonGstDb = dbModule.nonGstDb;
    const { getTallyDb } = require("../backend/db/tallyDb.mjs");
    
    if (!dbProxy) {
       mainLogger.warn("[LOCAL AUTO-BACKUP] Main database not initialized, skipping.");
       return;
    }

    // Query the shop settings
    const shopConfig = dbProxy.prepare("SELECT enable_auto_backup, backup_path FROM shop LIMIT 1").get();
    
    if (!shopConfig || !shopConfig.enable_auto_backup || !shopConfig.backup_path) {
      mainLogger.info("[LOCAL AUTO-BACKUP] Auto-backup is disabled or path is missing. Skipping.");
      return;
    }

    const backupDir = path.resolve(shopConfig.backup_path);
    
    if (!fs.existsSync(backupDir)) {
      mainLogger.warn(`[LOCAL AUTO-BACKUP] Configured backup path does not exist: ${backupDir}. Skipping.`);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    let successCount = 0;

    // 1. Backup Main DB
    try {
      const mainDest = path.join(backupDir, `KOSH_main_${timestamp}.db`);
      await dbProxy.backup(mainDest);
      successCount++;
    } catch (err) {
      mainLogger.error(`[LOCAL AUTO-BACKUP] Failed to backup Main DB: ${err.message}`);
    }
    
    // 2. Backup NonGST DB
    if (nonGstDb) {
      try {
        const nonGstDest = path.join(backupDir, `KOSH_nongst_${timestamp}.db`);
        await nonGstDb.backup(nonGstDest);
        successCount++;
      } catch (err) {
        mainLogger.error(`[LOCAL AUTO-BACKUP] Failed to backup Non-GST DB: ${err.message}`);
      }
    }
    
    // 3. Backup Tally DB
    const tallyDb = getTallyDb();
    if (tallyDb) {
      try {
        const tallyDest = path.join(backupDir, `KOSH_tally_${timestamp}.db`);
        await tallyDb.backup(tallyDest);
        successCount++;
      } catch (err) {
        mainLogger.error(`[LOCAL AUTO-BACKUP] Failed to backup Tally DB: ${err.message}`);
      }
    }

    if (successCount > 0) {
      mainLogger.info(`[LOCAL AUTO-BACKUP] Successfully created ${successCount} backup files at ${timestamp}.`);
      cleanOldBackups(backupDir);
    }

  } catch (error) {
    mainLogger.error("[LOCAL AUTO-BACKUP] Unexpected error during automated backup:", error);
  }
}

/**
 * Ensures that only the last MAX_BACKUPS for each database type are kept in the directory.
 */
function cleanOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir);
    const backupTypes = ['KOSH_main_', 'KOSH_nongst_', 'KOSH_tally_'];
    
    backupTypes.forEach(prefix => {
      // Find all files matching the prefix
      const typeFiles = files
        .filter(f => f.startsWith(prefix) && f.endsWith(".db"))
        .map(f => {
          const filePath = path.join(backupDir, f);
          return {
            name: f,
            path: filePath,
            time: fs.statSync(filePath).mtime.getTime()
          };
        })
        .sort((a, b) => b.time - a.time); // Newest first (descending)

      if (typeFiles.length > MAX_BACKUPS) {
        const toDelete = typeFiles.slice(MAX_BACKUPS);
        toDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            mainLogger.info(`[LOCAL AUTO-BACKUP] Pruned old backup: ${file.name}`);
          } catch (err) {
            mainLogger.error(`[LOCAL AUTO-BACKUP] Failed to delete ${file.name}: ${err.message}`);
          }
        });
      }
    });
  } catch (err) {
    mainLogger.error("[LOCAL AUTO-BACKUP] Error cleaning old backups:", err);
  }
}

module.exports = {
  runLocalAutoBackup
};
