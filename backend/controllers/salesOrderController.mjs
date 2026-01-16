import * as SalesOrderService from "../services/salesOrderService.mjs";

export function createOrder(req, res) {
  try {
    const result = SalesOrderService.createOrder(req.body);
    res.status(201).json({ status: "success", data: result });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function updateOrder(req, res) {
  try {
    SalesOrderService.updateOrder(req.params.id, req.body);
    res.json({ status: "success", message: "Order updated" });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function deleteOrder(req, res) {
  try {
    SalesOrderService.deleteOrder(req.params.id);
    res.json({ status: "success", message: "Order deleted" });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getOrderById(req, res) {
  try {
    const order = SalesOrderService.getOrderById(req.params.id);
    if (!order)
      return res.status(404).json({ status: "error", message: "Not found" });
    res.json({ status: "success", data: order });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getAllOrders(req, res) {
  try {
    const result = SalesOrderService.getAllOrders(req.query);
    res.json({ status: "success", ...result });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
}
