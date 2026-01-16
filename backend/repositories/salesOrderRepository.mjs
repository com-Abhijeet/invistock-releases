import db from "../db/db.mjs";

/**
 * Creates a new sales order.
 * Does NOT deduct stock.
 */
export function createSalesOrder(orderData, items) {
  const transaction = db.transaction(() => {
    // 1. Insert Order Header
    const stmt = db.prepare(`
      INSERT INTO sales_orders (
        customer_id, reference_no, created_by, status, total_amount, note, fulfilled_invoice_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      orderData.customer_id,
      orderData.reference_no,
      orderData.created_by || "System",
      orderData.status || "pending",
      orderData.total_amount,
      orderData.note || "",
      orderData.fulfilled_invoice_id || null
    );
    const orderId = info.lastInsertRowid;

    // 2. Insert Items
    const itemStmt = db.prepare(`
      INSERT INTO sales_order_items (
        sales_order_id, product_id, quantity, rate, price, gst_rate, discount, batch_id, serial_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      itemStmt.run(
        orderId,
        item.product_id,
        item.quantity,
        item.rate,
        item.price,
        item.gst_rate || 0,
        item.discount || 0,
        item.batch_id || null,
        item.serial_id || null
      );
    }

    return orderId;
  });

  return transaction();
}

/**
 * Updates an existing sales order.
 * Replaces all items.
 */
export function updateSalesOrder(orderId, orderData, items) {
  const transaction = db.transaction(() => {
    // 1. Update Header
    db.prepare(
      `
      UPDATE sales_orders 
      SET customer_id = ?, status = ?, total_amount = ?, note = ?, fulfilled_invoice_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(
      orderData.customer_id,
      orderData.status,
      orderData.total_amount,
      orderData.note || "",
      orderData.fulfilled_invoice_id || null,
      orderId
    );

    // 2. Delete old items
    db.prepare(`DELETE FROM sales_order_items WHERE sales_order_id = ?`).run(
      orderId
    );

    // 3. Insert new items
    const itemStmt = db.prepare(`
      INSERT INTO sales_order_items (
        sales_order_id, product_id, quantity, rate, price, gst_rate, discount, batch_id, serial_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      itemStmt.run(
        orderId,
        item.product_id,
        item.quantity,
        item.rate,
        item.price,
        item.gst_rate || 0,
        item.discount || 0,
        item.batch_id || null,
        item.serial_id || null
      );
    }
  });

  return transaction();
}

export function deleteSalesOrder(orderId) {
  db.prepare(`DELETE FROM sales_orders WHERE id = ?`).run(orderId);
}

export function getSalesOrderById(orderId) {
  const order = db
    .prepare(
      `
    SELECT o.*, 
      c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.gst_no as customer_gstin,
      c.city as customer_city, c.state as customer_state, c.pincode as customer_pincode
    FROM sales_orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `
    )
    .get(orderId);

  if (!order) return null;

  const items = db
    .prepare(
      `
    SELECT 
      oi.*, 
      p.name as product_name, p.product_code, p.hsn,
      pb.batch_number, ps.serial_number
    FROM sales_order_items oi
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN product_batches pb ON oi.batch_id = pb.id
    LEFT JOIN product_serials ps ON oi.serial_id = ps.id
    WHERE oi.sales_order_id = ?
  `
    )
    .all(orderId);

  return { ...order, items };
}

export function getAllSalesOrders({ limit = 50, offset = 0, status, search }) {
  let query = `
    SELECT o.*, c.name as customer_name 
    FROM sales_orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ` AND o.status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (o.reference_no LIKE ? OR c.name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}
