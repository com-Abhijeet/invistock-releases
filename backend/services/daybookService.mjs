import * as DayBookRepo from "../repositories/daybookRepository.mjs";

/**
 * Generates the full Day Book report with running balances.
 */
export function getDayBookService(date) {
  // 1. Get Opening Balance
  const openingBalance = DayBookRepo.getOpeningBalance(date);

  // 2. Get Transactions
  const rawTransactions = DayBookRepo.getDayBookTransactions(date);

  // 3. Calculate Running Balance
  let runningBalance = openingBalance;
  let totalCredit = 0;
  let totalDebit = 0;

  const transactionsWithBalance = rawTransactions.map((t) => {
    const credit = t.credit || 0;
    const debit = t.debit || 0;

    runningBalance = runningBalance + credit - debit;

    totalCredit += credit;
    totalDebit += debit;

    return {
      ...t,
      balance: runningBalance,
    };
  });

  return {
    openingBalance,
    closingBalance: runningBalance,
    totalIn: totalCredit,
    totalOut: totalDebit,
    netChange: totalCredit - totalDebit,
    transactions: transactionsWithBalance,
  };
}
