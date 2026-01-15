import * as InventoryService from "../services/stockAdjustmentService.mjs";
import * as AdjustmentRepo from "../repositories/stockAdjustmentRepository.mjs";

export function adjustStockController(req, res) {
  try {
    // Expects: { productId, adjustment, category, reason }
    const result = InventoryService.adjustStockService(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("[Backend]- [Stock Adjustments Controller]", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getAdjustmentStatsController(req, res) {
  try {
    const { from, to } = req.query;
    const stats = InventoryService.getAdjustmentStatsService(from, to);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("[Backend]- [Stock Adjustments Controller]", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getAdjustmentsListController(req, res) {
  try {
    const { from, to } = req.query;
    const list = AdjustmentRepo.getAdjustments({ from, to });
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error("[Backend]- [Stock Adjustments Controller]", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
