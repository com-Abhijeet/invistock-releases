const fs = require("fs");
const { dialog } = require("electron");

function registerBackupHandlers(ipcMain, { dbPath, app }) {
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

      await fs.promises.copyFile(dbPath, filePath);

      return {
        success: true,
        message: `Backup saved successfully to ${filePath}`,
      };
    } catch (error) {
      console.error("Backup failed:", error);
      return { success: false, message: `Backup failed: ${error.message}` };
    }
  });

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

      await fs.copyFileSync(backupPath, dbPath);

      // Relaunch the app to load the new database
      app.relaunch();
      app.exit();

      return { success: true };
    } catch (error) {
      console.error("Restore failed:", error);
      return { success: false, message: "Restore failed." };
    }
  });
}

module.exports = { registerBackupHandlers };
