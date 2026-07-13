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
      sync_mode TEXT DEFAULT 'itemized',
      educational_mode BOOLEAN DEFAULT 1,
      company_name TEXT DEFAULT 'My_company',
      receipt_ledger TEXT DEFAULT 'Bank Account',
      payment_ledger TEXT DEFAULT 'Bank Account',
      credit_note_ledger TEXT DEFAULT 'Sales Returns',
      debit_note_ledger TEXT DEFAULT 'Purchase Returns'
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      reference_no TEXT,
      last_hash TEXT, 
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'success', 'failed', 'deleted')),
      action_type TEXT DEFAULT 'Create' CHECK(action_type IN ('Create', 'Alter', 'Delete')),
      error_log TEXT,
      retry_count INTEGER DEFAULT 0,
      last_attempt DATETIME,
      next_retry DATETIME,
      is_permanent_failure INTEGER DEFAULT 0,
      PRIMARY KEY (entity_type, entity_id)
    );
  `);

  // Auto-migrate new columns
  const columns = tallyDb.pragma('table_info(tally_settings)');
  const colNames = columns.map(c => c.name);
  
  if (!colNames.includes('receipt_ledger')) {
    tallyDb.prepare("ALTER TABLE tally_settings ADD COLUMN receipt_ledger TEXT DEFAULT 'Bank Account'").run();
  }
  if (!colNames.includes('payment_ledger')) {
    tallyDb.prepare("ALTER TABLE tally_settings ADD COLUMN payment_ledger TEXT DEFAULT 'Bank Account'").run();
  }
  if (!colNames.includes('credit_note_ledger')) {
    tallyDb.prepare("ALTER TABLE tally_settings ADD COLUMN credit_note_ledger TEXT DEFAULT 'Sales Returns'").run();
  }
  if (!colNames.includes('debit_note_ledger')) {
    tallyDb.prepare("ALTER TABLE tally_settings ADD COLUMN debit_note_ledger TEXT DEFAULT 'Purchase Returns'").run();
  }

  const hasSettings = tallyDb
    .prepare("SELECT count(*) as count FROM tally_settings")
    .get();
  if (!hasSettings || hasSettings.count === 0) {
    tallyDb.prepare("INSERT INTO tally_settings (id) VALUES (1)").run();
  }

  // Handle schema migrations for existing DBs safely
  try {
    tallyDb.prepare("ALTER TABLE tally_settings ADD COLUMN sync_mode TEXT DEFAULT 'accounting'").run();
  } catch (e) {}

  // Existing installs may have saved the old accounting default. Keep Tally sync itemized by default.
  tallyDb.prepare("UPDATE tally_settings SET sync_mode = 'itemized' WHERE sync_mode IS NULL OR sync_mode = 'accounting'").run();
  
  try {
    tallyDb.prepare("ALTER TABLE tally_settings ADD COLUMN educational_mode BOOLEAN DEFAULT 1").run();
  } catch (e) {}

  // Migrations for sync_state Phase 1 refactor
  try { tallyDb.prepare("ALTER TABLE sync_state ADD COLUMN last_attempt DATETIME").run(); } catch(e) {}
  try { tallyDb.prepare("ALTER TABLE sync_state ADD COLUMN next_retry DATETIME").run(); } catch(e) {}
  try { tallyDb.prepare("ALTER TABLE sync_state ADD COLUMN is_permanent_failure INTEGER DEFAULT 0").run(); } catch(e) {}
  
  // Convert old 'synced' statuses back to 'success' (if any were created during the brief refactor)
  try {
    tallyDb.prepare("UPDATE sync_state SET status = 'success' WHERE status = 'synced'").run();
  } catch (e) {}
}

export function getTallyDb() {
  if (!tallyDb) throw new Error("Tally DB not initialized.");
  return tallyDb;
}
