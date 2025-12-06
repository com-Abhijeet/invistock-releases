import db from "../db/db.mjs";

/**
 * Generates a predictive reordering report based on sales velocity.
 * @param {number} lookbackDays - How many days of sales history to analyze (default 30).
 * @param {number} targetDays - How many days of inventory you want to hold (default 30).
 */
export function getReorderRecommendations(lookbackDays = 30, targetDays = 30) {
  // Calculate the date N days ago
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);
  const dateStr = startDate.toISOString().split("T")[0];

  const query = `
    WITH SalesData AS (
      -- 1. Combine GST and Non-GST Sales for the period
      SELECT product_id, SUM(quantity) as total_sold
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE date(s.created_at) >= ? AND s.is_quote = 0
      GROUP BY product_id
      
      UNION ALL
      
      SELECT product_id, SUM(quantity) as total_sold
      FROM sales_items_non_gst si
      JOIN sales_non_gst s ON si.sale_id = s.id
      WHERE date(s.created_at) >= ?
      GROUP BY product_id
    ),
    AggregatedSales AS (
      -- 2. Sum them up per product
      SELECT product_id, SUM(total_sold) as sold_in_period
      FROM SalesData
      GROUP BY product_id
    )
    SELECT 
      p.id,
      p.name,
      p.product_code,
      p.quantity as current_stock,
      p.average_purchase_price as unit_cost,
      p.low_stock_threshold,
      COALESCE(agg.sold_in_period, 0) as sold_last_x_days
    FROM products p
    LEFT JOIN AggregatedSales agg ON p.id = agg.product_id
    WHERE p.is_active = 1
    -- Optimization: Only return items that have sold at least 1 unit OR are low on stock
    AND (agg.sold_in_period > 0 OR p.quantity <= p.low_stock_threshold)
  `;

  const products = db.prepare(query).all(dateStr, dateStr);

  // 3. Perform Logic Calculation in JS (Easier/Faster than complex SQL math)
  return products
    .map((p) => {
      const dailyVelocity = p.sold_last_x_days / lookbackDays;

      // How many days until stock hits 0?
      // If velocity is 0, days remaining is Infinity (9999 for sorting)
      const daysRemaining =
        dailyVelocity > 0 ? Math.round(p.current_stock / dailyVelocity) : 999;

      // How much should we have to cover 'targetDays'?
      const targetStock = Math.ceil(dailyVelocity * targetDays);

      // Recommendation: Target - Current
      // (If we have enough, recommendation is 0)
      let suggestedOrder = targetStock - p.current_stock;

      // Safety: If below threshold, ALWAYS suggest at least enough to clear threshold
      if (p.current_stock <= p.low_stock_threshold && suggestedOrder <= 0) {
        suggestedOrder = p.low_stock_threshold - p.current_stock + 5; // +5 buffer
      }

      return {
        ...p,
        dailyVelocity: Number(dailyVelocity.toFixed(2)),
        daysRemaining,
        suggestedOrder: suggestedOrder > 0 ? suggestedOrder : 0,
        estimatedCost: suggestedOrder > 0 ? suggestedOrder * p.unit_cost : 0,
        status:
          daysRemaining < 7
            ? "critical"
            : daysRemaining < 15
            ? "warning"
            : "healthy",
      };
    })
    .filter((p) => p.suggestedOrder > 0 || p.status === "critical") // Only show actionable items
    .sort((a, b) => a.daysRemaining - b.daysRemaining); // Most urgent first
}

/**
 * Fetches Dead Stock (Zero sales in X days) and Slow Movers.
 * @param {number} days - The threshold for "Dead" status (default 180).
 */
export function getDeadStockReport(days = 180) {
  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const dateStr = cutoffDate.toISOString().split("T")[0];

  // The Logic:
  // 1. Get all active products with stock > 0.
  // 2. Join with sales items (GST & Non-GST) filtered by date > cutoff.
  // 3. Group by product.
  // 4. Filter for products where total_sold IS NULL (meaning no sales found in period).

  const query = `
    SELECT 
      p.id,
      p.name,
      p.product_code,
      p.quantity as current_stock,
      p.average_purchase_price as unit_cost,
      p.mrp,
      c.name as category_name,
      -- Calculate Capital Stuck
      (p.quantity * p.average_purchase_price) as capital_stuck,
      -- Find the last time it was sold (optional, for context)
      MAX(all_sales.sale_date) as last_sold_date
    FROM products p
    LEFT JOIN categories c ON p.category = c.id
    LEFT JOIN (
        -- Combine GST and Non-GST sales dates
        SELECT si.product_id, s.created_at as sale_date 
        FROM sales_items si JOIN sales s ON si.sale_id = s.id
        UNION ALL
        SELECT si.product_id, s.created_at as sale_date 
        FROM sales_items_non_gst si JOIN sales_non_gst s ON si.sale_id = s.id
    ) all_sales ON p.id = all_sales.product_id
    
    WHERE p.is_active = 1 
      AND p.quantity > 0 -- Only care about items taking up space
      
    GROUP BY p.id
    
    -- The Core Filter: 
    -- Include if NEVER sold OR Last Sold Date is older than the cutoff
    HAVING last_sold_date IS NULL OR date(last_sold_date) < ?
    
    ORDER BY capital_stuck DESC -- Show biggest money wasters first
  `;

  return db.prepare(query).all(dateStr);
}

/**
 * Fetches comprehensive customer analytics: CLV, AOV, Last Seen.
 * @param {number} dormantThresholdDays - Days to consider a customer "Dormant" (default 90).
 */
export function getCustomerAnalytics(dormantThresholdDays = 90) {
  const query = `
    WITH AllSales AS (
        SELECT customer_id, total_amount, created_at 
        FROM sales 
        WHERE is_quote = 0 AND status != 'cancelled'
        
        UNION ALL
        
        SELECT customer_id, total_amount, created_at 
        FROM sales_non_gst 
        WHERE status != 'cancelled'
    )
    SELECT 
        c.id,
        c.name,
        c.phone,
        c.created_at as join_date,
        COUNT(s.total_amount) as order_count,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        MAX(s.created_at) as last_purchase_date,
        
        -- Calculate days inactive. 
        -- If no sales, use join_date. If join_date is somehow missing, assume 0 (Active) to be safe.
        CAST(
          julianday('now') - julianday(
            COALESCE(MAX(s.created_at), c.created_at, 'now')
          ) 
        AS INTEGER) as days_inactive
        
    FROM customers c
    LEFT JOIN AllSales s ON c.id = s.customer_id
    GROUP BY c.id
    ORDER BY total_revenue DESC
  `;

  const data = db.prepare(query).all();

  return data.map((c) => {
    // Safety check for NULL days (if date parsing failed)
    const daysInactive = c.days_inactive || 0;
    const aov = c.order_count > 0 ? c.total_revenue / c.order_count : 0;

    let segment = "Regular";

    // 1. DORMANT CHECK (Top Priority)
    // Applies to ANYONE who hasn't bought in X days (even if they have 0 orders)
    if (daysInactive > dormantThresholdDays) {
      segment = "Dormant";
    }
    // 2. VIP CHECK
    else if (c.total_revenue > 50000) {
      segment = "VIP";
    }
    // 3. NEW CHECK
    // Only if they are recent (days < 90) AND have low orders
    else if (c.order_count === 0 || c.order_count === 1) {
      segment = "New";
    }

    return {
      ...c,
      days_inactive: daysInactive,
      aov: Math.round(aov),
      segment,
    };
  });
}

/**
 * Performs ABC Analysis on products based on revenue contribution.
 * Class A: Top 80% of revenue.
 * Class B: Next 15% of revenue.
 * Class C: Bottom 5% of revenue.
 * @param {number} days - Analysis period (default 365 days).
 */
export function getProductABCAnalysis(days = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const dateStr = cutoffDate.toISOString().split("T")[0];

  // 1. Get Revenue per Product
  const query = `
    SELECT 
      p.id,
      p.name,
      p.product_code,
      p.quantity as current_stock,
      COALESCE(SUM(all_sales.item_total), 0) as total_revenue
    FROM products p
    LEFT JOIN (
        SELECT si.product_id, (si.quantity * si.rate) as item_total 
        FROM sales_items si 
        JOIN sales s ON si.sale_id = s.id 
        WHERE date(s.created_at) >= ? AND s.is_quote = 0 AND s.status != 'cancelled'
        
        UNION ALL
        
        SELECT si.product_id, (si.quantity * si.rate) as item_total 
        FROM sales_items_non_gst si 
        JOIN sales_non_gst s ON si.sale_id = s.id 
        WHERE date(s.created_at) >= ? AND s.status != 'cancelled'
    ) all_sales ON p.id = all_sales.product_id
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY total_revenue DESC
  `;

  const products = db.prepare(query).all(dateStr, dateStr);

  // 2. Calculate Cumulative Revenue & Assign Class
  const grandTotalRevenue = products.reduce(
    (sum, p) => sum + p.total_revenue,
    0
  );
  let runningTotal = 0;

  const analyzedProducts = products.map((p) => {
    runningTotal += p.total_revenue;
    const cumulativePercentage = (runningTotal / grandTotalRevenue) * 100;

    let classification = "C";
    if (cumulativePercentage <= 80) classification = "A";
    else if (cumulativePercentage <= 95) classification = "B";

    // Edge case: If total revenue is 0, everything is C
    if (grandTotalRevenue === 0) classification = "C";

    return {
      ...p,
      classification,
      share: ((p.total_revenue / grandTotalRevenue) * 100).toFixed(2),
    };
  });

  return analyzedProducts;
}
