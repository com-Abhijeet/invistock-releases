import * as SalesOrderRepo from "../repositories/salesOrderRepository.mjs";
import db from "../db/db.mjs";

/**
 * Handles creation of a sales order.
 * Creates a new customer if 'customer_id' is missing but details are provided.
 */
export function createOrder(payload) {
  let { customer_id, customer_name, customer_phone, items, ...rest } = payload;

  // 1. Handle New Customer Creation on the Fly
  if (!customer_id && customer_name && customer_phone) {
    const existing = db
      .prepare("SELECT id FROM customers WHERE phone = ?")
      .get(customer_phone);
    if (existing) {
      customer_id = existing.id;
    } else {
      const info = db
        .prepare("INSERT INTO customers (name, phone) VALUES (?, ?)")
        .run(customer_name, customer_phone);
      customer_id = info.lastInsertRowid;
    }
  }

  if (!customer_id) throw new Error("Customer is required");

  // 2. ALWAYS Generate Reference (Ignore frontend input)
  // This ensures sequential or timestamp-based consistency controlled by backend
  rest.reference_no = `SO-${Date.now()}`;

  // 3. Create Order
  const orderId = SalesOrderRepo.createSalesOrder(
    { ...rest, customer_id },
    items
  );
  return { orderId, reference_no: rest.reference_no };
}

export function updateOrder(id, payload) {
  // 1. Fetch existing order to check status
  const existingOrder = SalesOrderRepo.getSalesOrderById(id);

  if (!existingOrder) {
    throw new Error("Sales Order not found");
  }

  // 2. Enforce Immutability for Completed/Cancelled Orders
  // If it's already completed, we deny any updates.
  if (existingOrder.status === "completed") {
    throw new Error("Cannot modify a completed Sales Order");
  }

  if (existingOrder.status === "cancelled") {
    throw new Error("Cannot modify a cancelled Sales Order");
  }

  // 3. Proceed with update
  return SalesOrderRepo.updateSalesOrder(id, payload, payload.items);
}

export function deleteOrder(id) {
  const existingOrder = SalesOrderRepo.getSalesOrderById(id);
  if (existingOrder && existingOrder.status === "completed") {
    throw new Error("Cannot delete a completed Sales Order");
  }
  return SalesOrderRepo.deleteSalesOrder(id);
}

export function getOrderById(id) {
  return SalesOrderRepo.getSalesOrderById(id);
}

export function getAllOrders(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const offset = (page - 1) * limit;

  const orders = SalesOrderRepo.getAllSalesOrders({
    limit,
    offset,
    status: query.status,
    search: query.search,
  });

  return { data: orders, page, limit };
}
