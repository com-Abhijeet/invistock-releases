import * as AccountingService from "../services/accountingService.mjs";

export function getPnL(req, res) {
  try {
    const data = AccountingService.getPnLStatement(
      req.query.startDate,
      req.query.endDate,
    );
    res.json({ status: "success", data });
  } catch (error) {
    console.error("getPnL -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getCustomerLedger(req, res) {
  try {
    const data = AccountingService.getCustomerLedger(
      req.params.id,
      req.query.startDate,
      req.query.endDate,
    );
    res.json({ status: "success", data });
  } catch (error) {
    console.error("getCustomerLedger -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getSupplierLedger(req, res) {
  try {
    const data = AccountingService.getSupplierLedger(
      req.params.id,
      req.query.startDate,
      req.query.endDate,
    );
    res.json({ status: "success", data });
  } catch (error) {
    console.error("getSupplierLedger -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getCashBankBook(req, res) {
  try {
    const data = AccountingService.getCashBankBook(
      req.params.modeType,
      req.query.startDate,
      req.query.endDate,
    );
    res.json({ status: "success", data });
  } catch (error) {
    console.error("getCashBankBook -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getStockValuation(req, res) {
  try {
    res.json({
      status: "success",
      data: AccountingService.getStockValuation(),
    });
  } catch (error) {
    console.error("getStockValuation -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getStockSummary(req, res) {
  try {
    const data = AccountingService.getStockSummaryReport(
      req.query.startDate,
      req.query.endDate,
    );
    res.json({ status: "success", data });
  } catch (error) {
    console.error("getStockSummary -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

// --- NEW REPORT CONTROLLERS ---

export function getReceivablesAging(req, res) {
  try {
    res.json({
      status: "success",
      data: AccountingService.getReceivablesAging(),
    });
  } catch (error) {
    console.error("getReceivablesAging -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getCustomerBillByBill(req, res) {
  try {
    res.json({
      status: "success",
      data: AccountingService.getCustomerBillByBill(req.params.id),
    });
  } catch (error) {
    console.error("getCustomerBillByBill -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getPayablesAging(req, res) {
  try {
    res.json({ status: "success", data: AccountingService.getPayablesAging() });
  } catch (error) {
    console.error("getPayablesAging -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function getSupplierBillByBill(req, res) {
  try {
    res.json({
      status: "success",
      data: AccountingService.getSupplierBillByBill(req.params.id),
    });
  } catch (error) {
    console.error("getSupplierBillByBill -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}
