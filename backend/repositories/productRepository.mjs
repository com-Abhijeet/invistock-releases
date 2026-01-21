import db from "../db/db.mjs";

// --- Helper: Get ID or Create New Category/Subcategory ---
function resolveEntity(db, table, identifier, parentId = null) {
  if (!identifier) return null;
  if (typeof identifier === "number") return identifier;

  // It's a string (Name). Check if it exists.
  let stmt;
  if (table === "subcategories") {
    stmt = db.prepare(
      `SELECT id, code FROM ${table} WHERE name = ? AND category_id = ?`,
    );
  } else {
    stmt = db.prepare(`SELECT id, code FROM ${table} WHERE name = ?`);
  }

  const existing =
    table === "subcategories"
      ? stmt.get(identifier, parentId)
      : stmt.get(identifier);
  if (existing) return existing.id;

  // Not found. Create it.
  // Generate a simple unique code: First 3 chars of name + random suffix
  const prefix = identifier
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, "X");
  const uniqueCode = `${prefix}${Math.floor(100 + Math.random() * 900)}`;

  let insertStmt;
  let info;

  if (table === "subcategories") {
    insertStmt = db.prepare(
      `INSERT INTO subcategories (name, code, category_id) VALUES (?, ?, ?)`,
    );
    info = insertStmt.run(identifier, uniqueCode, parentId);
  } else {
    insertStmt = db.prepare(
      `INSERT INTO categories (name, code) VALUES (?, ?)`,
    );
    info = insertStmt.run(identifier, uniqueCode);
  }

  return info.lastInsertRowid;
}

// --- Helper: Get Code for ID ---
function getCodeById(db, table, id) {
  if (!id) return "GEN";
  const res = db.prepare(`SELECT code FROM ${table} WHERE id = ?`).get(id);
  return res ? res.code : "GEN";
}

// --- Helper: Generate Product Code Internally ---
function generateInternalProductCode(db, catId, subId) {
  const catCode = getCodeById(db, "categories", catId);
  const subCode = getCodeById(db, "subcategories", subId);

  const prefix = `${catCode}_${subCode}_`;
  const likePattern = `${prefix}%`;

  const stmt = db.prepare(
    `SELECT MAX(CAST(REPLACE(product_code, ?, '') AS INTEGER)) as lastNum
     FROM products
     WHERE product_code LIKE ?`,
  );
  const result = stmt.get(prefix, likePattern);
  const nextNum = result && result.lastNum ? result.lastNum + 1 : 1;
  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

// CREATE
export const createProduct = (product) => {
  // If product_code is provided and we aren't creating dynamic cats, check existence
  if (
    typeof product.category === "number" &&
    typeof product.subcategory === "number" &&
    product.product_code
  ) {
    const codeExists = db
      .prepare("SELECT id FROM products WHERE product_code = ?")
      .get(product.product_code);
    if (codeExists) throw new Error("Product code already exists");
  }

  const insertProduct = db.transaction(() => {
    // 1. Resolve Category (Find or Create)
    const categoryId = resolveEntity(db, "categories", product.category);

    // 2. Resolve Subcategory (Find or Create)
    // Note: Subcategories require a parent category ID
    const subcategoryId = resolveEntity(
      db,
      "subcategories",
      product.subcategory,
      categoryId,
    );

    if (!categoryId || !subcategoryId) {
      // If standard flow failed (shouldn't happen with create logic)
      // throw new Error("Failed to resolve category/subcategory");
    }

    // 3. Logic for Product Code
    // If we created new categories, the frontend's product_code (if any) is invalid/dummy.
    // We MUST regenerate it here.
    let finalProductCode = product.product_code;

    // If input was string OR code is missing/placeholder, regenerate
    if (
      typeof product.category === "string" ||
      typeof product.subcategory === "string" ||
      !finalProductCode ||
      finalProductCode === "Generating..."
    ) {
      finalProductCode = generateInternalProductCode(
        db,
        categoryId,
        subcategoryId,
      );
    }

    // Double check uniqueness of final code to be safe
    const check = db
      .prepare("SELECT id FROM products WHERE product_code = ?")
      .get(finalProductCode);
    if (check) {
      // Collision fallback (rare in sequential, but possible in race conditions)
      finalProductCode = finalProductCode + "_1";
    }

    const stmt = db.prepare(
      `INSERT INTO products (
        name, product_code, hsn, gst_rate, mrp, mop, category, subcategory,
        storage_location, quantity, description, brand, barcode,
        image_url, is_active, average_purchase_price, mfw_price, low_Stock_threshold, size, weight,
        tracking_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const info = stmt.run(
      product.name,
      finalProductCode,
      product.hsn,
      product.gst_rate,
      product.mrp,
      product.mop,
      categoryId,
      subcategoryId,
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
      product.weight,
      product.tracking_type || "none",
    );
    return {
      id: info.lastInsertRowid,
      ...product,
      product_code: finalProductCode,
      category: categoryId,
      subcategory: subcategoryId,
    };
  });

  return insertProduct();
};

export const updateProduct = (id, product) => {
  const transaction = db.transaction(() => {
    // 1. Resolve Categories in case they are edited to new ones
    const categoryId = resolveEntity(db, "categories", product.category);
    const subcategoryId = resolveEntity(
      db,
      "subcategories",
      product.subcategory,
      categoryId,
    );

    // 2. Update
    db.prepare(
      `UPDATE products SET
        name = ?, product_code = ?, hsn = ?, gst_rate = ?, mrp = ?, mop = ?,
        category = ?, subcategory = ?, storage_location = ?, quantity = ?,
        description = ?, brand = ?, barcode = ?, image_url = ?,
        is_active = ?, updated_at = datetime('now'), average_purchase_price = ?, mfw_price=?, low_stock_threshold = ?, size = ?, weight=?,
        tracking_type = ?
       WHERE id = ?`,
    ).run(
      product.name,
      product.product_code,
      product.hsn,
      product.gst_rate,
      product.mrp,
      product.mop,
      categoryId,
      subcategoryId,
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
      product.tracking_type || "none",
      id,
    );

    return getProductById(id);
  });

  return transaction();
};

/**
 * @description Fetches products from the database with pagination, searching, and status filtering.
 */
export function getAllProducts(options) {
  const { page = 1, limit = 10, query = "", isActive, all } = options;

  try {
    const params = [];
    let whereClauses = [];

    if (query) {
      whereClauses.push(
        `(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)`,
      );
      const searchQuery = `%${query}%`;
      params.push(searchQuery, searchQuery, searchQuery);
    }

    if (!all) {
      whereClauses.push(`p.is_active = ?`);
      params.push(isActive);
    }

    const whereStatement =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const orderByStatement = all
      ? "ORDER BY p.is_active DESC, p.name ASC"
      : "ORDER BY p.name ASC";

    const offset = (page - 1) * limit;
    const limitStatement = all ? "" : "LIMIT ? OFFSET ?";

    const mainQuery = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category = c.id
      ${whereStatement}
      ${orderByStatement}
      ${limitStatement}
    `;

    const countQuery = `SELECT COUNT(*) as totalRecords FROM products p ${whereStatement}`;

    const countStmt = db.prepare(countQuery);
    const { totalRecords } = countStmt.get(...params);

    const mainStmt = db.prepare(mainQuery);
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
 * @description Retrieves a single product record by its ID.
 */
export const getProductById = (id) => {
  return db
    .prepare(
      `
      SELECT 
        p.*,
        cat.name AS category_name,
        subcat.name AS subcategory_name,
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
    `,
    )
    .get(id);
};

export function getProductHistory(productId) {
  const product = db
    .prepare(
      `
      SELECT 
        p.*,
        c.name as category_name,
        sc.name as subcategory_name
      FROM products p
      LEFT JOIN categories c ON p.category = c.id
      LEFT JOIN subcategories sc ON p.subcategory = sc.id
      WHERE p.id = ?
    `,
    )
    .get(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  const purchases = db
    .prepare(
      `
    SELECT p.date, pi.quantity, pi.rate
    FROM purchase_items pi
    JOIN purchases p ON pi.purchase_id = p.id
    WHERE pi.product_id = ?
    ORDER BY p.date ASC
  `,
    )
    .all(productId);

  const gstSales = db
    .prepare(
      `
    SELECT s.created_at as date, si.quantity, si.rate
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE si.product_id = ? AND s.is_quote = 0
    ORDER BY s.created_at ASC
  `,
    )
    .all(productId);

  const adjustments = db
    .prepare(
      `
    SELECT 
      created_at as date, 
      adjustment as quantity,
      reason,
      category
    FROM stock_adjustments
    WHERE product_id = ?
    ORDER BY created_at ASC
  `,
    )
    .all(productId);

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
    ...adjustments.map((a) => ({
      date: a.date,
      type: `Adjustment (${a.category})`,
      quantity: a.quantity > 0 ? `+${a.quantity}` : `${a.quantity}`,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalGstSold = gstSales.reduce((sum, s) => sum + s.quantity, 0);
  const totalAdjusted = adjustments.reduce((sum, a) => sum + a.quantity, 0);
  const totalSold = totalGstSold;
  const expectedQuantity = totalPurchased - totalSold + totalAdjusted;
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

export const deleteProduct = (id) => {
  return db.prepare("UPDATE products SET is_active = 0 WHERE id = ?").run(id);
};

export async function updateProductQuantity(productId, newQty) {
  const stmt = db.prepare(`UPDATE products SET quantity = ? WHERE id = ?`);
  const result = stmt.run(newQty, productId);
  return result.changes > 0;
}

export async function updateProductAveragePurchasePrice(
  productId,
  newAveragePurchasePrice,
) {
  const stmt = db.prepare(
    `UPDATE products SET average_purchase_price = ? WHERE id = ?`,
  );

  const result = stmt.run(newAveragePurchasePrice, productId);
  return result.changes > 0;
}

export function bulkInsertProducts(products) {
  const insertStmt = db.prepare(
    `INSERT INTO products (
      name, product_code, mrp, mop, gst_rate, quantity, hsn, brand,
      category, subcategory, average_purchase_price, storage_location, description, barcode, mfw_price, low_Stock_threshold, size, weight,
      tracking_type
    ) VALUES (
      @name, @product_code, @mrp, @mop, @gst_rate, @quantity, @hsn, @brand,
      @category, @subcategory, @average_purchase_price, @storage_location, @description, @barcode, @mfw_price, @low_stock_threshold, @size, @weight,
      @tracking_type
    )`,
  );

  const getCategoryCodeStmt = db.prepare(
    "SELECT code FROM categories WHERE id = ?",
  );
  const getSubcategoryCodeStmt = db.prepare(
    "SELECT code FROM subcategories WHERE id = ?",
  );

  const insertMany = db.transaction((items) => {
    let nextBarcode = getNextBarcode();

    for (const item of items) {
      if (!item.category || !item.subcategory) {
        throw new Error(
          `Product "${item.name}" is missing a category or subcategory.`,
        );
      }
      const category = getCategoryCodeStmt.get(item.category);
      const subcategory = getSubcategoryCodeStmt.get(item.subcategory);
      if (!category || !subcategory) {
        throw new Error(
          `Invalid category or subcategory ID for product "${item.name}".`,
        );
      }
      item.product_code = getNextProductCode(category.code, subcategory.code);
      item.barcode = String(nextBarcode++);

      if (item.product_code != null)
        item.product_code = String(item.product_code);
      if (item.barcode != null) item.barcode = String(item.barcode);
      if (item.hsn != null) item.hsn = String(item.hsn);

      const productToInsert = {
        average_purchase_price: 0,
        hsn: null,
        brand: null,
        storage_location: null,
        description: null,
        tracking_type: "none",
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

export function getNextBarcode() {
  try {
    const stmt = db.prepare(
      "SELECT MAX(CAST(barcode AS INTEGER)) as lastBarcode FROM products",
    );
    const result = stmt.get();
    const nextBarcode =
      result && result.lastBarcode ? result.lastBarcode + 1 : 10000001;
    return nextBarcode;
  } catch (error) {
    throw new Error("[BACKEND] - Error in getting barcode value");
  }
}

export function getNextProductCode(categoryCode, subcategoryCode) {
  if (!categoryCode || !subcategoryCode) {
    throw new Error("Category and subcategory codes are required.");
  }
  const prefix = `${categoryCode}_${subcategoryCode}_`;
  const likePattern = `${prefix}%`;
  const stmt = db.prepare(
    `SELECT MAX(CAST(REPLACE(product_code, ?, '') AS INTEGER)) as lastNum
     FROM products
     WHERE product_code LIKE ?`,
  );
  const result = stmt.get(prefix, likePattern);
  const nextNum = result && result.lastNum ? result.lastNum + 1 : 1;
  const paddedNum = String(nextNum).padStart(5, "0");
  return `${prefix}${paddedNum}`;
}

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
      (quantity - low_stock_threshold) ASC
  `,
    )
    .all();
}

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
  `,
    )
    .get();
}

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
  const whereClauses = ["p.is_active = ?"];
  params.push(isActive);

  if (query) {
    whereClauses.push(
      "(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)",
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

  const records = db
    .prepare(
      `
    SELECT
      p.*,
      c.name as category_name,
      sc.name as subcategory_name
    FROM products p
    LEFT JOIN categories c ON p.category = c.id
    LEFT JOIN subcategories sc ON p.subcategory = sc.id
    WHERE ${whereSql}
    ORDER BY p.name ASC
    LIMIT ? OFFSET ?
  `,
    )
    .all(...params, limit, offset);

  const totalRecords = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM products p
    WHERE ${whereSql}
  `,
    )
    .get(...params).count;

  return { records, totalRecords };
}
