import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let tallyDb;

export function initializeTallyDb(mainDbPath) {
  if (tallyDb) return;

  const dbDir = path.dirname(mainDbPath);
  const tallyDbPath = path.join(dbDir, "tally_sync.db");

  console.log(`[TALLY DB] Connecting to Tally database at: ${tallyDbPath}`);
  tallyDb = new Database(tallyDbPath);
  tallyDb.pragma("journal_mode = WAL");

  tallyDb.exec(`
    CREATE TABLE IF NOT EXISTS tally_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tally_url TEXT DEFAULT 'http://localhost:9000',
      sales_ledger TEXT DEFAULT 'Sales Account',
      purchase_ledger TEXT DEFAULT 'Purchase Account',
      cash_ledger TEXT DEFAULT 'Cash',
      bank_ledger TEXT DEFAULT 'Bank Account',
      cgst_ledger TEXT DEFAULT 'CGST',
      sgst_ledger TEXT DEFAULT 'SGST',
      igst_ledger TEXT DEFAULT 'IGST',
      discount_ledger TEXT DEFAULT 'Discount Allow',
      round_off_ledger TEXT DEFAULT 'Round Off',
      default_expense_ledger TEXT DEFAULT 'Expense',
      sync_mode TEXT,
      company_name TEXT DEFAULT 'My_company'
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      reference_no TEXT,
      last_hash TEXT, 
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'success', 'failed', 'deleted')),
      action_type TEXT DEFAULT 'Create' CHECK(action_type IN ('Create', 'Alter', 'Delete')),
      error_log TEXT,
      retry_count INTEGER DEFAULT 0,
      PRIMARY KEY (entity_type, entity_id)
    );
  `);

  const hasSettings = tallyDb
    .prepare("SELECT count(*) as count FROM tally_settings")
    .get().count;
  if (!hasSettings) {
    tallyDb.prepare("INSERT INTO tally_settings (id) VALUES (1)").run();
  }
}

export function getTallyDb() {
  if (!tallyDb) throw new Error("Tally DB not initialized.");
  return tallyDb;
}
