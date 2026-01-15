import db from "../db/db.mjs"; // ✅ Corrected: Default import
import { getDateFilter } from "../utils/dateFilter.mjs";

/**
 * @description Inserts a new customer record into the database with structured address details.
 * @param {object} customerData An object containing the customer's details.
 * @param {string} customerData.name The customer's full name.
 * @param {string} [customerData.phone] The customer's phone number.
 * @param {string} [customerData.address] The customer's street address or address line 1.
 * @param {string} [customerData.city] The customer's city.
 * @param {string} [customerData.state] The customer's state.
 * @param {string} [customerData.pincode] The customer's pincode.
 * @param {string} [customerData.gst_no] The customer's GST Identification Number.
 * @param {number} [customerData.credit_limit=0] The customer's credit limit.
 * @param {string} [customerData.additional_info] Any additional notes about the customer.
 * @returns {Promise<object>} On success, returns the newly created customer object with its new ID. On failure, returns an error object.
 */
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

    // ✅ Update the INSERT statement to include the new columns
    const stmt = db.prepare(`
      INSERT INTO customers (
        name, phone, address, city, state, pincode, 
        gst_no, credit_limit, additional_info
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // ✅ Pass the new address variables to the run command in the correct order
    const result = stmt.run(
      name,
      phone,
      address,
      city,
      state,
      pincode,
      gst_no,
      credit_limit,
      additional_info
    );

    return { id: result.lastInsertRowid, ...customerData };
  } catch (error) {
    console.error("Failed to create customer in repository:", error);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
}

/**
 * @description Retrieves a paginated list of customers, with optional search functionality.
 * @param {object} options - Pagination, limit, and query parameters.
 * @param {number} [options.page=1] - The page number to fetch.
 * @param {number} [options.limit=10] - The number of records per page.
 * @param {string} [options.query=''] - A search string to filter customers by name or phone.
 * @param {boolean} [options.all=false] - If true, fetches all customers without pagination.
 * @returns {{records: Array, totalRecords: number}} An object containing the customer records and the total count.
 * @throws {Error} If the database query fails.
 */

export function getAllCustomers({ page = 1, limit = 10, query = "", all }) {
  try {
    let whereClause = "";
    const params = [];

    if (query) {
      whereClause = `WHERE name LIKE ? OR phone LIKE ?`;
      params.push(`%${query}%`, `%${query}%`);
    }

    // Prepare the statement for fetching records
    let recordsQuery = `
      SELECT * FROM customers
      ${whereClause}
      ORDER BY name ASC
    `;

    // Handle pagination if 'all' is false
    if (!all) {
      const offset = (page - 1) * limit;
      recordsQuery += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const recordsStmt = db.prepare(recordsQuery);
    const records = recordsStmt.all(...params);

    // Get the total number of records for pagination without pagination limits
    const totalRecordsQuery = `
      SELECT COUNT(*) AS count FROM customers ${whereClause}
    `;
    const totalRecordsStmt = db.prepare(totalRecordsQuery);
    const totalRecords = totalRecordsStmt.get(
      ...params.slice(0, query ? 2 : 0)
    ).count;

    return { records, totalRecords };
  } catch (error) {
    console.error("Error in getPaginatedCustomers:", error.message);
    throw new Error("Failed to fetch customers: " + error.message);
  }
}

export function getCustomerById(id) {
  // The parameters must be passed to the .all() method, not the .prepare() method.
  return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
}

export function updateCustomer(id, updates) {
  const keys = Object.keys(updates);
  const values = Object.values(updates);

  if (keys.length === 0) return getCustomerById(id);

  const setClause = keys.map((key) => `${key} = ?`).join(", ");

  // ✅ FIX: Replaced invalid db.run() with db.prepare().run()
  const stmt = db.prepare(
    `UPDATE customers SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  );

  stmt.run(...values, id);

  return getCustomerById(id);
}

export function deleteCustomer(id) {
  // ✅ FIX: Replaced invalid db.run() with db.prepare().run()
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

/**
 * Inserts multiple customers in a single transaction after validation and sanitization.
 * @param {Array<object>} customers - An array of customer objects.
 * @returns {{changes: number}}
 */
export function bulkInsertCustomers(customers) {
  // --- Pre-Validation Step ---
  const existingPhones = new Set(
    db
      .prepare("SELECT phone FROM customers WHERE phone IS NOT NULL")
      .all()
      .map((c) => c.phone)
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
        }' already exists in the database.`
      );
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `Import failed. Please fix these errors:\n- ${errors.join("\n- ")}`
    );
  }

  // --- Transactional Insert ---
  const stmt = db.prepare(
    `INSERT INTO customers (name, phone, address, city, state, pincode, gst_no, credit_limit, additional_info)
     VALUES (@name, @phone, @address, @city, @state, @pincode, @gst_no, @credit_limit, @additional_info)`
  );

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      // ✅ DATA SANITIZATION: Enforce string types for text-like fields.
      // This is the crucial fix to prevent trailing ".0" on numbers.
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
 * This now ONLY fetches GST sales (Main App).
 * @param {number} customerId The customer's ID.
 * @param {object} filters Date filters (startDate, endDate).
 * @returns {object} An object containing the customer details and their sale/transaction history.
 */
export function getCustomerLedger(customerId, filters) {
  console.log("filters in getcustomerledger", filters);
  // 1. Get the customer's details
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(customerId);
  if (!customer) throw new Error("Customer not found");

  // 2. Build date filter for sales table
  const { where: gstWhere, params: gstParams } = getDateFilter({
    from: filters.startDate,
    to: filters.endDate,
    alias: "s",
  });

  // 3. Fetch all main GST sales (that aren't quotes)
  // REMOVED Non-GST Sales fetch
  const allSales = db
    .prepare(
      `
    SELECT
      id,
      created_at AS bill_date,
      reference_no,
      total_amount,
      paid_amount,
      (total_amount - paid_amount) AS amount_pending,
      'sale' AS bill_type
    FROM sales s
    WHERE customer_id = ? AND is_quote = 0 AND ${gstWhere}
    ORDER BY created_at DESC
  `
    )
    .all(customerId, ...gstParams);

  // 4. Update the payments query
  const getPaymentsStmt = db.prepare(`
    SELECT transaction_date, amount, payment_mode
    FROM transactions
    WHERE bill_id = ? AND bill_type = ? AND type = 'payment_in'
    ORDER BY transaction_date ASC
  `);

  // 5. Map over the list
  const ledger = allSales.map((sale) => {
    // Pass both the id AND the bill_type to find correct payments
    const transactions = getPaymentsStmt.all(sale.id, sale.bill_type);
    return {
      ...sale,
      transactions,
    };
  });

  return { customer, ledger };
}

/**
 * Gets a summary of all customers with overdue payments,
 * grouped by the age of their oldest overdue bill.
 */
export function getOverdueCustomerSummary() {
  // This query finds all customers who have at least one bill
  // that is not fully paid and older than 7 days.
  const customers = db
    .prepare(
      `
    SELECT
      c.id,
      c.name,
      c.phone,
      COUNT(s.id) as overdue_bills_count,
      SUM(s.total_amount - s.paid_amount) as total_due,
      -- Find the age of the oldest overdue bill for this customer
      MAX(julianday('now') - julianday(s.created_at)) as oldest_bill_age
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    WHERE 
      s.status != 'paid' 
      AND s.is_quote = 0 
      AND (s.total_amount > s.paid_amount)
    GROUP BY c.id
    -- Only include customers whose oldest bill is over 7 days
    HAVING oldest_bill_age > 7
    ORDER BY oldest_bill_age DESC
  `
    )
    .all();

  return customers;
}

/**
 * Retrieves a paginated list of customers with their financial summaries.
 * Metrics:
 * - Total Bills (Count)
 * - Total Purchased (Sum of Sales)
 * - Total Bills Paid (Count of sales with status='paid')
 * - Total Amount Paid (Sum of 'payment_in' + 'credit_note' transactions)
 * - Total Overdue (Purchased - Paid)
 * - Payment Percentage
 */
export async function getCustomersWithFinancials({
  page = 1,
  limit = 20,
  query = "",
  sortBy = "name",
  sortOrder = "asc",
}) {
  const offset = (page - 1) * limit;

  // Search Filter
  let whereClause = "1=1";
  const params = [];

  if (query) {
    whereClause += " AND (c.name LIKE ? OR c.phone LIKE ?)";
    params.push(`%${query}%`, `%${query}%`);
  }

  // Common CTEs or Subqueries for Aggregation
  // 1. Sales Aggregates
  const salesSubquery = `
    SELECT 
      customer_id,
      COUNT(id) as total_bills,
      COALESCE(SUM(total_amount), 0) as total_purchased,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as total_bills_paid
    FROM sales
    WHERE status != 'cancelled' AND is_quote = 0
    GROUP BY customer_id
  `;

  // 2. Transactions Aggregates (Payments + Credits)
  const transSubquery = `
    SELECT 
      entity_id,
      COALESCE(SUM(amount), 0) as total_amount_paid
    FROM transactions
    WHERE entity_type = 'customer' 
      AND status != 'deleted' 
      AND (type = 'payment_in' OR type = 'credit_note')
    GROUP BY entity_id
  `;

  // Main Query
  const sql = `
    SELECT 
      c.id, 
      c.name, 
      c.phone, 
      c.city,
      COALESCE(s_stats.total_bills, 0) as total_bills,
      COALESCE(s_stats.total_purchased, 0) as total_purchased,
      COALESCE(s_stats.total_bills_paid, 0) as total_bills_paid,
      COALESCE(t_stats.total_amount_paid, 0) as total_amount_paid,
      
      -- Calculated Fields
      (COALESCE(s_stats.total_purchased, 0) - COALESCE(t_stats.total_amount_paid, 0)) as total_overdue,
      
      CASE 
        WHEN COALESCE(s_stats.total_purchased, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(t_stats.total_amount_paid, 0) * 100.0) / COALESCE(s_stats.total_purchased, 0), 2)
      END as payment_percentage

    FROM customers c
    LEFT JOIN (${salesSubquery}) s_stats ON c.id = s_stats.customer_id
    LEFT JOIN (${transSubquery}) t_stats ON c.id = t_stats.entity_id
    WHERE ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  // Count Query for Pagination
  const countSql = `SELECT COUNT(*) as count FROM customers c WHERE ${whereClause}`;

  // Execute
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
