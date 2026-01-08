import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

let db; // Main DB (GST, Auth, Inventory)
let nonGstDb; // Non-GST DB (Sales Only)

/**
 * Helper to safely add a column if it doesn't exist.
 * This allows the schema to evolve without deleting the database.
 */
function safeMigrate(database, tableName, columnName, columnDef) {
  try {
    database
      .prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`)
      .run();
    console.log(`[DB] Migrated ${tableName}: Added column ${columnName}`);
  } catch (error) {
    // Error usually means column exists, which is fine.
    if (!error.message.includes("duplicate column name")) {
      console.warn(
        `[DB] Migration warning for ${tableName}.${columnName}: ${error.message}`
      );
    }
  }
}

/**
 * Initializes the database connection using a path provided by the main process.
 * This function must be called on startup before any database operations.
 * @param {string} dbPath - The absolute path to the MAIN database file.
 */
export function initializeDatabase(dbPath) {
  if (db) {
    return; // Prevent re-initialization
  }

  // Ensure the directory for the database exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // ---------------------------------------------------------
  // 1. CONNECT TO MAIN DATABASE
  // ---------------------------------------------------------
  console.log(`[DB] Connecting to MAIN database at: ${dbPath}`);
  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  // ---------------------------------------------------------
  // 2. CONNECT TO NON-GST DATABASE (Decoupled)
  // ---------------------------------------------------------
  const nonGstPath = path.join(dbDir, "database_old.db");
  console.log(`[DB] Connecting to NON-GST database at: ${nonGstPath}`);
  nonGstDb = new Database(nonGstPath);
  nonGstDb.pragma("foreign_keys = ON");
  nonGstDb.pragma("journal_mode = WAL");

  // ---------------------------------------------------------
  // 3. EXECUTE MAIN SCHEMA
  // ---------------------------------------------------------
  db.exec(`
    /* =============================================================== */
    /* CORE CONFIGURATION & SETTINGS
    /* =============================================================== */
    CREATE TABLE IF NOT EXISTS license_info (
      id INTEGER PRIMARY KEY CHECK (id = 1), 
      license_key TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('valid', 'invalid', 'expired', 'grace_period')),
      expiry_date TEXT,
      checked_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    /* =============================================================== */
    /* USER MANAGEMENT & RBAC
    /* =============================================================== */
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'employee')) NOT NULL DEFAULT 'employee',
      permissions TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT,
      details TEXT,
      machine_type TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
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

    /* =============================================================== */
    /* LOOKUP & MASTER TABLES
    /* =============================================================== */
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

    /* =============================================================== */
    /* CORE ENTITY TABLES
    /* =============================================================== */
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    /* =============================================================== */
    /* PRODUCTS & INVENTORY
    /* =============================================================== */
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      product_code TEXT NOT NULL UNIQUE,
      hsn TEXT,
      gst_rate REAL NOT NULL DEFAULT 0,
      mrp REAL,
      mop REAL,
      average_purchase_price REAL DEFAULT 0,
      category INTEGER,
      subcategory INTEGER,
      storage_location TEXT,
      quantity INTEGER,
      description TEXT,
      brand TEXT,
      barcode TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1,
      low_stock_threshold INTEGER DEFAULT 0,
      mfw_price TEXT,
      size TEXT,
      weight TEXT,
      tracking_type TEXT CHECK(tracking_type IN ('none', 'batch', 'serial')) DEFAULT 'none',
      FOREIGN KEY (category) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (subcategory) REFERENCES subcategories(id) ON DELETE SET NULL
    );

    /* UPDATED: PRODUCT BATCHES & SERIALS */
    /* This table holds the Batch Group info */
    CREATE TABLE IF NOT EXISTS product_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      purchase_id INTEGER, -- Link to origin Purchase (for Supplier tracking)
      
      -- Internal Tracking (batch_productID_incrementalID)
      batch_uid TEXT UNIQUE,    
      
      -- Vendor Identification
      batch_number TEXT,        -- Manufacturer/Supplier batch no (e.g., 'B-2025-X')
      
      -- Dates
      expiry_date TEXT,         -- YYYY-MM-DD
      mfg_date TEXT,
      
      -- Economics (Batch Specific)
      mrp REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      
      -- Stock
      quantity REAL DEFAULT 0,  -- Remaining stock for this batch
      location TEXT,
      
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_batches_product_id ON product_batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_batches_uid ON product_batches(batch_uid);

    /* NEW: PRODUCT SERIALS */
    /* This table holds individual serial numbers inside a batch */
    CREATE TABLE IF NOT EXISTS product_serials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL, -- Link to the batch group
      
      serial_number TEXT NOT NULL,
      status TEXT CHECK(status IN ('available', 'sold', 'returned', 'defective', 'in_repair')) DEFAULT 'available',
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_serials_product_id ON product_serials(product_id);
    CREATE INDEX IF NOT EXISTS idx_serials_batch_id ON product_serials(batch_id);
    CREATE INDEX IF NOT EXISTS idx_serials_number ON product_serials(serial_number);


    /* =============================================================== */
    /* MAIN TRANSACTION TABLES (Sales & Purchases)
    /* =============================================================== */
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      gst_rate REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      price REAL NOT NULL,
      
      -- Batch & Serial Link
      batch_id INTEGER,
      serial_id INTEGER,
      
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id) REFERENCES product_batches(id),
      FOREIGN KEY (serial_id) REFERENCES product_serials(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON sales_items (sale_id);

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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
      
      -- Tracking Information at Purchase Time
      batch_uid TEXT,           -- Internal UID created during purchase
      batch_number TEXT,        -- Manufacturer batch no
      serial_numbers TEXT,      -- Raw serials (CSV/JSON) for reference
      expiry_date TEXT,
      mfg_date TEXT,
      
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    /* =============================================================== */
    /* LOGGING & ACCOUNTING
    /* =============================================================== */
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // ---------------------------------------------------------
  // 4. MIGRATION FOR MAIN DB (Applying changes to existing DBs)
  // ---------------------------------------------------------
  // Safe migrate products
  safeMigrate(
    db,
    "products",
    "tracking_type",
    "TEXT CHECK(tracking_type IN ('none', 'batch', 'serial')) DEFAULT 'none'"
  );

  // Safe migrate product_batches (columns added if table existed without them)
  safeMigrate(db, "product_batches", "batch_uid", "TEXT UNIQUE");
  safeMigrate(
    db,
    "product_batches",
    "purchase_id",
    "INTEGER REFERENCES purchases(id) ON DELETE SET NULL"
  );

  // Safe migrate purchase_items
  safeMigrate(db, "purchase_items", "batch_uid", "TEXT");
  safeMigrate(db, "purchase_items", "batch_number", "TEXT");
  safeMigrate(db, "purchase_items", "serial_numbers", "TEXT");
  safeMigrate(db, "purchase_items", "expiry_date", "TEXT");
  safeMigrate(db, "purchase_items", "mfg_date", "TEXT");

  // Safe migrate sales_items
  safeMigrate(
    db,
    "sales_items",
    "batch_id",
    "INTEGER REFERENCES product_batches(id)"
  );
  safeMigrate(
    db,
    "sales_items",
    "serial_id",
    "INTEGER REFERENCES product_serials(id)"
  );

  // ---------------------------------------------------------
  // 5. EXECUTE NON-GST SCHEMA (Separated)
  // ---------------------------------------------------------
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
      discount REAL DEFAULT 0,
      price REAL NOT NULL,
      
      -- Snapshot of batch/serial details for receipt
      batch_details TEXT,
      
      FOREIGN KEY (sale_id) REFERENCES sales_non_gst(id) ON DELETE CASCADE
    );
  `);

  // Migration for Non-GST DB
  safeMigrate(nonGstDb, "sales_items_non_gst", "batch_details", "TEXT");

  // ---------------------------------------------------------
  // 6. SEED DEFAULT DATA
  // ---------------------------------------------------------
  const adminCheck = db
    .prepare("SELECT count(*) as count FROM users WHERE role = 'admin'")
    .get();
  if (adminCheck.count === 0) {
    console.log("[DB] Seeding default admin user...");
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      `
      INSERT INTO users (name, username, password, role, permissions) 
      VALUES ('Super Admin', 'admin', ?, 'admin', '["*"]')
    `
    ).run(hash);
  }
}

/**
 * Returns the initialized MAIN database instance.
 */
function getDb() {
  if (!db) {
    throw new Error(
      "Main Database not initialized. Call initializeDatabase() first."
    );
  }
  return db;
}

/**
 * Returns the initialized NON-GST database instance.
 */
function getNonGstDbInternal() {
  if (!nonGstDb) {
    throw new Error(
      "Non-GST Database not initialized. Call initializeDatabase() first."
    );
  }
  return nonGstDb;
}

/**
 * Closes BOTH database connections.
 */
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

// Default export is the Main DB proxy
const dbProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const realDb = getDb();
      const value = realDb[prop];
      if (typeof value === "function") {
        return value.bind(realDb);
      }
      return value;
    },
  }
);

export default dbProxy;

// Named export for the Non-GST DB proxy
nonGstDb = new Proxy(
  {},
  {
    get(target, prop) {
      const realDb = getNonGstDbInternal();
      const value = realDb[prop];
      if (typeof value === "function") {
        return value.bind(realDb);
      }
      return value;
    },
  }
);

export { nonGstDb };
