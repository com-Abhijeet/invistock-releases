import { Router } from "express";
import {
  getPnL,
  getCustomerLedger,
  getSupplierLedger,
  getCashBankBook,
  getStockValuation,
  getStockSummary, // NEW IMPORT
} from "../controllers/accountingController.mjs";

const router = Router();

// Reports
router.get("/pnl", getPnL);
router.get("/stock-valuation", getStockValuation);
router.get("/stock-summary", getStockSummary); // NEW ROUTE

// Party Ledgers
router.get("/ledger/customer/:id", getCustomerLedger);
router.get("/ledger/supplier/:id", getSupplierLedger);

// Books (param can be 'cash' or 'bank')
router.get("/book/:modeType", getCashBankBook);

export default router;
