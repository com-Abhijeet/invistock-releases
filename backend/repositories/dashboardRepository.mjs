import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";
import { convertToStockQuantity } from "../services/unitService.mjs";

/**
 * The Mega-Query function for the dashboard.
 * UPDATED: Uses (quantity - return_quantity) & rigorously excludes GST and artificial stock gains, with unit conversion for COGS.
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
  const shopRow = db.prepare("SELECT inclusive_tax_pricing FROM shop WHERE id = 1").get();
  const isInclusive = shopRow?.inclusive_tax_pricing !== 0;

  // Excludes GST from Revenue and converts transaction units to base units for COGS
  const salesItemsForProfit = db
    .prepare(
      `
    SELECT 
      si.rate,
      si.quantity,
      COALESCE(si.return_quantity, 0) as return_quantity,
      si.discount,
      COALESCE(si.gst_rate, pr.gst_rate, 0) as gst_rate,
      si.unit,
      pr.base_unit,
      pr.secondary_unit,
      pr.conversion_factor,
      pr.average_purchase_price,
      bv.purchase_rate as variant_purchase_rate,
      bv.cost_price as variant_cost_price,
      (SELECT pi.rate FROM purchase_items pi WHERE pi.purchase_id = pb.purchase_id AND pi.product_id = si.product_id LIMIT 1) as batch_purchase_rate,
      (SELECT pi.rate FROM purchase_items pi WHERE pi.product_id = pr.id ORDER BY pi.created_at DESC LIMIT 1) as latest_purchase_rate
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products pr ON si.product_id = pr.id
    LEFT JOIN batch_variants bv ON si.variant_id = bv.id
    LEFT JOIN product_batches pb ON si.batch_id = pb.id
    WHERE s.is_quote = 0 AND s.status != 'cancelled' AND ${sWhere}
  `,
    )
    .all(...sParams);

  let totalRevenue = 0;
  let totalCOGS = 0;

  for (const item of salesItemsForProfit) {
    const netQty = (item.quantity || 0) - (item.return_quantity || 0);
    if (netQty <= 0) continue;

    const rate = Number(item.rate) || 0;
    const discPct = Number(item.discount) || 0;
    const gstPct = Number(item.gst_rate) || 0;

    const rev = isInclusive
      ? (rate * netQty * (1 - discPct / 100)) / (1 + gstPct / 100)
      : rate * netQty * (1 - discPct / 100);
    totalRevenue += rev;

    const stockQty = convertToStockQuantity(netQty, item.unit, {
      base_unit: item.base_unit,
      secondary_unit: item.secondary_unit,
      conversion_factor: item.conversion_factor,
    });

    const unitCost =
      item.variant_purchase_rate && item.variant_purchase_rate > 0
        ? item.variant_purchase_rate
        : item.variant_cost_price && item.variant_cost_price > 0
        ? item.variant_cost_price
        : item.batch_purchase_rate && item.batch_purchase_rate > 0
        ? item.batch_purchase_rate
        : item.average_purchase_price && item.average_purchase_price > 0
        ? item.average_purchase_price
        : item.latest_purchase_rate && item.latest_purchase_rate > 0
        ? item.latest_purchase_rate
        : 0;

    totalCOGS += stockQty * unitCost;
  }

  const grossProfit = totalRevenue - totalCOGS;

  // --------------------------------------------------------------------------
  // 2. EXTRAORDINARY GAINS & LOSSES (Stock adjustments EXCLUDING returns)
  // --------------------------------------------------------------------------
  const adjData = db
    .prepare(
      `
    SELECT 
      SUM(CASE WHEN (sa.new_quantity - sa.old_quantity) > 0 
               THEN (sa.new_quantity - sa.old_quantity) * COALESCE(NULLIF(p.average_purchase_price, 0), (SELECT pi.rate FROM purchase_items pi WHERE pi.product_id = p.id ORDER BY pi.created_at DESC LIMIT 1), 0) 
               ELSE 0 END) as gains,
      SUM(CASE WHEN (sa.new_quantity - sa.old_quantity) < 0 
               THEN ABS(sa.new_quantity - sa.old_quantity) * COALESCE(NULLIF(p.average_purchase_price, 0), (SELECT pi.rate FROM purchase_items pi WHERE pi.product_id = p.id ORDER BY pi.created_at DESC LIMIT 1), 0) 
               ELSE 0 END) as losses
    FROM stock_adjustments sa
    JOIN products p ON sa.product_id = p.id
    WHERE ${sWhere.replace(/s\./g, "sa.")} AND sa.category NOT IN ('Sales Return', 'Purchase Return')
  `,
    )
    .get(...sParams);

  const totalStockGains = adjData?.gains || 0;
  const totalStockLosses = adjData?.losses || 0;

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

  // Strict Net Profit = Gross Profit + Stock Gains - Stock Losses - Operational Expenses
  const netProfit = grossProfit + totalStockGains - totalStockLosses - totalOperationalExpenses;

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
      SUM(quantity * COALESCE(average_purchase_price, (SELECT pi.rate FROM purchase_items pi WHERE pi.product_id = products.id ORDER BY pi.created_at DESC LIMIT 1), 0)) as stock_value_cost,
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
    SELECT COUNT(*) as count FROM sales s WHERE s.is_quote=0 AND s.status != 'cancelled' AND ${sWhere}
  `,
    )
    .get(...sParams).count;

  const totalCustomers = db
    .prepare(`SELECT COUNT(*) as c FROM customers`)
    .get().c;

  return {
    revenue: parseFloat(totalRevenue.toFixed(2)),
    cogs: parseFloat(totalCOGS.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    expenses: parseFloat(totalOperationalExpenses.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    margin:
      totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0,

    moneyIn: parseFloat(moneyIn.toFixed(2)),
    moneyOut: parseFloat(moneyOut.toFixed(2)),
    netCashFlow: parseFloat((moneyIn - moneyOut).toFixed(2)),

    receivables: parseFloat((receivables || 0).toFixed(2)),
    payables: parseFloat((payables || 0).toFixed(2)),

    stockCost: parseFloat((inventory.stock_value_cost || 0).toFixed(2)),
    stockMrp: parseFloat((inventory.stock_value_mrp || 0).toFixed(2)),
    potentialProfit: parseFloat(
      (
        (inventory.stock_value_mrp || 0) - (inventory.stock_value_cost || 0)
      ).toFixed(2),
    ),
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
  const shopRow = db.prepare("SELECT inclusive_tax_pricing FROM shop WHERE id = 1").get();
  const isInclusive = shopRow?.inclusive_tax_pricing !== 0;

  // Chart 1: Revenue vs Real Profit (Net of Returns & excluding GST)
  const financialTrend = db
    .prepare(
      `
    SELECT 
      date(date) as date,
      SUM(revenue) as revenue,
      SUM(revenue - cogs) as profit 
    FROM (
      SELECT 
        date(s.created_at) as date, 
        ${
          isInclusive
            ? "( (si.rate * (si.quantity - COALESCE(si.return_quantity, 0)) * (1 - si.discount/100.0)) / (1 + (COALESCE(si.gst_rate, p.gst_rate, 0)/100.0)) )"
            : "( si.rate * (si.quantity - COALESCE(si.return_quantity, 0)) * (1 - si.discount/100.0) )"
        } as revenue,
        ( (si.quantity - COALESCE(si.return_quantity, 0)) * COALESCE(
            NULLIF(bv.purchase_rate, 0),
            NULLIF(bv.cost_price, 0),
            (SELECT pi.rate FROM purchase_items pi WHERE pi.purchase_id = pb.purchase_id AND pi.product_id = si.product_id LIMIT 1),
            NULLIF(p.average_purchase_price, 0),
            (SELECT pi.rate FROM purchase_items pi WHERE pi.product_id = p.id ORDER BY pi.created_at DESC LIMIT 1),
            0
        ) ) as cogs
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      LEFT JOIN batch_variants bv ON si.variant_id = bv.id
      LEFT JOIN product_batches pb ON si.batch_id = pb.id
      WHERE ${where.replace(/created_at/g, "s.created_at")} AND s.is_quote = 0 AND s.status != 'cancelled'
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
    SELECT c.name, SUM( ${
      isInclusive
        ? "( (si.rate * (si.quantity - COALESCE(si.return_quantity, 0)) * (1 - si.discount/100.0)) / (1 + (COALESCE(si.gst_rate, p.gst_rate, 0)/100.0)) )"
        : "( si.rate * (si.quantity - COALESCE(si.return_quantity, 0)) * (1 - si.discount/100.0) )"
    } ) as value
    FROM sales_items si
    JOIN products p ON si.product_id = p.id
    JOIN categories c ON p.category = c.id
    JOIN sales s ON si.sale_id = s.id
    WHERE ${where.replace(/created_at/g, "s.created_at")} AND s.is_quote = 0 AND s.status != 'cancelled'
    GROUP BY c.name
    ORDER BY value DESC LIMIT 5
  `,
    )
    .all(...params);

  // Chart 4: Stock Value Distribution
  const stockDistribution = db
    .prepare(
      `
    SELECT c.name, SUM(p.quantity * COALESCE(NULLIF(p.average_purchase_price, 0), (SELECT pi.rate FROM purchase_items pi WHERE pi.product_id = p.id ORDER BY pi.created_at DESC LIMIT 1), 0)) as value
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
