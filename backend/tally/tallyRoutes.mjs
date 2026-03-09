import express from "express";
import * as tallyEngine from "./tallySyncEngine.mjs";
import { getTallyDb } from "../db/tallyDb.mjs";

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
      sync_mode = ?, tally_url = ?, company_name = ?, sales_ledger = ?, purchase_ledger = ?, 
      cash_ledger = ?, bank_ledger = ?, cgst_ledger = ?, sgst_ledger = ?, 
      igst_ledger = ?, discount_ledger = ?, default_expense_ledger = ?, round_off_ledger = ? WHERE id = 1`,
      )
      .run(
        d.sync_mode,
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
    // UPDATED: Using the new scanAllForChanges function
    const changes = tallyEngine.scanAllForChanges();
    const result = await tallyEngine.processSyncQueue();
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
    // Drop tracking history to force a fresh creation sync on next scan
    tDb.prepare("DELETE FROM sync_state").run();
    // UPDATED: Using the new scanAllForChanges function
    tallyEngine.scanAllForChanges();
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
        COUNT(CASE WHEN status = 'synced' THEN 1 END) as synced
      FROM sync_state
    `,
      )
      .get();

    const recentFailed = tDb
      .prepare(
        "SELECT * FROM sync_state WHERE status = 'failed' ORDER BY retry_count DESC LIMIT 20",
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

export default router;
