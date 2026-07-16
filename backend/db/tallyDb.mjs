import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let tallyDb;

export function initializeTallyDb(mainDbPath) {
  if (tallyDb) return;

  const dbDir = path.dirname(mainDbPath);
  const tallyDbPath = path.join(dbDir, "tally_sync.db");
  
  console.log(`[TALLY-DB] Connecting to Tally Sync database at: ${tallyDbPath}`);
  
  tallyDb = new Database(tallyDbPath);
  tallyDb.pragma("foreign_keys = ON");
  tallyDb.pragma("journal_mode = WAL");

  tallyDb.exec(`
    CREATE TABLE IF NOT EXISTS tally_config (
      config_key TEXT PRIMARY KEY,
      config_value TEXT
    );

    CREATE TABLE IF NOT EXISTS tally_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL, -- 'sales', 'purchases', 'customers', 'products', 'expenses', etc.
      entity_id TEXT NOT NULL, -- Kosh's reference or ID
      tally_reference TEXT, -- e.g., the GUID or Voucher Number
      status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED', 'PENDING')),
      error_message TEXT,
      request_payload TEXT,
      response_payload TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_tally_logs_entity ON tally_sync_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_tally_logs_status ON tally_sync_logs(status);
  `);

  // Default configuration seeding
  const defaultConfigs = [
    ['tally_port', '9000'],
    ['tally_host', 'localhost'],
    ['default_sales_ledger', 'Sales A/c'],
    ['default_purchase_ledger', 'Purchase A/c'],
    ['default_discount_ledger', 'Discount'],
    ['default_roundoff_ledger', 'Round Off'],
    ['default_cgst_ledger', 'CGST'],
    ['default_sgst_ledger', 'SGST'],
    ['default_igst_ledger', 'IGST'],
    ['default_cash_ledger', 'Cash'],
    ['default_bank_ledger', 'Bank A/c'],
    ['default_expense_ledger', 'General Expenses'],
    ['default_godown', 'Main Location'],
    ['default_units', 'pcs, kg, g, ltr, doz, box'],
    ['tally_educational_mode', 'false']
  ];

  const checkConfig = tallyDb.prepare(`SELECT config_value FROM tally_config WHERE config_key = ?`);
  const insertConfig = tallyDb.prepare(`INSERT INTO tally_config (config_key, config_value) VALUES (?, ?)`);

  tallyDb.transaction(() => {
    for (const [key, value] of defaultConfigs) {
      if (!checkConfig.get(key)) {
        insertConfig.run(key, value);
      }
    }
  })();

  return tallyDb;
}

export function getTallyDb() {
  if (!tallyDb) {
    throw new Error("Tally Database not initialized. Call initializeTallyDatabase first.");
  }
  return tallyDb;
}

export function getTallyConfig(key) {
  const row = getTallyDb().prepare('SELECT config_value FROM tally_config WHERE config_key = ?').get(key);
  return row ? row.config_value : null;
}

export function setTallyConfig(key, value) {
  getTallyDb().prepare(`
    INSERT INTO tally_config (config_key, config_value) 
    VALUES (?, ?) 
    ON CONFLICT(config_key) DO UPDATE SET config_value=excluded.config_value
  `).run(key, value);
}

export function getTallyConfigs() {
  return getTallyDb().prepare('SELECT * FROM tally_config').all().reduce((acc, row) => {
    acc[row.config_key] = row.config_value;
    return acc;
  }, {});
}

export function logTallySync(entityType, entityId, status, errorMessage = null, request = null, response = null, tallyReference = null) {
  // If it's a success, we should delete any previous failures for this entity to keep logs clean
  // Wait, the user said once it's in tally we don't update it. So we only need one success log.
  const db = getTallyDb();
  
  // check if already success
  const existingSuccess = db.prepare(`SELECT id FROM tally_sync_logs WHERE entity_type = ? AND entity_id = ? AND status = 'SUCCESS'`).get(entityType, entityId);
  if (existingSuccess && status === 'SUCCESS') {
      return; // Already synced successfully, do nothing. (Shouldn't reach here normally)
  }

  db.prepare(`
    INSERT INTO tally_sync_logs (entity_type, entity_id, tally_reference, status, error_message, request_payload, response_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(entityType, entityId, tallyReference, status, errorMessage, request, response);
}

export function isEntitySynced(entityType, entityId) {
  const row = getTallyDb().prepare(`SELECT status FROM tally_sync_logs WHERE entity_type = ? AND entity_id = ? AND status = 'SUCCESS'`).get(entityType, entityId);
  return !!row;
}

export function getSyncLogs(limit = 100) {
  return getTallyDb().prepare(`
    SELECT * FROM tally_sync_logs 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(limit);
}

export function resetSyncLogs() {
  getTallyDb().prepare(`DELETE FROM tally_sync_logs`).run();
}
