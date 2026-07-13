import express from "express";
import { getTallyDb } from "../db/tallyDb.mjs";
import { ComparisonEngine } from "./engine/ComparisonEngine.mjs";
import { TallySyncOrchestrator } from "./engine/TallySyncOrchestrator.mjs";
import { DependencyResolver } from "./engine/DependencyResolver.mjs";
import { syncEventEmitter } from "./tallySseRoutes.mjs";

const router = express.Router();

// GET Settings
router.get("/settings", (req, res) => {
  try {
    const tDb = getTallyDb();
    const settings = tDb
      .prepare("SELECT * FROM tally_settings WHERE id = 1")
      .get();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE Settings
router.post("/settings", (req, res) => {
  try {
    const tDb = getTallyDb();
    const d = req.body;
    tDb
      .prepare(
        `UPDATE tally_settings SET 
      sync_mode = ?, educational_mode = ?, tally_url = ?, company_name = ?, sales_ledger = ?, purchase_ledger = ?, 
      cash_ledger = ?, bank_ledger = ?, cgst_ledger = ?, sgst_ledger = ?, 
      igst_ledger = ?, discount_ledger = ?, default_expense_ledger = ?, round_off_ledger = ? WHERE id = 1`,
      )
      .run(
        d.sync_mode || 'itemized',
        d.educational_mode !== undefined ? (d.educational_mode ? 1 : 0) : 1,
        d.tally_url,
        d.company_name,
        d.sales_ledger,
        d.purchase_ledger,
        d.cash_ledger,
        d.bank_ledger,
        d.cgst_ledger,
        d.sgst_ledger,
        d.igst_ledger,
        d.discount_ledger,
        d.default_expense_ledger,
        d.round_off_ledger,
      );
    res.json({ success: true, message: "Settings saved successfully." });
  } catch (err) {
    console.log("error in creating settings", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// TRIGGER MANUAL SYNC
router.post("/sync/manual", async (req, res) => {
  try {
    const tDb = getTallyDb();
    const settings = tDb.prepare("SELECT * FROM tally_settings WHERE id = 1").get();
    
    // Automatically retry all previously failed items when user clicks "Start Sync Process"
    tDb.prepare("UPDATE sync_state SET status = 'pending', is_permanent_failure = 0 WHERE status = 'failed'").run();
    
    const changes = ComparisonEngine.scanAll();
    const result = await TallySyncOrchestrator.processQueue(settings);
    
    res.json({ success: true, changesFound: changes, details: result.message });
  } catch (err) {
    console.log("Error in syncing tally", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// FORCE RESET QUEUE (Resync everything)
router.post("/sync/reset", (req, res) => {
  try {
    const tDb = getTallyDb();
    tDb.prepare("DELETE FROM sync_state").run();
    ComparisonEngine.scanAll();
    res.json({
      success: true,
      message: "Queue reset. All data queued for fresh sync.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET QUEUE STATUS
router.get("/status", (req, res) => {
  try {
    const tDb = getTallyDb();
    const stats = tDb
      .prepare(
        `
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as synced
      FROM sync_state
    `,
      )
      .get();

    const recentFailed = tDb
      .prepare(
        "SELECT * FROM sync_state WHERE status = 'failed' ORDER BY retry_count DESC LIMIT 1000",
      )
      .all();

    // Group totals by entity
    const breakdown = tDb
      .prepare(
        "SELECT entity_type, COUNT(*) as total FROM sync_state GROUP BY entity_type",
      )
      .all();

    res.json({ success: true, stats, recentFailed, breakdown });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// RETRY SPECIFIC SYNC
router.post("/sync/retry", (req, res) => {
  try {
    const { entity_type, entity_id } = req.body;
    const tDb = getTallyDb();
    
    if (!entity_type || !entity_id) {
      // If no specific entity provided, retry ALL failed
      tDb.prepare("UPDATE sync_state SET status = 'pending', error_log = NULL, retry_count = 0, is_permanent_failure = 0 WHERE status = 'failed'").run();
      res.json({ success: true, message: "All failed records queued for retry." });
    } else {
      tDb.prepare("UPDATE sync_state SET status = 'pending', error_log = NULL, retry_count = 0, is_permanent_failure = 0 WHERE entity_type = ? AND entity_id = ?").run(entity_type, entity_id);
      res.json({ success: true, message: "Record queued for retry." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// AUTO CREATE MASTERS (Legacy routes mapping to inline creation by orchestrator/resolver)
router.post("/auto-create-ledgers", async (req, res) => {
  try {
    const tDb = getTallyDb();
    const settings = tDb.prepare("SELECT * FROM tally_settings WHERE id = 1").get();
    
    // 1. Create Core Ledgers first
    const coreLedgers = [
      settings.sales_ledger,
      settings.purchase_ledger,
      settings.cash_ledger,
      settings.bank_ledger,
      settings.receipt_ledger,
      settings.payment_ledger,
      settings.credit_note_ledger,
      settings.debit_note_ledger,
      settings.cgst_ledger,
      settings.sgst_ledger,
      settings.igst_ledger,
      settings.discount_ledger,
      settings.round_off_ledger,
      settings.default_expense_ledger
    ].filter(Boolean); // Remove null/undefined/empty
    
    const totalCount = coreLedgers.length + 2;
    let currentCount = 0;
    
    syncEventEmitter.emit("log", { message: "Starting auto-creation of ledgers..." });

    for (const ledger of coreLedgers) {
      currentCount++;
      syncEventEmitter.emit("progress", { current: currentCount, total: totalCount, item: ledger });
      await DependencyResolver.resolveLedger(ledger, settings);
    }
    
    // 1.5 Configure Voucher Types
    const voucherTypesToConfigure = [
      { name: "Sales", parent: "Sales" },
      { name: "Purchase", parent: "Purchase" },
      { name: "Receipt", parent: "Receipt" },
      { name: "Payment", parent: "Payment" },
      { name: "Credit Note", parent: "Credit Note" },
      { name: "Debit Note", parent: "Debit Note" }
    ];
    
    for (const vt of voucherTypesToConfigure) {
      currentCount++;
      syncEventEmitter.emit("progress", { current: currentCount, total: totalCount + 4, item: `${vt.name} Voucher Type` });
      await DependencyResolver.resolveVoucherType(vt.name, vt.parent, settings);
    }
    
    syncEventEmitter.emit("log", { message: "Core ledgers checked. Queuing masters..." });

    // 2. Scan masters specifically
    let changes = 0;
    changes += ComparisonEngine.scanTable("customers", "customer");
    changes += ComparisonEngine.scanTable("suppliers", "supplier");
    
    // 3. Process only masters queue
    await TallySyncOrchestrator.processQueue(settings);
    
    res.json({ success: true, message: `Created ${coreLedgers.length} core ledgers, and queued ${changes} customers/suppliers for sync.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/auto-create-items", async (req, res) => {
  try {
    const tDb = getTallyDb();
    const settings = tDb.prepare("SELECT * FROM tally_settings WHERE id = 1").get();
    
    let changes = 0;
    changes += ComparisonEngine.scanTable("products", "product");
    
    await TallySyncOrchestrator.processQueue(settings);
    
    res.json({ success: true, message: `Scanned for missing stock items and queued ${changes} for sync.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// CONTROLS
router.post("/sync/pause", (req, res) => {
  global.tallySyncPaused = true;
  res.json({ success: true, message: "Sync paused." });
});

router.post("/sync/resume", (req, res) => {
  global.tallySyncPaused = false;
  res.json({ success: true, message: "Sync resumed." });
});

router.post("/sync/stop", (req, res) => {
  global.tallySyncStopped = true;
  res.json({ success: true, message: "Sync stopped." });
});

export default router;
