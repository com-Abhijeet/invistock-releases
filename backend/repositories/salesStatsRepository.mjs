import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";

// 🔹 Sales Trend
export function getSalesTrend({ filter, start_date, end_date }) {
  const { where, params } = getDateFilter({
    filter,
    from: start_date,
    to: end_date,
    alias: "s",
  });

  const totalStmt = db.prepare(`
    SELECT
      SUM(total_amount) AS total_amount,
      SUM(paid_amount) AS paid_amount
    FROM sales s
    WHERE ${where} AND s.status IN ('paid', 'pending')
  `);

  const monthlyStmt = db.prepare(`
    SELECT
      ${
        filter === "month"
          ? "date(s.created_at)"
          : "strftime('%Y-%m', s.created_at)"
      } AS period,
      SUM(total_amount) AS total
    FROM sales s
    WHERE ${where} AND s.status IN ('paid', 'pending')
    GROUP BY period
    ORDER BY period
  `);

  const totals = totalStmt.get(...params);
  const monthly = monthlyStmt.all(...params);

  return {
    ...totals,
    unpaid_amount: (totals.total_amount || 0) - (totals.paid_amount || 0),
    monthly,
  };
}

// 🔹 Financial Metrics
export function getFinancialMetrics(filters) {
  const { where, params } = getDateFilter(filters);
  const stmt = db.prepare(`
    SELECT
      SUM(total_amount) AS totalSales,
      SUM(paid_amount) AS totalPaid,
      COUNT(*) AS saleCount
    FROM sales WHERE ${where} AND status IN ('paid', 'pending')
  `);
  const row = stmt.get(...params);
  return {
    totalSales: row.totalSales || 0,
    totalPaid: row.totalPaid || 0,
    outstanding: (row.totalSales || 0) - (row.totalPaid || 0),
    avgSale: row.saleCount ? row.totalSales / row.saleCount : 0,
  };
}

// 🔹 Order Metrics
export function getOrderMetrics(filters) {
  const { where, params } = getDateFilter(filters);
  const stmt = db.prepare(`
    SELECT
      COUNT(*) AS salesCount,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidCount,
      COUNT(DISTINCT customer_id) AS uniqueCustomers
    FROM sales WHERE ${where} AND status IN ('paid', 'pending')
  `);
  const row = stmt.get(...params);

  // Repeat customers: customers with > 1 sale
  const repeatStmt = db.prepare(`
    SELECT COUNT(*) AS repeatCustomers
    FROM (SELECT customer_id, COUNT(*) as cnt FROM sales WHERE ${where} AND status IN ('paid', 'pending') GROUP BY customer_id HAVING cnt > 1)
  `);
  const repeat = repeatStmt.get(...params);

  return {
    salesCount: row.salesCount || 0,
    pendingCount: row.pendingCount || 0,
    paidPercentage: row.salesCount
      ? Math.round((row.paidCount / row.salesCount) * 100)
      : 0,
    repeatCustomers: repeat.repeatCustomers || 0,
  };
}

// 🔹 Top Customers
export function getTopCustomers({ limit = 5, ...filters }) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });
  const stmt = db.prepare(`
    SELECT c.name, SUM(s.total_amount) AS sales
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE ${where} AND s.status IN ('paid', 'pending')
    GROUP BY c.id
    ORDER BY sales DESC
    LIMIT ?
  `);
  return stmt.all(...params, limit);
}

// 🔹 Top Products (no change needed)
export function getTopProducts({ limit = 5, ...filters }) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });
  const stmt = db.prepare(`
    SELECT p.name, SUM(si.quantity) AS qty, SUM(si.price) AS revenue
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY revenue DESC
    LIMIT ?
  `);
  return stmt.all(...params, limit);
}

// 🔹 Category Revenue
export function getCategoryRevenue(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });

  const stmt = db.prepare(`
    SELECT
      COALESCE(cat.name, 'Uncategorized') AS category_name,
      SUM(si.price) AS total_revenue
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories cat ON p.category = cat.id
    WHERE ${where} AND s.status IN ('paid', 'pending')
    GROUP BY cat.id
    ORDER BY total_revenue DESC
  `);

  return stmt.all(...params);
}

// 🔹 Payment Mode Breakdown
export function getPaymentModeBreakdown(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });
  const totalStmt = db.prepare(
    `SELECT SUM(paid_amount) AS total FROM sales WHERE ${where} AND status IN ('paid', 'pending')`,
  );
  const total = totalStmt.get(...params)?.total || 0;

  const stmt = db.prepare(`
    SELECT payment_mode AS mode, SUM(paid_amount) AS amount
    FROM sales
    WHERE ${where} AND status IN ('paid', 'pending')
    GROUP BY payment_mode
  `);

  return stmt.all(...params).map((row) => ({
    ...row,
    percentage: total ? Math.round((row.amount / total) * 100) : 0,
  }));
}

// 🔹 Credit Sales
export function getCreditSales(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });
  const stmt = db.prepare(`
    SELECT SUM(total_amount - paid_amount) AS creditOutstanding
    FROM sales
    WHERE ${where} AND status IN ('paid', 'pending') AND (payment_mode = 'credit' OR status = 'pending')
  `);
  return stmt.get(...params)?.creditOutstanding || 0;
}

// 🔹 Best Sales Day
export function getBestSalesDay(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });
  const stmt = db.prepare(`
    SELECT date(created_at) AS date, SUM(total_amount) AS revenue
    FROM sales
    WHERE ${where} AND status IN ('paid', 'pending')
    GROUP BY date
    ORDER BY revenue DESC
    LIMIT 1
  `);
  return stmt.get(...params) || {};
}

// 🔹 Sales Table (Paginated with Search)
export function getSalesTable({ page = 1, limit = 20, ...filters }) {
  // 1. Destructure the query from the rest of the filters
  const { query, ...dateFilters } = filters;

  // 2. Get the base filter for dates
  const { where: dateWhere, params: dateParams } = getDateFilter({
    ...dateFilters,
    alias: "s",
  });

  // 3. Build the final WHERE clause and parameters dynamically
  const whereClauses = [dateWhere];
  const params = [...dateParams];

  if (query && query.trim() !== "") {
    // Add the search condition if a query is provided
    whereClauses.push(`(s.reference_no LIKE ? OR c.name LIKE ?)`);
    const searchQuery = `%${query.trim()}%`;
    params.push(searchQuery, searchQuery);
  }

  const finalWhere = whereClauses.join(" AND ");
  const offset = (page - 1) * limit;

  // 4. Execute the main query with the combined filters
  const records = db
    .prepare(
      `
    SELECT
      s.id AS id,
      s.reference_no as reference,
      c.id AS customer_id,
      c.name AS customer,
      s.total_amount AS total,
      s.paid_amount AS paid_amount,
      s.payment_mode AS payment_mode,
      s.is_quote AS is_quote,
      s.status AS status,
      s.created_at AS created_at
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE ${finalWhere}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `,
    )
    .all(...params, limit, offset);

  // 5. Execute the count query with the same combined filters
  const totalRecords = db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE ${finalWhere}
  `,
    )
    .get(...params).count;

  return { records, totalRecords };
}

/* --------------------------- INVENTORY DASHBOARD STATS --------------------------- */
/* ---------- CATEGORY AND SUB CATEGORY WISE PRODUCT STATS ---------- */
export function getSalesByCategoryAndSubcategory(filters = {}) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });

  // Step 1: Fetch subcategory-level sales with disambiguated JOIN aliases
  const stmt = db.prepare(`
    SELECT
      cat.name AS category,
      subcat.name AS subcategory,
      SUM(si.price) AS subcategory_sales
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories AS cat ON p.category = cat.id
    LEFT JOIN subcategories AS subcat ON p.subcategory = subcat.id
    WHERE ${where} AND s.status IN ('paid', 'pending')
    GROUP BY cat.id, subcat.id
    ORDER BY cat.name ASC, subcategory_sales DESC
  `);

  const flatData = stmt.all(...params);

  // Step 2: Group and reshape to nested structure
  const grouped = {};

  for (const item of flatData) {
    const category = item.category || "Uncategorized";
    const subcategory = item.subcategory;
    const subcategory_sales = item.subcategory_sales || 0;

    if (!grouped[category]) {
      grouped[category] = {
        category_sales: 0,
        subcategories: [],
      };
    }

    if (subcategory) {
      grouped[category].subcategories.push({
        subcategory,
        subcategory_sales,
      });
      grouped[category].category_sales += subcategory_sales;
    }
  }

  // Step 3: Convert to array format
  return Object.entries(grouped).map(([category, data]) => ({
    category,
    category_sales: data.category_sales,
    subcategories: data.subcategories,
  }));
}

/* ---------- FAST MOVING PRODUCTS ---------- */
export function getFastMovingProducts({ limit = 10, ...filters }) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });

  const stmt = db.prepare(`
    SELECT
      p.name,
      SUM(si.quantity) AS qty_sold,
      SUM(si.price) AS revenue
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY qty_sold DESC
    LIMIT ?
  `);

  return stmt.all(...params, limit);
}

/* ---------------------- SLOW MOVING PRODUCTS ---------------------- */
export function getSlowMovingProducts({ limit = 10, ...filters }) {
  const { where, params } = getDateFilter({ ...filters, alias: "s" });

  const stmt = db.prepare(`
    SELECT
      p.name,
      p.quantity AS current_stock,
      SUM(si.quantity) AS qty_sold,
      SUM(si.price) AS revenue
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE ${where}
    GROUP BY p.id
    HAVING qty_sold < 5 AND current_stock > 0
    ORDER BY qty_sold ASC
    LIMIT ?
  `);

  return stmt.all(...params, limit);
}

/* ---------------------- TOTAL STOCK AGGREGATED BY CATEGORY AND SUBCATEGORY ---------------------- */
export function getTotalStockSummary() {
  // Overall total
  const overall = db
    .prepare(
      `
    SELECT
      SUM(quantity) AS total_quantity,
      SUM(quantity * mrp) AS total_value
    FROM products
  `,
    )
    .get();

  // By category
  const byCategory = db
    .prepare(
      `
    SELECT
      c.name AS category,
      SUM(p.quantity) AS total_quantity,
      SUM(p.quantity * p.mrp) AS total_value
    FROM products p
    LEFT JOIN categories c ON p.category = c.id
    GROUP BY c.id
    ORDER BY total_value DESC
  `,
    )
    .all();

  // By subcategory
  const bySubcategory = db
    .prepare(
      `
    SELECT
      sc.name AS subcategory,
      SUM(p.quantity) AS total_quantity,
      SUM(p.quantity * p.mrp) AS total_value
    FROM products p
    LEFT JOIN categories sc ON p.subcategory = sc.id
    GROUP BY sc.id
    ORDER BY total_value DESC
  `,
    )
    .all();

  return {
    overall,
    byCategory,
    bySubcategory,
  };
}

/**
 * @description Retrieves key performance indicators (KPIs) for a specific customer's sales.
 * @param {number} customerId - The ID of the customer.
 * @returns {object} An object containing customer sales KPIs.
 * @throws {Error} If fetching customer KPIs fails.
 */
export function getCustomerSalesKpi(customerId) {
  try {
    const stmt = db.prepare(`
      SELECT
        SUM(s.total_amount) AS total_purchase,
        AVG(s.total_amount) AS avg_purchase_price,
        COUNT(s.id) AS total_times_purchased,
        (
          SELECT p.name
          FROM sales_items si
          JOIN products p ON si.product_id = p.id
          JOIN sales s_inner ON si.sale_id = s_inner.id
          WHERE s_inner.customer_id = ?
          GROUP BY p.id
          ORDER BY SUM(si.quantity) DESC
          LIMIT 1
        ) AS frequently_purchased_item
      FROM sales s
      WHERE s.customer_id = ?
    `);

    const result = stmt.get(customerId, customerId);

    // Handle cases where no sales are found for the customer
    if (!result || !result.total_purchase) {
      return {
        total_purchase: 0,
        avg_purchase_price: 0,
        total_times_purchased: 0,
        frequently_purchased_item: "N/A",
      };
    }

    return {
      total_purchase: result.total_purchase,
      avg_purchase_price: result.avg_purchase_price,
      total_times_purchased: result.total_times_purchased,
      frequently_purchased_item: result.frequently_purchased_item || "N/A",
    };
  } catch (error) {
    console.error("Error in getCustomerSalesKpi:", error.message);
    throw new Error("Failed to fetch customer sales KPIs: " + error.message);
  }
}
