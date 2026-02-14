import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

let db; // Main DB
let nonGstDb; // Non-GST DB

/**
 * Helper to safely add a column if it doesn't exist.
 */
function safeMigrate(database, tableName, columnName, columnDef) {
  try {
    database
      .prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`)
      .run();
    console.log(`[DB] Migrated ${tableName}: Added column ${columnName}`);
  } catch (error) {
    if (!error.message.includes("duplicate column name")) {
      console.warn(
        `[DB] Migration warning for ${tableName}.${columnName}: ${error.message}`,
      );
    }
  }
}

/**
 * 1. PREPARE BACKUP (Safe Mode)
 * Checks if migration is needed. Preserves existing backup if it contains data.
 */
function ensureBackupExists(dbPath) {
  const backupPath = path.join(path.dirname(dbPath), "main_backup_utc.db");

  if (fs.existsSync(dbPath)) {
    try {
      // Check if current DB needs migration
      const tempDb = new Database(dbPath);
      const version = tempDb.pragma("user_version", { simple: true });
      tempDb.close();

      if (version < 3) {
        console.log(
          `[DB] Migration needed (Current v${version}). Preparing backup...`,
        );

        const currentStats = fs.statSync(dbPath);

        if (fs.existsSync(backupPath)) {
          const backupStats = fs.statSync(backupPath);
          console.log(
            `[DB] Backup file exists (${backupStats.size} bytes). Current DB is (${currentStats.size} bytes).`,
          );

          // CRITICAL: Only overwrite backup if current DB is significantly larger (has data)
          // If backup is 0 bytes, we always overwrite it.
          if (
            backupStats.size === 0 ||
            currentStats.size > backupStats.size + 8192
          ) {
            console.log("[DB] Overwriting old/empty backup with current DB.");
            try {
              fs.unlinkSync(backupPath);
            } catch (e) {}
            fs.renameSync(dbPath, backupPath);
          } else {
            console.log(
              "[DB] Existing backup is larger/safer. Deleting current unmigrated DB to force restore.",
            );
            fs.unlinkSync(dbPath);
          }
        } else {
          // No backup exists, create it
          fs.renameSync(dbPath, backupPath);
        }
      }
    } catch (e) {
      console.error("[DB] Backup Check failed:", e);
    }
  }
  return backupPath;
}

/**
 * 2. RESTORE DATA
 * Copies data from backup to active DB using ATTACH.
 */
function restoreDataFromBackup(activeDb, backupPath) {
  if (!fs.existsSync(backupPath)) {
    console.log("[DB] No backup file found to restore.");
    return;
  }

  const stats = fs.statSync(backupPath);
  console.log(`[DB] Found backup file: ${backupPath} (${stats.size} bytes)`);

  if (stats.size === 0) {
    console.error(
      "[DB] ⚠️ CRITICAL: Backup file is empty (0 bytes). Cannot restore data.",
    );
    console.error(
      "[DB] Please check if 'database_old.db' or a Google Drive backup is available.",
    );
    return;
  }

  // Check if we are already migrated
  const version = activeDb.pragma("user_version", { simple: true });
  if (version >= 3) {
    console.log("[DB] Database already migrated (v2). Skipping restore.");
    return;
  }

  console.log("[DB] Starting restoration...");

  try {
    // FIX: Use forward slashes for SQL path compatibility
    const safeBackupPath = backupPath.replace(/\\/g, "/");

    // Attach the old DB
    activeDb.exec(`ATTACH DATABASE '${safeBackupPath}' AS old_db`);

    const tables = [
      "users",
      "access_logs",
      "license_info",
      "shop",
      "categories",
      "subcategories",
      "storage_locations",
      "suppliers",
      "customers",
      "products",
      "product_batches",
      "product_serials",
      "sales",
      "sales_items",
      "sales_orders",
      "sales_order_items",
      "purchases",
      "purchase_items",
      "transactions",
      "expenses",
      "stock_adjustments",
      "employees",
      "employee_sales",
    ];

    activeDb.transaction(() => {
      // 1. CLEAR NEW DB TABLES (to prevent constraints issues during retry)
      for (const table of tables) {
        try {
          activeDb.prepare(`DELETE FROM main.${table}`).run();
        } catch (e) {}
      }

      // 2. COPY DATA
      for (const table of tables) {
        try {
          // Check if table exists in backup
          const check = activeDb
            .prepare(
              `SELECT name FROM old_db.sqlite_master WHERE type='table' AND name='${table}'`,
            )
            .get();
          if (!check) continue;

          // Get common columns
          const columnsRaw = activeDb
            .prepare(`PRAGMA table_info(${table})`)
            .all();
          if (columnsRaw.length === 0) continue;
          const columns = columnsRaw.map((c) => c.name);

          // Build SELECT with conversion
          const selectCols = columns
            .map((col) => {
              if (
                col === "created_at" ||
                col === "updated_at" ||
                col === "timestamp" ||
                col === "checked_at"
              ) {
                return `datetime(${col}, 'localtime')`;
              }
              return col;
            })
            .join(", ");

          const insertSql = `INSERT INTO main.${table} (${columns.join(", ")}) SELECT ${selectCols} FROM old_db.${table}`;
          activeDb.exec(insertSql);
          console.log(`[DB] Restored ${table}`);
        } catch (err) {
          if (!err.message.includes("no such table")) {
            console.warn(`[DB] Restore error for ${table}: ${err.message}`);
          }
        }
      }

      activeDb.pragma("user_version = 3");
    })();

    activeDb.exec("DETACH DATABASE old_db");
    console.log("[DB] Restore Process Complete.");
  } catch (error) {
    console.error("[DB] CRITICAL RESTORE ERROR:", error);
    try {
      activeDb.exec("DETACH DATABASE old_db");
    } catch (e) {}
  }
}

export function initializeDatabase(dbPath) {
  if (db) return;

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  // 1. ENSURE BACKUP EXISTS
  const backupPath = ensureBackupExists(dbPath);

  // 2. CONNECT MAIN DB
  console.log(`[DB] Connecting to MAIN database at: ${dbPath}`);
  try {
    db = new Database(dbPath);
    // This pragma line is usually where it crashes if DB is corrupt
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
  } catch (err) {
    // Catch "malformed database schema" or "orphan index"
    console.error(`[DB] 🚨 CONNECTION FAILED: ${err.message}`);

    if (
      err.message.includes("malformed") ||
      err.message.includes("orphan index") ||
      err.message.includes("corrupt")
    ) {
      console.log(
        "[DB] Attempting Corruption Recovery: Renaming bad file and starting fresh...",
      );

      // Close if it opened partially
      if (db && db.open)
        try {
          db.close();
        } catch (e) {}

      const timestamp = Date.now();
      const corruptPath = `${dbPath}.corrupted_${timestamp}`;

      try {
        fs.renameSync(dbPath, corruptPath);
        console.log(`[DB] Moved corrupted file to: ${corruptPath}`);
      } catch (renameErr) {
        console.error(
          "[DB] Failed to rename corrupt file. App may crash again.",
          renameErr,
        );
      }

      // Try creating a new, fresh database instance
      db = new Database(dbPath);
      db.pragma("foreign_keys = ON");
      db.pragma("journal_mode = WAL");
      console.log("[DB] Fresh database created successfully.");
      // The script will now proceed to create Schema and Restore from Backup (if available)
    } else {
      throw err; // Re-throw unknown errors
    }
  }

  // 3. CONNECT NON-GST DB
  const nonGstPath = path.join(dbDir, "database_old.db");
  console.log(`[DB] Connecting to NON-GST database at: ${nonGstPath}`);
  nonGstDb = new Database(nonGstPath);
  nonGstDb.pragma("foreign_keys = ON");
  nonGstDb.pragma("journal_mode = WAL");

  // 4. MAIN SCHEMA (Updated Defaults)
  db.exec(`
    CREATE TABLE IF NOT EXISTS license_info (
      id INTEGER PRIMARY KEY CHECK (id = 1), 
      license_key TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('valid', 'invalid', 'expired', 'grace_period')),
      expiry_date TEXT,
      checked_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'employee')) NOT NULL DEFAULT 'employee',
      permissions TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT,
      details TEXT,
      machine_type TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shop(
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name TEXT NOT NULL,
      owner_name TEXT,
      contact_number TEXT,
      email TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      country TEXT DEFAULT 'India',
      gstin TEXT,
      gst_registration_type TEXT CHECK (gst_registration_type IN ('regular','composition','unregistered')),
      pan_number TEXT,
      logo_url TEXT,
      website_url TEXT,
      invoice_prefix TEXT DEFAULT 'INV-',
      invoice_start_number INTEGER DEFAULT 1,
      financial_year_start TEXT DEFAULT '01-04',
      bank_account_no REAL ,
      bank_account_ifsc_code TEXT,
      bank_account_holder_name TEXT ,
      bank_account_type TEXT CHECK (bank_account_type IN ('savings','current')) ,
      bank_account_branch TEXT ,
      bank_name TEXT,
      upi_id TEXT ,
      upi_banking_name TEXT ,
      gst_enabled INTEGER DEFAULT 1,
      inclusive_tax_pricing INTEGER DEFAULT 1,
      default_gst_rate REAL DEFAULT 18,
      hsn_required INTEGER DEFAULT 1,
      gst_invoice_format TEXT DEFAULT 'Tax Invoice',
      show_gst_breakup INTEGER DEFAULT 1,
      currency_symbol TEXT DEFAULT '₹',
      currency_position TEXT DEFAULT 'before',
      date_format TEXT DEFAULT 'DD/MM/YYYY',
      time_format TEXT DEFAULT '24h',
      default_payment_mode TEXT DEFAULT 'cash',
      allow_negative_stock INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      label_printer_name TEXT,
      invoice_printer_name TEXT,
      invoice_printer_width_mm INTEGER DEFAULT 80,
      invoice_template_id TEXT DEFAULT 1,
      label_template_id TEXT DEFAULT 1,
      default_printer TEXT,
      print_after_save INTEGER DEFAULT 0,
      label_printer_width_mm INTEGER DEFAULT 50,
      label_template_default TEXT,
      silent_printing INTEGER DEFAULT 0,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      round_off_total INTEGER DEFAULT 1,
      show_discount_column INTEGER DEFAULT 1,
      barcode_prefix TEXT,
      enable_auto_backup INTEGER DEFAULT 0,
      backup_path TEXT,
      shop_alias TEXT,
      use_alias_on_bills INTEGER DEFAULT 0,
      sale_invoice_counter INTEGER DEFAULT 0,
      purchase_bill_counter INTEGER DEFAULT 0,
      credit_note_counter INTEGER DEFAULT 0,
      debit_note_counter INTEGER DEFAULT 0,
      payment_in_counter INTEGER DEFAULT 0,
      payment_out_counter INTEGER DEFAULT 0,
      non_gst_sale_counter INTEGER DEFAULT 0,
      last_reset_fy TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      category_id INTEGER,
      UNIQUE(name, category_id),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS storage_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      gst_number TEXT,
      supplier_type TEXT CHECK(supplier_type IN ('local', 'wholeseller', 'manufacturer', 'distributor')) DEFAULT 'local',
      bank_account TEXT,
      ifsc_code TEXT,
      upi_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      gst_no TEXT,
      credit_limit REAL DEFAULT 0 CHECK (credit_limit >= 0),
      additional_info TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      product_code TEXT NOT NULL UNIQUE,
      hsn TEXT,
      gst_rate REAL NOT NULL DEFAULT 0,
      mrp REAL,
      mop REAL,
      mfw_price TEXT,
      average_purchase_price REAL DEFAULT 0,
      category INTEGER,
      subcategory INTEGER,
      storage_location TEXT,
      quantity REAL DEFAULT 0, -- UPDATED: REAL for fractional support
      base_unit TEXT DEFAULT 'pcs', -- UPDATED: New column
      secondary_unit TEXT, -- UPDATED: New column
      conversion_factor REAL DEFAULT 1, -- UPDATED: New column
      description TEXT,
      brand TEXT,
      barcode TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      is_active INTEGER DEFAULT 1,
      low_stock_threshold INTEGER DEFAULT 0,
      size TEXT,
      weight TEXT,
      tracking_type TEXT CHECK(tracking_type IN ('none', 'batch', 'serial')) DEFAULT 'none',
      FOREIGN KEY (category) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (subcategory) REFERENCES subcategories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS product_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      purchase_id INTEGER,
      batch_uid TEXT UNIQUE,    
      batch_number TEXT,
      barcode TEXT,
      expiry_date TEXT,
      mfg_date TEXT,
      mrp REAL DEFAULT 0,
      margin REAL DEFAULT 0,
      mop REAL DEFAULT 0,
      mfw_price TEXT,
      quantity REAL DEFAULT 0,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_batches_product_id ON product_batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_batches_uid ON product_batches(batch_uid);

    CREATE TABLE IF NOT EXISTS product_serials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      serial_number TEXT NOT NULL,
      status TEXT CHECK(status IN ('available', 'sold', 'returned', 'defective', 'in_repair', 'adjusted_out')) DEFAULT 'available',
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_serials_product_id ON product_serials(product_id);
    CREATE INDEX IF NOT EXISTS idx_serials_batch_id ON product_serials(batch_id);
    CREATE INDEX IF NOT EXISTS idx_serials_number ON product_serials(serial_number);

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      employee_id INTEGER,
      reference_no TEXT NOT NULL UNIQUE,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      paid_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      note TEXT,
      status TEXT,
      discount REAL DEFAULT 0,
      is_reverse_charge INTEGER DEFAULT 0,
      is_ecommerce_sale INTEGER DEFAULT 0,
      is_quote INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales (customer_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_reference_no ON sales (reference_no);

    CREATE TABLE IF NOT EXISTS sales_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      sr_no TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      rate REAL NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT, -- UPDATED: New column
      gst_rate REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      price REAL NOT NULL,
      batch_id INTEGER,
      serial_id INTEGER,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id) REFERENCES product_batches(id),
      FOREIGN KEY (serial_id) REFERENCES product_serials(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON sales_items (sale_id);

    CREATE TABLE IF NOT EXISTS sales_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      reference_no TEXT UNIQUE,
      created_by TEXT, 
      status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      note TEXT,
      fulfilled_invoice_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (fulfilled_invoice_id) REFERENCES sales(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sales_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      price REAL NOT NULL,
      unit TEXT, -- UPDATED: New column
      gst_rate REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      batch_id INTEGER,
      serial_id INTEGER,
      FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY,
      supplier_id INTEGER NOT NULL,
      reference_no TEXT NOT NULL,
      internal_ref_no TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      is_reverse_charge INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      gst_rate REAL NOT NULL,
      discount REAL DEFAULT 0,
      price REAL DEFAULT 0,
      unit TEXT, -- UPDATED: New column
      batch_uid TEXT,           
      batch_number TEXT,
      barcode TEXT,        
      serial_numbers TEXT,      
      expiry_date TEXT,
      mfg_date TEXT,
      mrp REAL DEFAULT 0,
      margin REAL DEFAULT 0,
      mop REAL DEFAULT 0,
      mfw_price TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,           
      bill_id INTEGER,            
      bill_type TEXT,             
      entity_id INTEGER NOT NULL,       
      entity_type TEXT NOT NULL,       
      transaction_date TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,     
      payment_mode TEXT,           
      status TEXT NOT NULL,
      note TEXT,
      gst_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method TEXT,
      endpoint TEXT,
      timestamp TEXT,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL, 
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cash', 
      description TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      category TEXT NOT NULL, 
      old_quantity REAL NOT NULL,
      new_quantity REAL NOT NULL,
      adjustment REAL NOT NULL, 
      reason TEXT, 
      adjusted_by TEXT DEFAULT 'Admin',
      batch_id INTEGER,
      serial_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id) REFERENCES product_batches(id),
      FOREIGN KEY (serial_id) REFERENCES product_serials(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'staff',
      commission_rate REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS employee_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      sale_id INTEGER NOT NULL,
      sale_amount REAL NOT NULL,
      commission_amount REAL NOT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(employee_id) REFERENCES employees(id),
      FOREIGN KEY(sale_id) REFERENCES sales(id)
    );
  `);

  // 5. SAFE MIGRATE MAIN DB (Ensure columns exist before restore)
  safeMigrate(
    db,
    "products",
    "tracking_type",
    "TEXT CHECK(tracking_type IN ('none', 'batch', 'serial')) DEFAULT 'none'",
  );
  // Universal Units Migration
  safeMigrate(db, "products", "base_unit", "TEXT DEFAULT 'pcs'");
  safeMigrate(db, "products", "secondary_unit", "TEXT");
  safeMigrate(db, "products", "conversion_factor", "REAL DEFAULT 1");
  safeMigrate(db, "sales_items", "unit", "TEXT");
  safeMigrate(db, "sales_order_items", "unit", "TEXT");
  safeMigrate(db, "purchase_items", "unit", "TEXT");

  // Batch specific migrations
  safeMigrate(db, "product_batches", "batch_uid", "TEXT UNIQUE");
  safeMigrate(db, "product_batches", "barcode", "TEXT");
  safeMigrate(db, "product_batches", "margin", "REAL DEFAULT 0");

  safeMigrate(
    db,
    "product_batches",
    "purchase_id",
    "INTEGER REFERENCES purchases(id) ON DELETE SET NULL",
  );
  safeMigrate(db, "purchase_items", "batch_uid", "TEXT");
  safeMigrate(db, "purchase_items", "batch_number", "TEXT");
  safeMigrate(db, "purchase_items", "serial_numbers", "TEXT");
  safeMigrate(db, "purchase_items", "expiry_date", "TEXT");
  safeMigrate(db, "purchase_items", "mfg_date", "TEXT");
  safeMigrate(db, "purchase_items", "barcode", "TEXT");
  safeMigrate(db, "purchase_items", "margin", "REAL DEFAULT 0");

  safeMigrate(
    db,
    "sales_items",
    "batch_id",
    "INTEGER REFERENCES product_batches(id)",
  );
  safeMigrate(
    db,
    "sales_items",
    "serial_id",
    "INTEGER REFERENCES product_serials(id)",
  );
  safeMigrate(db, "stock_adjustments", "batch_id", "INTEGER");
  safeMigrate(db, "stock_adjustments", "serial_id", "INTEGER");
  safeMigrate(db, "sales", "employee_id", "INTEGER");

  // 6. EXECUTE NON-GST SCHEMA (Standard Default)
  nonGstDb.exec(`
    CREATE TABLE IF NOT EXISTS sales_non_gst (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      customer_phone TEXT,
      reference_no TEXT NOT NULL UNIQUE,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      paid_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      note TEXT,
      status TEXT,
      discount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales_items_non_gst (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      sr_no TEXT NOT NULL,
      product_name TEXT NOT NULL,
      rate REAL NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      discount REAL DEFAULT 0,
      price REAL NOT NULL,
      batch_details TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales_non_gst(id) ON DELETE CASCADE
    );
  `);
  safeMigrate(nonGstDb, "sales_items_non_gst", "batch_details", "TEXT");
  safeMigrate(nonGstDb, "sales_items_non_gst", "unit", "TEXT");

  // 7. RESTORE DATA (Crucial Step: If main is empty, pull from backup)
  restoreDataFromBackup(db, backupPath);

  // 8. SEED ADMIN
  const adminCheck = db
    .prepare("SELECT count(*) as count FROM users WHERE role = 'admin'")
    .get();
  if (adminCheck.count === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      "INSERT INTO users (name, username, password, role, permissions) VALUES ('Super Admin', 'admin', ?, 'admin', '[\"*\"]')",
    ).run(hash);
  }
}

function getDb() {
  if (!db)
    throw new Error(
      "Main Database not initialized. Call initializeDatabase() first.",
    );
  return db;
}

function getNonGstDbInternal() {
  if (!nonGstDb)
    throw new Error(
      "Non-GST Database not initialized. Call initializeDatabase() first.",
    );
  return nonGstDb;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log("[DB] Main Database connection closed.");
  }
  if (nonGstDb) {
    nonGstDb.close();
    nonGstDb = null;
    console.log("[DB] Non-GST Database connection closed.");
  }
}

const dbProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const realDb = getDb();
      const value = realDb[prop];
      return typeof value === "function" ? value.bind(realDb) : value;
    },
  },
);

export default dbProxy;
export { nonGstDb };
