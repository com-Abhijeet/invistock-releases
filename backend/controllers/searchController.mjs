import db from "../db/db.mjs";

export const globalSearch = (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.json({ success: true, results: [] });
    }

    const term = `%${q}%`;
    const results = {};

    // 1. Search Products (Name, Code, Barcode)
    const products = db
      .prepare(
        `
      SELECT id, name, product_code, 'product' as type 
      FROM products 
      WHERE name LIKE ? OR product_code LIKE ? OR barcode LIKE ? 
      LIMIT 5
    `
      )
      .all(term, term, term);
    if (products.length) results.products = products;

    // 2. Search Customers (Name, Phone)
    const customers = db
      .prepare(
        `
      SELECT id, name, phone, 'customer' as type 
      FROM customers 
      WHERE name LIKE ? OR phone LIKE ? 
      LIMIT 5
    `
      )
      .all(term, term);
    if (customers.length) results.customers = customers;

    // 3. Search Suppliers (Name, Phone)
    const suppliers = db
      .prepare(
        `
      SELECT id, name, phone, 'supplier' as type 
      FROM suppliers 
      WHERE name LIKE ? OR phone LIKE ? 
      LIMIT 5
    `
      )
      .all(term, term);
    if (suppliers.length) results.suppliers = suppliers;

    // 4. Search Sales (Invoice No)
    const sales = db
      .prepare(
        `
      SELECT id, reference_no, total_amount, 'sale' as type 
      FROM sales 
      WHERE reference_no LIKE ? 
      LIMIT 5
    `
      )
      .all(term);
    if (sales.length) results.sales = sales;

    // 5. Search Purchases (Ref No)
    const purchases = db
      .prepare(
        `
      SELECT id, reference_no, total_amount, 'purchase' as type 
      FROM purchases 
      WHERE reference_no LIKE ? OR internal_ref_no LIKE ?
      LIMIT 5
    `
      )
      .all(term, term);
    if (purchases.length) results.purchases = purchases;

    res.json({ success: true, results });
  } catch (error) {
    console.error("Global Search Error:", error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};
