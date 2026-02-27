import * as AccountingService from "../services/accountingService.mjs";

export function getPnL(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const data = AccountingService.getPnLStatement(startDate, endDate);
    res.json({ status: "success", data });
  } catch (error) {
    console.error("[ACCOUNTING] Error getting P&L:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getCustomerLedger(req, res) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const data = AccountingService.getCustomerLedger(id, startDate, endDate);
    res.json({ status: "success", data });
  } catch (error) {
    console.error("[ACCOUNTING] Error getting Customer Ledger:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getSupplierLedger(req, res) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const data = AccountingService.getSupplierLedger(id, startDate, endDate);
    res.json({ status: "success", data });
  } catch (error) {
    console.error("[ACCOUNTING] Error getting Supplier Ledger:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getCashBankBook(req, res) {
  try {
    const { modeType } = req.params; // 'cash' or 'bank'
    const { startDate, endDate } = req.query;
    const data = AccountingService.getCashBankBook(
      modeType,
      startDate,
      endDate,
    );
    res.json({ status: "success", data });
  } catch (error) {
    console.error(
      `[ACCOUNTING] Error getting ${req.params.modeType} book:`,
      error,
    );
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getStockValuation(req, res) {
  try {
    const data = AccountingService.getStockValuation();
    res.json({ status: "success", data });
  } catch (error) {
    console.error("[ACCOUNTING] Error getting Stock Valuation:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getStockSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const data = AccountingService.getStockSummaryReport(startDate, endDate);
    res.json({ status: "success", data });
  } catch (error) {
    console.error("[ACCOUNTING] Error getting Stock Summary:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}
