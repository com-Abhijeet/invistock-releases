import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let db; // The database instance will be stored here. It's initially undefined.

/**
 * Initializes the database connection using a path provided by the main process.
 * This function must be called on startup before any database operations.
 * @param {string} dbPath - The absolute path to the database file.
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

  console.log(`[DB] Connecting to database at: ${dbPath}`);
  db = new Database(dbPath);

  // Enable essential PRAGMA settings for performance and integrity
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  db.exec(`
/* =============================================================== */
/* CORE CONFIGURATION & SETTINGS
/* =============================================================== */
CREATE TABLE IF NOT EXISTS license_info (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensures only one row can exist
  license_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('valid', 'invalid', 'expired', 'grace_period')),
  expiry_date TEXT,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- The main table for shop/business details. No dependencies.
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
  

  label_printer_name TEX,
  invoice_printer_name TEXT,
  invoice_printer_width_mm INTEGER DEFAULT 80,
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

-- Categories must be created before subcategories.
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL
);

-- Subcategories depend on categories.
CREATE TABLE IF NOT EXISTS subcategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category_id INTEGER,
  UNIQUE(name, category_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Storage locations have no dependencies.
CREATE TABLE IF NOT EXISTS storage_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

/* =============================================================== */
/* CORE ENTITY TABLES (Customers & Suppliers)
/* =============================================================== */

-- Suppliers have no dependencies.
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

-- Customers have no dependencies.
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
/* PRODUCTS TABLE
/* =============================================================== */

-- Products depend on categories and subcategories.
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

 FOREIGN KEY (category) REFERENCES categories(id) ON DELETE SET NULL,
 FOREIGN KEY (subcategory) REFERENCES subcategories(id) ON DELETE SET NULL
);

/* =============================================================== */
/* MAIN TRANSACTION TABLES (Sales & Purchases)
/* =============================================================== */

-- Sales depend on customers.
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

  --Flags for sale table --
  is_reverse_charge INTEGER DEFAULT 0,
  is_ecommerce_sale INTEGER DEFAULT 0,
  is_quote INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales (customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_reference_no ON sales (reference_no);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at);

-- Sales items depend on sales and products.
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
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE ,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON sales_items (sale_id);

-- Purchases depend on suppliers.
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

  --Flags for purchase table --
  is_reverse_charge INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Purchase items depend on purchases and products.
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  rate REAL NOT NULL,
  gst_rate REAL NOT NULL,
  discount REAL DEFAULT 0,
  price REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

/* =============================================================== */
/* CENTRALIZED TRANSACTION & LOGGING TABLES
/* =============================================================== */

-- Transactions logically relate to many tables, so it's best placed after them.
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_no TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,           -- 'sale', 'purchase', 'payment', 'credit_note', 'debit_note'
  
  -- Foreign keys for linking to original bills and entities
  bill_id INTEGER,            -- ID of the original sale or purchase transaction
  bill_type TEXT,             -- 'sale' or 'purchase'
  
  entity_id INTEGER NOT NULL,       -- Customer ID for sales/CN, Supplier ID for purchases/DN
  entity_type TEXT NOT NULL,       -- 'customer' or 'supplier'
  
  transaction_date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,     -- The value of the transaction (e.g., sale total, payment amount)
  payment_mode TEXT,           -- 'cash', 'card', 'credit', 'UPI'
  status TEXT NOT NULL,
  note TEXT,
  gst_amount REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Audit logs have no dependencies and can be placed last.
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method TEXT,
  endpoint TEXT,
  timestamp TEXT,
  payload TEXT
);

/* =============================================================== */
/* NON-GST TRANSACTION TABLES
/* =============================================================== */

CREATE TABLE IF NOT EXISTS sales_non_gst (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  reference_no TEXT NOT NULL UNIQUE,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  paid_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  note TEXT,
  status TEXT,
  discount REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS sales_items_non_gst (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  sr_no TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  rate REAL NOT NULL,
  quantity REAL NOT NULL,
  discount REAL DEFAULT 0,
  price REAL NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales_non_gst(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

/* =============================================================== */
/* EXPENSE MODULE
/* =============================================================== */

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL, -- Stored as YYYY-MM-DD
  category TEXT NOT NULL, -- e.g., 'Rent', 'Salary', 'Electricity'
  amount REAL NOT NULL,
  payment_mode TEXT DEFAULT 'Cash', -- 'Cash', 'UPI', 'Bank'
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* =============================================================== */
/* INVENTORY ADJUSTMENT MODULE
/* =============================================================== */

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Damaged', 'Theft', 'Stocktaking', 'Expiry'
  old_quantity REAL NOT NULL,
  new_quantity REAL NOT NULL,
  adjustment REAL NOT NULL, -- The difference (e.g., -5 or +10)
  reason TEXT, -- Specific note (e.g., "Dropped box of glass")
  adjusted_by TEXT DEFAULT 'Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

`);
}

/**
 * Returns the initialized database instance. Throws an error if not initialized.
 * @returns {Database.Database} The better-sqlite3 database instance.
 */
function getDb() {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return db;
}

// ✅ ADD THIS NEW FUNCTION
/**
 * Closes the database connection if it is open.
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null; // Clear the instance
    console.log("[DB] Database connection closed successfully.");
  }
}

// --- The Magic Proxy ---
const dbProxy = new Proxy(
  {},
  {
    get(target, prop) {
      // 1. Get the REAL database connection *at the moment a property is accessed*.
      const realDb = getDb();

      // 2. Find the requested property (e.g., 'prepare') on the real database.
      const value = realDb[prop];

      // 3. If the property is a function, bind it to the real database.
      // This ensures that methods like .prepare() have the correct 'this' context.
      if (typeof value === "function") {
        return value.bind(realDb);
      }

      // 4. Return the property.
      return value;
    },
  }
);

// Export the proxy as the default.
export default dbProxy;
