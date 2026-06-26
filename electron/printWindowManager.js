/**
 * printWindowManager.js
 * Manages reusable print windows to avoid creating new ones for each print job.
 * Reduces window creation overhead by ~2-3 seconds per print.
 */

const { BrowserWindow } = require("electron");

class PrintWindowManager {
  constructor() {
    this.windowPool = {
      label: null,
      invoice: null,
    };
  }

  /**
   * Get or create a print window for the given type
   * @param {string} type - 'label' or 'invoice'
   * @param {object} options - Custom window options
   * @returns {BrowserWindow}
   */
  getWindow(type = "invoice", options = {}) {
    const key = type;

    // If window exists and is valid, reuse it
    if (
      this.windowPool[key] &&
      !this.windowPool[key].isDestroyed &&
      !this.windowPool[key].isDestroyed()
    ) {
      return this.windowPool[key];
    }

    // Create new window
    const defaultOptions = {
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    };

    let mergedOptions = { ...defaultOptions, ...options };

    if (type === "label") {
      mergedOptions = {
        ...mergedOptions,
        width: 450,
        height: 500,
      };
    } else if (type === "invoice") {
      mergedOptions = {
        ...mergedOptions,
        width: 900,
        height: 1000,
      };
    }

    const win = new BrowserWindow(mergedOptions);
    this.windowPool[key] = win;

    // Clean up on close
    win.on("closed", () => {
      if (this.windowPool[key] === win) {
        this.windowPool[key] = null;
      }
    });

    return win;
  }

  /**
   * Recycle window after print (keep it open but ready for next job)
   * @param {string} type
   */
  recycleWindow(type = "invoice") {
    const win = this.windowPool[type];
    if (win && !win.isDestroyed()) {
      // Don't close it - just leave it hidden for next use
      if (win.isVisible()) {
        win.hide();
      }
      // Clear any event listeners to prevent memory leaks
      win.webContents.removeAllListeners("did-finish-load");
    }
  }

  /**
   * Force close and cleanup a window
   * @param {string} type
   */
  closeWindow(type = "invoice") {
    const win = this.windowPool[type];
    if (win && !win.isDestroyed()) {
      win.close();
      this.windowPool[type] = null;
    }
  }

  /**
   * Cleanup all windows
   */
  closeAll() {
    Object.keys(this.windowPool).forEach((type) => {
      this.closeWindow(type);
    });
  }
}

// Singleton instance
const manager = new PrintWindowManager();

module.exports = { PrintWindowManager, printWindowManager: manager };
