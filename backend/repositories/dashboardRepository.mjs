import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";

/**
 * The Mega-Query function for the dashboard.
 * Decoupled: Only fetches GST-compliant sales statistics.
 */
export function getDashboardStats(filters) {
  const { where: sWhere, params: sParams } = getDateFilter({
    ...filters,
    alias: "s",
  });
  const { where: tWhere, params: tParams } = getDateFilter({
    ...filters,
    alias: "t",
  });
  const { where: eWhere, params: eParams } = getDateFilter({
    ...filters,
    alias: "e",
  }); // Filter for expenses table

  // --------------------------------------------------------------------------
  // 1. FINANCIALS: Sales, COGS, and Gross Profit
  // --------------------------------------------------------------------------
  // REMOVED: sales_non_gst UNION
  const profitQuery = `
    SELECT 
      SUM(si.quantity * si.rate) as revenue,
      SUM(si.quantity * pr.average_purchase_price) as cogs
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products pr ON si.product_id = pr.id
    WHERE s.is_quote = 0 AND ${sWhere}
  `;

  const profitData = db
    .prepare(
      `SELECT SUM(revenue) as revenue, SUM(cogs) as cogs FROM (${profitQuery})`
    )
    .get(...sParams);

  const totalRevenue = profitData.revenue || 0;
  const totalCOGS = profitData.cogs || 0;
  const grossProfit = totalRevenue - totalCOGS;

  // --------------------------------------------------------------------------
  // 2. OPERATIONAL COSTS (Expenses)
  // --------------------------------------------------------------------------
  // Now querying the dedicated 'expenses' table
  const expenses = db
    .prepare(
      `
    SELECT SUM(amount) as total 
    FROM expenses e
    WHERE ${eWhere.replace(/created_at/g, "date")}
  `
    )
    .get(...eParams);

  const totalOperationalExpenses = expenses.total || 0;
  const netProfit = grossProfit - totalOperationalExpenses;

  // --------------------------------------------------------------------------
  // 3. CASH FLOW (Actual Money In/Out)
  // --------------------------------------------------------------------------
  // Money In = Payment In transactions
  // Money Out = Payment Out transactions (Purchases) + Expenses

  const transactionsFlow = db
    .prepare(
      `
    SELECT 
      SUM(CASE WHEN type = 'payment_in' THEN amount ELSE 0 END) as money_in,
      SUM(CASE WHEN type = 'payment_out' THEN amount ELSE 0 END) as money_out
    FROM transactions t
    WHERE ${tWhere.replace(/created_at/g, "transaction_date")}
  `
    )
    .get(...tParams);

  const moneyIn = transactionsFlow.money_in || 0;
  // Combine purchase payments + operational expenses
  const moneyOut = (transactionsFlow.money_out || 0) + totalOperationalExpenses;

  // --------------------------------------------------------------------------
  // 4. OUTSTANDING (Debts)
  // --------------------------------------------------------------------------
  // REMOVED: sales_non_gst UNION
  const receivables =
    db
      .prepare(
        `
    SELECT SUM(total_amount - paid_amount) as pending 
    FROM sales
    WHERE status != 'paid' AND is_quote = 0
  `
      )
      .get().pending || 0;

  const payables =
    db
      .prepare(
        `
    SELECT SUM(total_amount - paid_amount) as pending FROM purchases WHERE status != 'paid'
  `
      )
      .get().pending || 0;

  // --------------------------------------------------------------------------
  // 5. INVENTORY HEALTH
  // --------------------------------------------------------------------------
  const inventory = db
    .prepare(
      `
    SELECT 
      COUNT(*) as total_products,
      SUM(quantity) as total_units,
      SUM(quantity * average_purchase_price) as stock_value_cost,
      SUM(quantity * mrp) as stock_value_mrp,
      SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM products WHERE is_active = 1
  `
    )
    .get();

  // --------------------------------------------------------------------------
  // 6. COUNTS
  // --------------------------------------------------------------------------
  // REMOVED: sales_non_gst count
  const invoiceCount = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM sales s WHERE s.is_quote=0 AND ${sWhere}
  `
    )
    .get(...sParams).count;

  const totalCustomers = db
    .prepare(`SELECT COUNT(*) as c FROM customers`)
    .get().c;

  return {
    revenue: totalRevenue,
    cogs: totalCOGS,
    grossProfit,
    expenses: totalOperationalExpenses,
    netProfit,
    margin:
      totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0,

    moneyIn,
    moneyOut,
    netCashFlow: moneyIn - moneyOut,

    receivables,
    payables,

    stockCost: inventory.stock_value_cost || 0,
    stockMrp: inventory.stock_value_mrp || 0,
    potentialProfit:
      (inventory.stock_value_mrp || 0) - (inventory.stock_value_cost || 0),
    lowStock: inventory.low_stock_count,
    outOfStock: inventory.out_of_stock_count,
    totalProducts: inventory.total_products,

    invoiceCount,
    avgOrderValue:
      invoiceCount > 0 ? Math.round(totalRevenue / invoiceCount) : 0,
    totalCustomers,
  };
}

/**
 * Fetches complex data series for multiple charts.
 * Decoupled: Only fetches GST-compliant sales data.
 */
export function getDashboardChartData(filters) {
  const { where, params } = getDateFilter(filters);

  // Chart 1: Revenue vs Profit vs Expense (Area Chart)
  // REMOVED: sales_non_gst UNION
  const financialTrend = db
    .prepare(
      `
    SELECT 
      date(date) as date,
      SUM(revenue) as revenue,
      SUM(profit) as profit
    FROM (
      SELECT 
        date(created_at) as date, 
        total_amount as revenue, 
        (total_amount - (total_amount * 0.8)) as profit 
      FROM sales 
      WHERE ${where} AND is_quote = 0
    )
    GROUP BY date(date) ORDER BY date(date)
  `
    )
    .all(...params);
  // Note: Profit here is an estimation for the graph speed (assuming 20% margin if not joining every item)

  // Chart 2: Payment Modes (Pie Chart)
  const paymentModes = db
    .prepare(
      `
    SELECT payment_mode as name, SUM(amount) as value
    FROM transactions 
    WHERE type='payment_in' AND ${where.replace(
      /created_at/g,
      "transaction_date"
    )}
    GROUP BY payment_mode
  `
    )
    .all(...params);

  // Chart 3: Top Categories by Revenue (Bar Chart)
  const categoryPerformance = db
    .prepare(
      `
    SELECT c.name, SUM(si.price) as value
    FROM sales_items si
    JOIN products p ON si.product_id = p.id
    JOIN categories c ON p.category = c.id
    JOIN sales s ON si.sale_id = s.id
    WHERE ${where.replace(/created_at/g, "s.created_at")} AND s.is_quote = 0
    GROUP BY c.name
    ORDER BY value DESC LIMIT 5
  `
    )
    .all(...params);

  // Chart 4: Stock Value Distribution (Pie Chart)
  const stockDistribution = db
    .prepare(
      `
    SELECT c.name, SUM(p.quantity * p.average_purchase_price) as value
    FROM products p
    JOIN categories c ON p.category = c.id
    WHERE p.is_active = 1
    GROUP BY c.name
  `
    )
    .all();

  return {
    financialTrend,
    paymentModes,
    categoryPerformance,
    stockDistribution,
  };
}
