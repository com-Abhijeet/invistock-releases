import db from "../db/db.mjs";

// CREATE

export const createProduct = (product) => {
  const codeExists = db
    .prepare("SELECT id FROM products WHERE product_code = ?")
    .get(product.product_code);
  if (codeExists) throw new Error("Product code already exists");

  const insertProduct = db.transaction(() => {
    // Check if category and subcategory exist (this is an extra check, your code already assumes they do)
    const categoryExists = db
      .prepare("SELECT id FROM categories WHERE id = ?")
      .get(product.category);
    const subcategoryExists = db
      .prepare("SELECT id FROM subcategories WHERE id = ?")
      .get(product.subcategory);

    if (!categoryExists || !subcategoryExists) {
      throw new Error("Category or subcategory not found.");
    }

    const stmt = db.prepare(
      `INSERT INTO products (
        name, product_code, hsn, gst_rate, mrp, mop, category, subcategory,
        storage_location, quantity, description, brand, barcode,
        image_url, is_active, average_purchase_price, mfw_price, low_Stock_threshold, size, weight
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const info = stmt.run(
      product.name,
      product.product_code,
      product.hsn,
      product.gst_rate,
      product.mrp,
      product.mop,
      product.category,
      product.subcategory,
      product.storage_location,
      product.quantity,
      product.description,
      product.brand,
      product.barcode,
      product.image_url,
      product.is_active ?? 1,
      product.average_purchase_price,
      product.mfw_price,
      product.low_stock_threshold,
      product.size,
      product.weight
    );
    return { id: info.lastInsertRowid, ...product };
  });

  return insertProduct();
};

/**
 * @description Fetches products from the database with pagination, searching, and status filtering.
 *
 * @param {object} [options={}] - Filtering and pagination options.
 * @param {number} [options.page=1] - The page number for pagination.
 * @param {number} [options.limit=10] - The number of records per page.
 * @param {string} [options.query=""] - A search term to filter by name, code, or barcode.
 * @param {boolean} [options.isActive=true] - Filters by active status (true for active, false for inactive). Ignored if `all` is true.
 * @param {boolean} [options.all=false] - If true, fetches all records without pagination and sorts by status.
 * @returns {{records: Array, totalRecords: number}} An object containing the product records and the total count.
 * @throws {Error} Throws an error if the database query fails.
 */
export function getAllProducts(options) {
  console.log(options);
  const { page = 1, limit = 10, query = "", isActive, all } = options;

  try {
    const params = [];
    let whereClauses = [];

    if (query) {
      whereClauses.push(
        `(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)`
      );
      const searchQuery = `%${query}%`;
      params.push(searchQuery, searchQuery, searchQuery);
    }

    // The 'isActive' filter is only applied if 'all' is false
    if (!all) {
      whereClauses.push(`p.is_active = ?`);
      // Convert incoming boolean to 1 or 0 for SQLite
      params.push(isActive);
    }

    const whereStatement =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // --- Build ORDER BY clause dynamically ---
    const orderByStatement = all
      ? "ORDER BY p.is_active DESC, p.name ASC"
      : "ORDER BY p.name ASC";

    // --- Build LIMIT / OFFSET clause dynamically ---
    const offset = (page - 1) * limit;
    const limitStatement = all ? "" : "LIMIT ? OFFSET ?";

    // --- Construct Final Queries ---
    const mainQuery = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category = c.id
      ${whereStatement}
      ${orderByStatement}
      ${limitStatement}
    `;

    const countQuery = `SELECT COUNT(*) as totalRecords FROM products p ${whereStatement}`;

    // --- Execute Queries ---
    const countStmt = db.prepare(countQuery);
    const { totalRecords } = countStmt.get(...params);

    const mainStmt = db.prepare(mainQuery);
    // Add pagination params only if not fetching all records
    const records = all
      ? mainStmt.all(...params)
      : mainStmt.all(...params, limit, offset);

    return { records, totalRecords };
  } catch (error) {
    console.error("Database error in getAllProducts:", error);
    throw new Error("Could not fetch products from the database.");
  }
}

/**
 * @description Retrieves a single, comprehensive product record by its ID.
 * Joins with categories/subcategories and calculates the latest purchase price.
 * @param {number} id - The ID of the product to fetch.
 * @returns {object | undefined} The complete product object with joined and calculated fields, or undefined if not found.
 */
export const getProductById = (id) => {
  return db
    .prepare(
      `
      SELECT 
        p.*,
        cat.name AS category_name,
        subcat.name AS subcategory_name,
        
        -- Subquery to get the rate from the most recent purchase for this product
        (SELECT pi.rate 
         FROM purchase_items pi
         JOIN purchases pu ON pi.purchase_id = pu.id
         WHERE pi.product_id = p.id
         ORDER BY pu.date DESC, pi.id DESC
         LIMIT 1) AS latest_purchase_price
         
      FROM products p
      LEFT JOIN categories cat ON p.category = cat.id
      LEFT JOIN subcategories subcat ON p.subcategory = subcat.id
      WHERE p.id = ?
    `
    )
    .get(id);
};

/**
 * Fetches complete details and a unified transaction history for a single product
 * from all sales channels (GST, Non-GST), Purchases, and Stock Adjustments.
 * @param {number} productId The ID of the product.
 * @returns {object} An object containing product details and its history.
 */
export function getProductHistory(productId) {
  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(productId);
  if (!product) {
    throw new Error("Product not found.");
  }

  // 1. Fetch all purchase items (+)
  const purchases = db
    .prepare(
      `
    SELECT p.date, pi.quantity, pi.rate
    FROM purchase_items pi
    JOIN purchases p ON pi.purchase_id = p.id
    WHERE pi.product_id = ?
    ORDER BY p.date ASC
  `
    )
    .all(productId);

  // 2. Fetch all GST sale items (-)
  const gstSales = db
    .prepare(
      `
    SELECT s.created_at as date, si.quantity, si.rate
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE si.product_id = ? AND s.is_quote = 0
    ORDER BY s.created_at ASC
  `
    )
    .all(productId);

  // 3. Fetch all NON-GST sale items (-)
  const nonGstSales = db
    .prepare(
      `
    SELECT s.created_at as date, si.quantity, si.rate
    FROM sales_items_non_gst si
    JOIN sales_non_gst s ON si.sale_id = s.id
    WHERE si.product_id = ?
    ORDER BY s.created_at ASC
  `
    )
    .all(productId);

  // 4. ✅ Fetch Stock Adjustments (+/-)
  const adjustments = db
    .prepare(
      `
    SELECT 
      created_at as date, 
      adjustment as quantity, -- This can be positive or negative
      reason,
      category
    FROM stock_adjustments
    WHERE product_id = ?
    ORDER BY created_at ASC
  `
    )
    .all(productId);

  // 5. Merge all transactions into one history and sort by date (Latest First)
  const history = [
    ...purchases.map((p) => ({
      date: p.date,
      type: "Purchase",
      quantity: `+${p.quantity}`,
    })),
    ...gstSales.map((s) => ({
      date: s.date,
      type: "Sale",
      quantity: `-${s.quantity}`,
    })),
    ...nonGstSales.map((s) => ({
      date: s.date,
      type: "Sale",
      quantity: `-${s.quantity}`,
    })),
    ...adjustments.map((a) => ({
      date: a.date,
      type: `Adjustment (${a.category})`,
      // Display explicitly with sign for clarity
      quantity: a.quantity > 0 ? `+${a.quantity}` : `${a.quantity}`,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)); // ✅ Descending Sort

  // 6. Calculate totals and discrepancies
  const totalPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalGstSold = gstSales.reduce((sum, s) => sum + s.quantity, 0);
  const totalNonGstSold = nonGstSales.reduce((sum, s) => sum + s.quantity, 0);

  // Net adjustment (sum of all +/- adjustments)
  const totalAdjusted = adjustments.reduce((sum, a) => sum + a.quantity, 0);

  const totalSold = totalGstSold + totalNonGstSold;

  // The "Expected" quantity is what the math says should be there
  // Purchases - Sales + (Net Adjustments)
  const expectedQuantity = totalPurchased - totalSold + totalAdjusted;

  // Discrepancy is the difference between what is currently in the DB field
  // and what the history math says should be there.
  // Ideally, this should be 0.
  const discrepancy = product.quantity - expectedQuantity;

  let unmarkedAdded = 0;
  let unmarkedRemoved = 0;

  if (discrepancy > 0) {
    unmarkedAdded = discrepancy;
  } else if (discrepancy < 0) {
    unmarkedRemoved = Math.abs(discrepancy);
  }

  return {
    productDetails: product,
    history,
    summary: {
      totalPurchased,
      totalSold,
      totalAdjusted,
      expectedQuantity,
      currentQuantity: product.quantity,
      unmarkedAdded,
      unmarkedRemoved,
    },
  };
}

export const updateProduct = (id, product) => {
  console.log("updating for product : ", id, "DATA ", product);

  db.prepare(
    `UPDATE products SET
      name = ?, product_code = ?, hsn = ?, gst_rate = ?, mrp = ?, mop = ?,
      category = ?, subcategory = ?, storage_location = ?, quantity = ?,
      description = ?, brand = ?, barcode = ?, image_url = ?,
      is_active = ?, updated_at = datetime('now'), average_purchase_price = ?, mfw_price=?, low_stock_threshold = ?, size = ?, weight=?
     WHERE id = ?`
  ).run(
    product.name,
    product.product_code,
    product.hsn,
    product.gst_rate,
    product.mrp,
    product.mop,
    product.category,
    product.subcategory,
    product.storage_location,
    product.quantity,
    product.description,
    product.brand,
    product.barcode,
    product.image_url,
    product.is_active ?? 1,
    product.average_purchase_price ?? 0,
    product.mfw_price,
    product.low_stock_threshold,
    product.size,
    product.weight,
    id
  );

  return getProductById(id);
};

// DELETE
export const deleteProduct = (id) => {
  // This query updates the product's status instead of deleting it.
  return db.prepare("UPDATE products SET is_active = 0 WHERE id = ?").run(id);
};

// UPDATE QUANTITY
export async function updateProductQuantity(productId, newQty) {
  const stmt = db.prepare(`UPDATE products SET quantity = ? WHERE id = ?`);
  const result = stmt.run(newQty, productId);
  return result.changes > 0;
}

export async function updateProductAveragePurchasePrice(
  productId,
  newAveragePurchasePrice
) {
  const stmt = db.prepare(
    `UPDATE products SET average_purchase_price = ? WHERE id = ?`
  );

  const result = stmt.run(newAveragePurchasePrice, productId);
  return result.changes > 0;
}

/**
 * Inserts multiple products, always generating a new, unique product_code and barcode
 * for each item and ensuring correct data types.
 * @param {Array<object>} products - An array of product objects to insert.
 * @returns {object} The result of the transaction.
 */
export function bulkInsertProducts(products) {
  const insertStmt = db.prepare(
    `INSERT INTO products (
      name, product_code, mrp, mop, gst_rate, quantity, hsn, brand,
      category, subcategory, average_purchase_price, storage_location, description, barcode, mfw_price, low_Stock_threshold, size, weight
    ) VALUES (
      @name, @product_code, @mrp, @mop, @gst_rate, @quantity, @hsn, @brand,
      @category, @subcategory, @average_purchase_price, @storage_location, @description, @barcode, @mfw_price, @low_stock_threshold, @size, @weight 
    )`
  );

  const getCategoryCodeStmt = db.prepare(
    "SELECT code FROM categories WHERE id = ?"
  );
  const getSubcategoryCodeStmt = db.prepare(
    "SELECT code FROM subcategories WHERE id = ?"
  );

  const insertMany = db.transaction((items) => {
    // Get the starting barcode number ONCE before the loop.
    let nextBarcode = getNextBarcode();

    for (const item of items) {
      // 1. ALWAYS generate a new Product Code.
      if (!item.category || !item.subcategory) {
        throw new Error(
          `Product "${item.name}" is missing a category or subcategory, so a code cannot be generated.`
        );
      }
      const category = getCategoryCodeStmt.get(item.category);
      const subcategory = getSubcategoryCodeStmt.get(item.subcategory);
      if (!category || !subcategory) {
        throw new Error(
          `Invalid category or subcategory ID for product "${item.name}".`
        );
      }
      item.product_code = getNextProductCode(category.code, subcategory.code);

      // 2. ALWAYS generate a new Barcode.
      item.barcode = String(nextBarcode++);

      // 3. ✅ DATA SANITIZATION: Enforce string types for text-like fields.
      // This is the crucial fix to prevent trailing ".0" on numbers.
      if (item.product_code != null)
        item.product_code = String(item.product_code);
      if (item.barcode != null) item.barcode = String(item.barcode);
      if (item.hsn != null) item.hsn = String(item.hsn);

      // 4. Set default values and insert the cleaned data.
      const productToInsert = {
        average_purchase_price: 0,
        hsn: null,
        brand: null,
        storage_location: null,
        description: null,
        ...item,
      };

      insertStmt.run(productToInsert);
    }
    return { changes: items.length };
  });

  try {
    return insertMany(products);
  } catch (error) {
    console.error("Database error in bulkInsertProducts:", error);
    throw new Error(`Could not bulk insert products. Reason: ${error.message}`);
  }
}

/**
 * @description Finds the highest numerical 8-digit barcode and returns the next sequential number.
 * @returns {number} The next available 8-digit barcode.
 */
export function getNextBarcode() {
  const stmt = db.prepare(
    "SELECT MAX(CAST(barcode AS INTEGER)) as lastBarcode FROM products"
  );
  const result = stmt.get();

  // If no barcodes exist, start from the first 8-digit number.
  // Otherwise, add 1 to the highest existing barcode.
  const nextBarcode =
    result && result.lastBarcode ? result.lastBarcode + 1 : 10000001;
  return nextBarcode;
}

/**
 * @description Generates the next sequential product code based on category and subcategory.
 * @param {string} categoryCode - The 3-digit code for the category.
 * @param {string} subcategoryCode - The 3-digit code for the subcategory.
 * @returns {string} The newly generated product code (e.g., "CAT_SUB_00001").
 */
export function getNextProductCode(categoryCode, subcategoryCode) {
  if (!categoryCode || !subcategoryCode) {
    throw new Error(
      "Category and subcategory codes are required to generate a product code."
    );
  }

  // Construct the prefix and the search pattern for the SQL query
  const prefix = `${categoryCode}_${subcategoryCode}_`;
  const likePattern = `${prefix}%`;

  // Find the highest number ONLY for products with the same prefix
  const stmt = db.prepare(
    `SELECT MAX(CAST(REPLACE(product_code, ?, '') AS INTEGER)) as lastNum
     FROM products
     WHERE product_code LIKE ?`
  );

  const result = stmt.get(prefix, likePattern);

  // If no products with this prefix exist, start from 1. Otherwise, increment.
  const nextNum = result && result.lastNum ? result.lastNum + 1 : 1;

  // Pad the sequential number to 5 digits with leading zeros
  const paddedNum = String(nextNum).padStart(5, "0");

  return `${prefix}${paddedNum}`;
}

/**
 * Gets a list of all active products that are at or below their low stock threshold.
 */
export function getLowStockProducts() {
  return db
    .prepare(
      `
    SELECT id, name, product_code, quantity, low_stock_threshold, image_url
    FROM products
    WHERE 
      is_active = 1
      AND low_stock_threshold > 0
      AND quantity <= low_stock_threshold
    ORDER BY
      (quantity - low_stock_threshold) ASC -- Show most critical items first
  `
    )
    .all();
}

/**
 * Gets just the count of low stock items for the notification badge.
 */
export function getLowStockCount() {
  return db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM products
    WHERE 
      is_active = 1
      AND low_stock_threshold > 0
      AND quantity <= low_stock_threshold
  `
    )
    .get();
}

/**
 * @description Fetches a paginated list of products for the mobile view,
 * including ALL database fields and joined category names.
 */
export function getProductsForMobile(options) {
  const {
    page = 1,
    limit = 20,
    query = "",
    category = null,
    subcategory = null,
    isActive = 1,
  } = options;

  const offset = (page - 1) * limit;
  const params = [];

  // --- Build WHERE clause dynamically ---
  const whereClauses = ["p.is_active = ?"];
  params.push(isActive);

  if (query) {
    whereClauses.push(
      "(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)"
    );
    const likeQuery = `%${query}%`;
    params.push(likeQuery, likeQuery, likeQuery);
  }

  if (subcategory) {
    whereClauses.push("p.subcategory = ?");
    params.push(subcategory);
  } else if (category) {
    whereClauses.push("p.category = ?");
    params.push(category);
  }

  const whereSql = whereClauses.join(" AND ");

  // --- Main Query (Updated to fetch * everything) ---
  const records = db
    .prepare(
      `
    SELECT
      p.*, -- ✅ Select ALL columns from the product table
      c.name as category_name,       -- ✅ Get Category Name
      sc.name as subcategory_name    -- ✅ Get Subcategory Name
    FROM products p
    LEFT JOIN categories c ON p.category = c.id
    LEFT JOIN subcategories sc ON p.subcategory = sc.id
    WHERE ${whereSql}
    ORDER BY p.name ASC
    LIMIT ? OFFSET ?
  `
    )
    .all(...params, limit, offset);

  // --- Count Query ---
  const totalRecords = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM products p
    WHERE ${whereSql}
  `
    )
    .get(...params).count;

  return { records, totalRecords };
}
