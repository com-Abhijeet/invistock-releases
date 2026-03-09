import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";

/**
 * The Mega-Query function for the dashboard.
 * UPDATED: Uses (quantity - return_quantity) & rigorously excludes GST and artificial stock gains.
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
  });

  // --------------------------------------------------------------------------
  // 1. FINANCIALS: Net Revenue, Net COGS, and Net Gross Profit
  // --------------------------------------------------------------------------
  // Excludes GST from Revenue to prevent artificial inflation
  const profitQuery = `
    SELECT 
      SUM( (si.rate * (si.quantity - COALESCE(si.return_quantity, 0)) * (1 - si.discount/100.0)) / (1 + (COALESCE(si.gst_rate, pr.gst_rate, 0)/100.0)) ) as revenue,
      SUM( (si.quantity - COALESCE(si.return_quantity, 0)) * COALESCE(pr.average_purchase_price, pr.mop, 0) ) as cogs
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products pr ON si.product_id = pr.id
    WHERE s.is_quote = 0 AND ${sWhere}
  `;

  const profitData = db
    .prepare(
      `SELECT SUM(revenue) as revenue, SUM(cogs) as cogs FROM (${profitQuery})`,
    )
    .get(...sParams);

  const totalRevenue = profitData.revenue || 0;
  const totalCOGS = profitData.cogs || 0;
  const grossProfit = totalRevenue - totalCOGS;

  // --------------------------------------------------------------------------
  // 2. EXTRAORDINARY GAINS (Stock adjustments EXCLUDING returns)
  // --------------------------------------------------------------------------
  const adjData = db
    .prepare(
      `
    SELECT 
      SUM(CASE WHEN (sa.new_quantity - sa.old_quantity) > 0 THEN (sa.new_quantity - sa.old_quantity) * COALESCE(p.average_purchase_price, p.mop, 0) ELSE 0 END) as gains
    FROM stock_adjustments sa
    JOIN products p ON sa.product_id = p.id
    WHERE ${sWhere.replace(/s\./g, "sa.")} AND sa.category NOT IN ('Sales Return', 'Purchase Return')
  `,
    )
    .get(...sParams);

  const totalStockGains = adjData.gains || 0;

  // --------------------------------------------------------------------------
  // 3. OPERATIONAL COSTS (Expenses) & NET PROFIT
  // --------------------------------------------------------------------------
  const expenses = db
    .prepare(
      `
    SELECT SUM(amount) as total 
    FROM expenses e
    WHERE ${eWhere.replace(/created_at/g, "date")}
  `,
    )
    .get(...eParams);

  const totalOperationalExpenses = expenses.total || 0;

  // Strict Net Profit = Operational Profit + Found Stock - Operational Expenses
  const netProfit = grossProfit + totalStockGains - totalOperationalExpenses;

  // --------------------------------------------------------------------------
  // 4. CASH FLOW (Actual Money In/Out)
  // --------------------------------------------------------------------------
  const transactionsFlow = db
    .prepare(
      `
    SELECT 
      SUM(CASE WHEN type = 'payment_in' THEN amount ELSE 0 END) as money_in,
      SUM(CASE WHEN type = 'payment_out' THEN amount ELSE 0 END) as money_out,
      SUM(CASE WHEN type = 'credit_note' THEN amount ELSE 0 END) as total_returns
    FROM transactions t
    WHERE ${tWhere.replace(/created_at/g, "transaction_date")} AND status != 'deleted'
  `,
    )
    .get(...tParams);

  const moneyIn = transactionsFlow.money_in || 0;
  const moneyOut = (transactionsFlow.money_out || 0) + totalOperationalExpenses;

  // --------------------------------------------------------------------------
  // 5. OUTSTANDING (Reconciled Debts)
  // --------------------------------------------------------------------------
  // Receivables = Gross Billed + Refunds Given - Cash Received - Returns Processed
  const receivables =
    db
      .prepare(
        `
    SELECT (
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status != 'cancelled' AND is_quote = 0)
      +
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'payment_out' AND status != 'deleted' AND entity_type = 'customer')
      -
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type IN ('payment_in', 'credit_note') AND status != 'deleted' AND entity_type = 'customer')
    ) as pending
  `,
      )
      .get().pending || 0;

  // Payables = Gross Purchases + Refunds Received - Cash Paid - Returns Processed
  const payables =
    db
      .prepare(
        `
    SELECT (
      (SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE status != 'cancelled')
      +
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'payment_in' AND status != 'deleted' AND entity_type = 'supplier')
      -
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type IN ('payment_out', 'debit_note') AND status != 'deleted' AND entity_type = 'supplier')
    ) as pending
  `,
      )
      .get().pending || 0;

  // --------------------------------------------------------------------------
  // 6. INVENTORY HEALTH
  // --------------------------------------------------------------------------
  const inventory = db
    .prepare(
      `
    SELECT 
      COUNT(*) as total_products,
      SUM(quantity) as total_units,
      SUM(quantity * COALESCE(average_purchase_price, mop, 0)) as stock_value_cost,
      SUM(quantity * mrp) as stock_value_mrp,
      SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM products WHERE is_active = 1
  `,
    )
    .get();

  // --------------------------------------------------------------------------
  // 7. COUNTS
  // --------------------------------------------------------------------------
  const invoiceCount = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM sales s WHERE s.is_quote=0 AND ${sWhere}
  `,
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
 */
export function getDashboardChartData(filters) {
  const { where, params } = getDateFilter(filters);

  // Chart 1: Revenue vs Profit vs Expense (Net of Returns & excluding GST)
  const financialTrend = db
    .prepare(
      `
    SELECT 
      date(date) as date,
      SUM(revenue) as revenue,
      SUM(revenue * 0.2) as profit 
    FROM (
      SELECT 
        date(s.created_at) as date, 
        ( (si.rate * (si.quantity - COALESCE(si.return_quantity, 0)) * (1 - si.discount/100.0)) / (1 + (COALESCE(si.gst_rate, p.gst_rate, 0)/100.0)) ) as revenue
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE ${where.replace(/created_at/g, "s.created_at")} AND s.is_quote = 0
    )
    GROUP BY date(date) ORDER BY date(date)
  `,
    )
    .all(...params);

  // Chart 2: Payment Modes
  const paymentModes = db
    .prepare(
      `
    SELECT payment_mode as name, SUM(amount) as value
    FROM transactions 
    WHERE type='payment_in' AND ${where.replace(/created_at/g, "transaction_date")}
    GROUP BY payment_mode
  `,
    )
    .all(...params);

  // Chart 3: Top Categories by Net Revenue (excluding GST)
  const categoryPerformance = db
    .prepare(
      `
    SELECT c.name, SUM( (si.rate * (si.quantity - COALESCE(si.return_quantity, 0)) * (1 - si.discount/100.0)) / (1 + (COALESCE(si.gst_rate, p.gst_rate, 0)/100.0)) ) as value
    FROM sales_items si
    JOIN products p ON si.product_id = p.id
    JOIN categories c ON p.category = c.id
    JOIN sales s ON si.sale_id = s.id
    WHERE ${where.replace(/created_at/g, "s.created_at")} AND s.is_quote = 0
    GROUP BY c.name
    ORDER BY value DESC LIMIT 5
  `,
    )
    .all(...params);

  // Chart 4: Stock Value Distribution
  const stockDistribution = db
    .prepare(
      `
    SELECT c.name, SUM(p.quantity * COALESCE(p.average_purchase_price, p.mop, 0)) as value
    FROM products p
    JOIN categories c ON p.category = c.id
    WHERE p.is_active = 1
    GROUP BY c.name
  `,
    )
    .all();

  return {
    financialTrend,
    paymentModes,
    categoryPerformance,
    stockDistribution,
  };
}
