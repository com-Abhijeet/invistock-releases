import { Router } from "express";
import {
  getPnL,
  getCustomerLedger,
  getSupplierLedger,
  getCashBankBook,
  getStockValuation,
  getStockSummary,
  getReceivablesAging,
  getCustomerBillByBill,
  getPayablesAging,
  getSupplierBillByBill
} from "../controllers/accountingController.mjs";

const router = Router();

// Financial Reports
router.get("/pnl", getPnL);

// Inventory Reports
router.get("/stock-valuation", getStockValuation);
router.get("/stock-summary", getStockSummary);

// Party Ledgers
router.get("/ledger/customer/:id", getCustomerLedger);
router.get("/ledger/supplier/:id", getSupplierLedger);

// Books (param can be 'cash' or 'bank')
router.get("/book/:modeType", getCashBankBook);

// --- NEW REPORTS (AGING & BILL BY BILL) ---
router.get("/aging/receivables", getReceivablesAging);
router.get("/outstanding/customer/:id", getCustomerBillByBill);

router.get("/aging/payables", getPayablesAging);
router.get("/outstanding/supplier/:id", getSupplierBillByBill);

export default router;