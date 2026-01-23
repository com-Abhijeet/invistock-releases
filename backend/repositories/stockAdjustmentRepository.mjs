import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";

/**
 * Creates a log entry for a stock adjustment.
 */
export function createAdjustmentLog(data) {
  const stmt = db.prepare(`
    INSERT INTO stock_adjustments (
      product_id, category, old_quantity, new_quantity, adjustment, reason, adjusted_by, batch_id, serial_id
    ) VALUES (
      @product_id, @category, @old_quantity, @new_quantity, @adjustment, @reason, @adjusted_by, @batch_id, @serial_id
    )
  `);
  return stmt.run(data);
}

/**
 * Fetches adjustments with filters (date, category).
 */
export function getAdjustments(filters) {
  // Pass 'alias: "sa"' to specify we want the adjustment date, not the product date
  const { where, params } = getDateFilter({ ...filters, alias: "sa" });

  const query = `
    SELECT 
      sa.*, 
      p.name as product_name, 
      p.product_code,
      pb.batch_number,
      ps.serial_number
    FROM stock_adjustments sa
    JOIN products p ON sa.product_id = p.id
    LEFT JOIN product_batches pb ON sa.batch_id = pb.id
    LEFT JOIN product_serials ps ON sa.serial_id = ps.id
    WHERE ${where}
    ORDER BY sa.created_at DESC
  `;

  return db.prepare(query).all(...params);
}

/**
 * Aggregates adjustment stats by category.
 */
export function getAdjustmentStats(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "sa" });

  // 1. Total Net Adjustment Quantity
  const totalQty =
    db
      .prepare(
        `
    SELECT SUM(adjustment) as total 
    FROM stock_adjustments sa
    WHERE ${where}
  `,
      )
      .get(...params).total || 0;

  // 2. Breakdown by Category
  const breakdown = db
    .prepare(
      `
    SELECT 
      category, 
      COUNT(*) as count, 
      SUM(adjustment) as quantity_change
    FROM stock_adjustments sa
    WHERE ${where}
    GROUP BY category
    ORDER BY quantity_change ASC
  `,
    )
    .all(...params);

  return { totalQty, breakdown };
}

/**
 * Fetches adjustments specifically for a single product.
 */
export function getAdjustmentsByProductId(productId) {
  return db
    .prepare(
      `
    SELECT * FROM stock_adjustments 
    WHERE product_id = ? 
    ORDER BY created_at DESC
  `,
    )
    .all(productId);
}
