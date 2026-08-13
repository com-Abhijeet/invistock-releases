import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";

export function createCustomer(customerData) {
  try {
    const {
      name,
      phone = 0,
      address = null,
      city = null,
      state = null,
      pincode = null,
      gst_no = null,
      credit_limit = 0,
      additional_info = null,
    } = customerData;

    const stmt = db.prepare(`
      INSERT INTO customers (
        name, phone, address, city, state, pincode, 
        gst_no, credit_limit, additional_info
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      phone,
      address,
      city,
      state,
      pincode,
      gst_no,
      credit_limit,
      additional_info,
    );

    return { id: result.lastInsertRowid, ...customerData };
  } catch (error) {
    console.error("Failed to create customer in repository:", error);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
}

export function getAllCustomers({ page = 1, limit = 10, query = "", all }) {
  try {
    let whereClause = "";
    const params = [];

    if (query) {
      whereClause = `WHERE name LIKE ? OR phone LIKE ?`;
      params.push(`%${query}%`, `%${query}%`);
    }

    let recordsQuery = `
      SELECT * FROM customers
      ${whereClause}
      ORDER BY name ASC
    `;

    if (!all) {
      const offset = (page - 1) * limit;
      recordsQuery += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const recordsStmt = db.prepare(recordsQuery);
    const records = recordsStmt.all(...params);

    const totalRecordsQuery = `
      SELECT COUNT(*) AS count FROM customers ${whereClause}
    `;
    const totalRecordsStmt = db.prepare(totalRecordsQuery);
    const totalRecords = totalRecordsStmt.get(
      ...params.slice(0, query ? 2 : 0),
    ).count;

    return { records, totalRecords };
  } catch (error) {
    console.error("Error in getPaginatedCustomers:", error.message);
    throw new Error("Failed to fetch customers: " + error.message);
  }
}

export function getCustomerById(id) {
  return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
}

export function updateCustomer(id, updates) {
  const keys = Object.keys(updates);
  const values = Object.values(updates);

  if (keys.length === 0) return getCustomerById(id);

  const setClause = keys.map((key) => `${key} = ?`).join(", ");

  const stmt = db.prepare(
    `UPDATE customers SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  );

  stmt.run(...values, id);

  return getCustomerById(id);
}

export function deleteCustomer(id) {
  const stmt = db.prepare(`DELETE FROM customers WHERE id = ?`);
  return stmt.run(id);
}

export function getCustomerByPhone(phone) {
  try {
    const stmt = db.prepare("SELECT * FROM customers WHERE phone = ?");
    const customer = stmt.get(phone);
    return customer || null;
  } catch (error) {
    console.error("❌ Error in getCustomerByPhone:", error);
    throw error;
  }
}

export function bulkInsertCustomers(customers) {
  const existingPhones = new Set(
    db
      .prepare("SELECT phone FROM customers WHERE phone IS NOT NULL")
      .all()
      .map((c) => c.phone),
  );

  const errors = [];
  customers.forEach((customer, index) => {
    if (!customer.name) {
      errors.push(`Row ${index + 2}: The 'name' field is required.`);
    }
    if (customer.phone && existingPhones.has(String(customer.phone))) {
      errors.push(
        `Row ${index + 2}: Phone number '${
          customer.phone
        }' already exists in the database.`,
      );
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `Import failed. Please fix these errors:\n- ${errors.join("\n- ")}`,
    );
  }

  const stmt = db.prepare(
    `INSERT INTO customers (name, phone, address, city, state, pincode, gst_no, credit_limit, additional_info)
     VALUES (@name, @phone, @address, @city, @state, @pincode, @gst_no, @credit_limit, @additional_info)`,
  );

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      if (item.phone != null) item.phone = String(item.phone);
      if (item.pincode != null) item.pincode = String(item.pincode);
      if (item.gst_no != null) item.gst_no = String(item.gst_no);

      const customerToInsert = {
        phone: null,
        address: null,
        city: null,
        state: null,
        pincode: null,
        gst_no: null,
        credit_limit: 0,
        additional_info: null,
        ...item,
      };
      stmt.run(customerToInsert);
    }
    return { changes: items.length };
  });

  return insertMany(customers);
}

/**
 * Fetches a complete financial ledger for a customer, grouped by sale.
 * Strictly maps Payments In and Payments Out separately from Credit Notes.
 */
export function getCustomerLedger(customerId, filters) {
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(customerId);
  if (!customer) throw new Error("Customer not found");

  const { where: gstWhere, params: gstParams } = getDateFilter({
    from: filters.startDate,
    to: filters.endDate,
    alias: "s",
  });

  const allSales = db
    .prepare(
      `
    SELECT
      s.id,
      s.created_at AS bill_date,
      s.reference_no,
      s.total_amount,
      COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN t.amount ELSE 0 END), 0) AS total_paid,
      COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN t.amount ELSE 0 END), 0) AS total_refunded,
      COALESCE(SUM(CASE WHEN t.type = 'credit_note' THEN t.amount ELSE 0 END), 0) AS total_credit_notes,
      'sale' AS bill_type
    FROM sales s
    LEFT JOIN transactions t ON s.id = t.bill_id 
      AND t.bill_type = 'sale' 
      AND t.status != 'deleted'
      AND t.type IN ('payment_in', 'payment_out', 'credit_note')
    WHERE s.customer_id = ? AND s.is_quote = 0 AND ${gstWhere}
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `,
    )
    .all(customerId, ...gstParams);

  const getPaymentsStmt = db.prepare(`
    SELECT 
      id,
      transaction_date, 
      amount, 
      payment_mode,
      type
    FROM transactions
    WHERE bill_id = ? AND bill_type = ? 
      AND type IN ('payment_in', 'payment_out', 'credit_note')
      AND status != 'deleted'
    ORDER BY transaction_date ASC
  `);

  const ledger = allSales.map((sale) => {
    const transactions = getPaymentsStmt.all(sale.id, sale.bill_type);
    return {
      ...sale,
      transactions,
    };
  });

  return { customer, ledger };
}

export function getOverdueCustomerSummary() {
  try {
    const customers = db
      .prepare(
        `
      WITH BillBalances AS (
        SELECT
          s.id AS sale_id,
          s.customer_id,
          s.created_at,
          s.total_amount,
          COALESCE(s.paid_amount, 0) AS header_paid_amount,
          -- ✅ FIX: Strictly Cash In/Out for Payment metric
          COALESCE(SUM(CASE 
            WHEN t.type = 'payment_in' THEN t.amount 
            WHEN t.type = 'payment_out' THEN -t.amount 
            ELSE 0 END), 0) AS total_paid,
          -- ✅ FIX: Credit Notes isolated
          COALESCE(SUM(CASE 
            WHEN t.type = 'credit_note' THEN t.amount 
            ELSE 0 END), 0) AS total_credit_notes
        FROM sales s
        LEFT JOIN transactions t ON s.id = t.bill_id 
          AND t.bill_type = 'sale' 
          AND t.status != 'deleted'
        WHERE s.is_quote = 0 
          AND (s.status IS NULL OR LOWER(s.status) NOT IN ('paid', 'completed', 'cancelled'))
        GROUP BY s.id
      ),
      ReconciledPending AS (
        SELECT
          *,
          ((total_amount - total_credit_notes) - MAX(header_paid_amount, total_paid)) AS reconciled_balance,
          (julianday('now', 'localtime') - julianday(created_at)) AS bill_age
        FROM BillBalances
        WHERE ((total_amount - total_credit_notes) - MAX(header_paid_amount, total_paid)) > 0.9
      )
      SELECT
        c.id,
        c.name,
        c.phone,
        COUNT(rp.sale_id) as overdue_bills_count,
        SUM(rp.reconciled_balance) as total_due,
        MAX(rp.bill_age) as oldest_bill_age
      FROM ReconciledPending rp
      JOIN customers c ON rp.customer_id = c.id
      WHERE rp.bill_age > 7
      GROUP BY c.id
      ORDER BY oldest_bill_age DESC
    `,
      )
      .all();

    return customers;
  } catch (error) {
    console.error("Error in getOverdueCustomerSummary:", error.message);
    throw new Error("Failed to fetch overdue summary: " + error.message);
  }
}

export async function getCustomersWithFinancials({
  page = 1,
  limit = 20,
  query = "",
  sortBy = "name",
  sortOrder = "asc",
}) {
  const offset = (page - 1) * limit;
  let whereClause = "1=1";
  const params = [];

  if (query) {
    whereClause += " AND (c.name LIKE ? OR c.phone LIKE ?)";
    params.push(`%${query}%`, `%${query}%`);
  }

  const salesSubquery = `
    SELECT 
      customer_id,
      COUNT(id) as total_bills,
      COALESCE(SUM(total_amount), 0) as total_purchased
    FROM sales
    WHERE status != 'cancelled' AND is_quote = 0
    GROUP BY customer_id
  `;

  // ✅ STRICT SOURCE OF TRUTH: Transactions table for cash flow & credit notes
  const transSubquery = `
    SELECT 
      entity_id,
      COALESCE(SUM(CASE WHEN type = 'payment_in' THEN amount WHEN type = 'payment_out' THEN -amount ELSE 0 END), 0) as total_amount_paid,
      COALESCE(SUM(CASE WHEN type = 'credit_note' THEN amount ELSE 0 END), 0) as total_credit_notes
    FROM transactions
    WHERE entity_type = 'customer' 
      AND status != 'deleted' 
      AND type IN ('payment_in', 'payment_out', 'credit_note')
    GROUP BY entity_id
  `;

  // Count of fully settled bills per customer (strictly via transactions)
  const settledBillsSubquery = `
    SELECT 
      s.customer_id,
      COUNT(s.id) as total_bills_paid
    FROM sales s
    LEFT JOIN (
      SELECT 
        bill_id,
        COALESCE(SUM(CASE WHEN type = 'payment_in' THEN amount WHEN type = 'payment_out' THEN -amount ELSE 0 END), 0) as paid,
        COALESCE(SUM(CASE WHEN type = 'credit_note' THEN amount ELSE 0 END), 0) as credit
      FROM transactions
      WHERE bill_type = 'sale' AND status != 'deleted'
      GROUP BY bill_id
    ) t_bill ON s.id = t_bill.bill_id
    WHERE s.status != 'cancelled' AND s.is_quote = 0
      AND (s.total_amount - COALESCE(t_bill.paid, 0) - COALESCE(t_bill.credit, 0)) <= 0.01
    GROUP BY s.customer_id
  `;

  const sql = `
    SELECT 
      c.id, 
      c.name, 
      c.phone, 
      c.city,
      COALESCE(s_stats.total_bills, 0) as total_bills,
      COALESCE(s_stats.total_purchased, 0) as total_purchased,
      COALESCE(sb_stats.total_bills_paid, 0) as total_bills_paid,
      COALESCE(t_stats.total_amount_paid, 0) as total_amount_paid,
      COALESCE(t_stats.total_credit_notes, 0) as total_credit_notes,
      MAX(0, (COALESCE(s_stats.total_purchased, 0) - COALESCE(t_stats.total_credit_notes, 0) - COALESCE(t_stats.total_amount_paid, 0))) as total_overdue,
      CASE 
        WHEN (COALESCE(s_stats.total_purchased, 0) - COALESCE(t_stats.total_credit_notes, 0)) <= 0 THEN 0
        ELSE ROUND((COALESCE(t_stats.total_amount_paid, 0) * 100.0) / (COALESCE(s_stats.total_purchased, 0) - COALESCE(t_stats.total_credit_notes, 0)), 2)
      END as payment_percentage
    FROM customers c
    LEFT JOIN (${salesSubquery}) s_stats ON c.id = s_stats.customer_id
    LEFT JOIN (${transSubquery}) t_stats ON c.id = t_stats.entity_id
    LEFT JOIN (${settledBillsSubquery}) sb_stats ON c.id = sb_stats.customer_id
    WHERE ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) as count FROM customers c WHERE ${whereClause}`;

  const records = await db.prepare(sql).all(...params, limit, offset);
  const total = await db.prepare(countSql).get(...params).count;

  return {
    data: records,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Fetches pending bills by customer using transactions table as the source of truth for all payments & credit notes.
 */
export function getPendingBillsByCustomer({ customerId, query = "", minAgeDays = 0 } = {}) {
  try {
    let whereClauses = [
      "s.is_quote = 0",
      "s.status != 'cancelled'"
    ];
    let params = [];

    if (customerId) {
      whereClauses.push("s.customer_id = ?");
      params.push(Number(customerId));
    }

    if (query) {
      whereClauses.push("(c.name LIKE ? OR c.phone LIKE ? OR s.reference_no LIKE ?)");
      const q = `%${query}%`;
      params.push(q, q, q);
    }

    const whereString = whereClauses.join(" AND ");

    const sql = `
      WITH BillTransactions AS (
        SELECT 
          s.id AS sale_id,
          s.customer_id,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.city AS customer_city,
          s.reference_no,
          s.created_at AS bill_date,
          s.total_amount,
          COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN t.amount WHEN t.type = 'payment_out' THEN -t.amount ELSE 0 END), 0) AS total_paid_trans,
          COALESCE(SUM(CASE WHEN t.type = 'credit_note' THEN t.amount ELSE 0 END), 0) AS total_credit_notes_trans,
          CAST(julianday('now', 'localtime') - julianday(s.created_at) AS INTEGER) AS bill_age_days
        FROM sales s
        JOIN customers c ON s.customer_id = c.id
        LEFT JOIN transactions t ON s.id = t.bill_id 
          AND t.bill_type = 'sale' 
          AND t.status != 'deleted'
        WHERE ${whereString}
        GROUP BY s.id
      ),
      PendingBills AS (
        SELECT 
          *,
          (total_amount - total_credit_notes_trans - total_paid_trans) AS pending_balance
        FROM BillTransactions
        WHERE (total_amount - total_credit_notes_trans - total_paid_trans) > 0.01
      )
      SELECT * FROM PendingBills
      WHERE bill_age_days >= ?
      ORDER BY bill_date ASC
    `;

    params.push(Number(minAgeDays) || 0);

    const bills = db.prepare(sql).all(...params);

    let totalPendingAmount = 0;
    let maxAgeDays = 0;
    const customerMap = {};

    for (const bill of bills) {
      totalPendingAmount += bill.pending_balance;
      if (bill.bill_age_days > maxAgeDays) {
        maxAgeDays = bill.bill_age_days;
      }

      if (!customerMap[bill.customer_id]) {
        customerMap[bill.customer_id] = {
          customer_id: bill.customer_id,
          customer_name: bill.customer_name,
          customer_phone: bill.customer_phone,
          customer_city: bill.customer_city,
          total_pending_amount: 0,
          pending_bills_count: 0,
          oldest_bill_age: 0,
          bills: []
        };
      }

      customerMap[bill.customer_id].total_pending_amount += bill.pending_balance;
      customerMap[bill.customer_id].pending_bills_count += 1;
      if (bill.bill_age_days > customerMap[bill.customer_id].oldest_bill_age) {
        customerMap[bill.customer_id].oldest_bill_age = bill.bill_age_days;
      }

      customerMap[bill.customer_id].bills.push(bill);
    }

    const customersList = Object.values(customerMap).sort(
      (a, b) => b.total_pending_amount - a.total_pending_amount
    );

    return {
      summary: {
        totalPendingAmount,
        totalPendingBills: bills.length,
        totalCustomersCount: customersList.length,
        maxAgeDays
      },
      customers: customersList,
      allBills: bills
    };
  } catch (error) {
    console.error("Error in getPendingBillsByCustomer:", error.message);
    throw new Error("Failed to fetch pending bills: " + error.message);
  }
}

