import { nonGstDb as db } from "../db/db.mjs";
import { buildInsertQuery, buildUpdateQuery } from "../utils/dbUtils.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";

/**
 * Creates a new non-GST sale.
 * @param {object} saleData - Data for the new sale.
 * @returns {number} The ID of the newly created sale.
 */
export function createNonGstSale(saleData) {
  const { sql } = buildInsertQuery("sales_non_gst", saleData);
  const info = db.prepare(sql).run(saleData);
  return info.lastInsertRowid;
}

/**
 * Creates a new non-GST sale item.
 * @param {object} itemData - Data for the new sale item.
 */
export function createNonGstSaleItem(itemData) {
  const { sql } = buildInsertQuery("sales_items_non_gst", itemData);
  db.prepare(sql).run(itemData);
}

/**
 * Updates an existing non-GST sale.
 * @param {number} id - The ID of the sale to update.
 * @param {object} saleData - An object with the fields to update.
 */
export function updateNonGstSale(id, saleData) {
  const { sql } = buildUpdateQuery("sales_non_gst", saleData, "id");
  db.prepare(sql).run({ ...saleData, id });
}

/**
 * Retrieves a non-GST sale and its items by ID.
 * Decoupled: Fetches directly from non-gst tables without Joins.
 * @param {number} saleId - The ID of the non-GST sale.
 * @returns {object} The sale object with a nested 'items' array.
 */
export function getNonGstSaleWithItemsById(saleId) {
  const sale = db
    .prepare(
      `
    SELECT *
    FROM sales_non_gst
    WHERE id = ?
  `
    )
    .get(saleId);

  if (!sale) return undefined;

  const items = db
    .prepare(
      `
    SELECT *
    FROM sales_items_non_gst
    WHERE sale_id = ?
    ORDER BY sr_no ASC
  `
    )
    .all(saleId);

  return { ...sale, items };
}

/**
 * Fetches a paginated and searchable list of non-GST sales.
 * Decoupled: Searches customer_name directly in sales_non_gst.
 */
export function getPaginatedNonGstSales({ page = 1, limit = 20, query = "" }) {
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const whereClauses = [];
  const params = [];

  if (query && query.trim() !== "") {
    whereClauses.push(`(reference_no LIKE ? OR customer_name LIKE ?)`);
    const searchQuery = `%${query.trim()}%`;
    params.push(searchQuery, searchQuery);
  }

  const where =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Fetch paginated sales data
  const records = db
    .prepare(
      `
    SELECT
      id,
      reference_no as reference,
      customer_name as customer,
      total_amount as total,
      paid_amount,
      payment_mode,
      status,
      created_at
    FROM sales_non_gst
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
    )
    .all(...params, limit, offset);

  // Fetch total record count
  const totalRecords = db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM sales_non_gst
    ${where}
  `
    )
    .get(...params).count;

  return { records, totalRecords };
}

/**
 * Fetches all non-GST sales and their items for PDF export within a date range.
 * Decoupled: No Joins.
 */
export function getNonGstSalesForPDFExport(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });

  // 1. Fetch all parent sales
  const sales = db
    .prepare(
      `
    SELECT *
    FROM sales_non_gst s
    WHERE ${where}
    ORDER BY s.created_at ASC
  `
    )
    .all(...params);

  if (sales.length === 0) {
    return [];
  }

  // 2. Fetch items for each sale
  const itemsStmt = db.prepare(`
    SELECT *
    FROM sales_items_non_gst
    WHERE sale_id = ?
    ORDER BY sr_no ASC
  `);

  return sales.map((sale) => ({
    ...sale,
    items: itemsStmt.all(sale.id),
  }));
}

/**
 * Fetches an itemized (flat) list of all non-GST sale items for Excel export.
 * Decoupled: No Joins.
 */
export function getNonGstSaleItemsForExport(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });

  return db
    .prepare(
      `
    SELECT
      s.created_at,
      s.reference_no,
      s.customer_name,
      si.product_name,
      si.quantity,
      si.rate,
      si.discount,
      si.price
    FROM sales_items_non_gst si
    JOIN sales_non_gst s ON si.sale_id = s.id
    WHERE ${where}
    ORDER BY s.created_at ASC
  `
    )
    .all(...params);
}

/**
 * Fetches all unique product names from the sales items table for autocomplete suggestions.
 */
export function getUniqueProductNames() {
  const result = db
    .prepare(
      `
    SELECT DISTINCT product_name
    FROM sales_items_non_gst
    WHERE product_name IS NOT NULL AND product_name != ''
    ORDER BY product_name ASC
  `
    )
    .all();

  return result.map((row) => row.product_name);
}
