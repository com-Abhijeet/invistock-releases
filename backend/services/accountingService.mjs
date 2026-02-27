import * as AccountingRepo from "../repositories/accountingRepository.mjs";

// Helper to provide default dates if none are passed (Defaults to current month)
const getDefaultDateRange = (startDate, endDate) => {
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  return {
    start: startDate || defaultStart,
    end: endDate || defaultEnd,
  };
};

export function getPnLStatement(startDate, endDate) {
  const { start, end } = getDefaultDateRange(startDate, endDate);
  return AccountingRepo.getPnLData(start, end);
}

export function getCustomerLedger(customerId, startDate, endDate) {
  if (!customerId) throw new Error("Customer ID is required");
  const { start, end } = getDefaultDateRange(startDate, endDate);

  const data = AccountingRepo.getCustomerLedger(customerId, start, end);

  // Calculate Running Balance
  let runningBalance = data.openingBalance;
  const enrichedLedger = data.ledger.map((row) => {
    runningBalance = runningBalance + row.debit - row.credit;
    return { ...row, balance: runningBalance };
  });

  return {
    customerId,
    period: { start, end },
    openingBalance: data.openingBalance,
    closingBalance: runningBalance,
    transactions: enrichedLedger,
  };
}

export function getSupplierLedger(supplierId, startDate, endDate) {
  if (!supplierId) throw new Error("Supplier ID is required");
  const { start, end } = getDefaultDateRange(startDate, endDate);

  const data = AccountingRepo.getSupplierLedger(supplierId, start, end);

  // Calculate Running Balance
  let runningBalance = data.openingBalance;
  const enrichedLedger = data.ledger.map((row) => {
    runningBalance = runningBalance + row.credit - row.debit; // For suppliers, credit increases what we owe
    return { ...row, balance: runningBalance };
  });

  return {
    supplierId,
    period: { start, end },
    openingBalance: data.openingBalance,
    closingBalance: runningBalance,
    transactions: enrichedLedger,
  };
}

export function getCashBankBook(modeType, startDate, endDate) {
  if (!["cash", "bank"].includes(modeType))
    throw new Error("Mode must be 'cash' or 'bank'");
  const { start, end } = getDefaultDateRange(startDate, endDate);

  const data = AccountingRepo.getCashBankBook(modeType, start, end);

  // Calculate Running Balance
  let runningBalance = data.openingBalance;
  const enrichedLedger = data.ledger.map((row) => {
    runningBalance = runningBalance + row.inflow - row.outflow;
    return { ...row, balance: runningBalance };
  });

  return {
    bookType: modeType,
    period: { start, end },
    openingBalance: data.openingBalance,
    closingBalance: runningBalance,
    transactions: enrichedLedger,
  };
}

export function getStockValuation() {
  return AccountingRepo.getStockValuation();
}

export function getStockSummaryReport(startDate, endDate) {
  const { start, end } = getDefaultDateRange(startDate, endDate);
  const data = AccountingRepo.getStockSummaryReport(start, end);

  return {
    period: { start, end },
    records: data,
  };
}
