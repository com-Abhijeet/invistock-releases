import {
  createTransaction as createTransactionRepo,
  getTransactionById as getTransactionByIdRepo,
  getAllTransactions as getAllTransactionsRepo,
  getTransactionsByRelatedId as getTransactionsByRelatedIdRepo,
  updateTransaction as updateTransactionRepo,
  deleteTransaction as deleteTransactionRepo,
  getCustomerAccountSummary as getCustomerAccountSummaryRepo,
  getSupplierAccountSummary as getSupplierAccountSummaryRepo,
  getEntityTransactions as getEntityTransactionsRepo,
} from "../repositories/transactionRepository.mjs";

// ✅ Updated Imports to include Update methods
import { getSaleById, updateSale } from "../repositories/salesRepository.mjs";
import {
  getPurchaseById,
  updatePurchase,
} from "../repositories/purchaseRepository.mjs";

/**
 * @description Creates a new transaction record, applying rigid business and GST logic.
 * @param {object} transactionData - The data for the new transaction.
 * @returns {Promise<object>} The newly created transaction record.
 * @throws {Error} If transaction data is invalid, bills are missing, or overpayment occurs.
 */
export async function createTransactionService(transactionData) {
  try {
    const { type, bill_id, bill_type, amount, payment_mode } = transactionData;
    console.log(transactionData);

    // 1. Basic Validation
    if (!bill_id || !bill_type) {
      throw new Error(
        "Transaction must be linked to a valid Bill ID and Bill Type.",
      );
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error("Transaction amount must be a positive number.");
    }
    if (!payment_mode) {
      throw new Error("Payment mode is required.");
    }

    // 2. Fetch the Original Bill (Sale or Purchase)
    let originalBill = null;
    let totalBillAmount = 0;

    if (bill_type === "sale") {
      originalBill = await getSaleById(bill_id);
    } else if (bill_type === "purchase") {
      originalBill = await getPurchaseById(bill_id);
    } else if (bill_type === "sale_non_gst") {
      throw new Error(
        "Non-GST Sales are not yet supported for automated transaction validation.",
      );
    } else {
      throw new Error(`Invalid bill_type provided: ${bill_type}`);
    }

    if (!originalBill) {
      throw new Error(`${bill_type} with ID ${bill_id} not found.`);
    }

    totalBillAmount = originalBill.total_amount || 0;

    // 3. Logic Validation based on Type & Overpayment Check
    const relatedTransactions = await getTransactionsByRelatedIdRepo(
      bill_id,
      bill_type,
    );

    let totalPaid = 0;
    let totalAdjustments = 0; // Credit Notes or Debit Notes

    relatedTransactions.forEach((t) => {
      // Skip deleted transactions
      if (t.status === "deleted" || t.status === "cancelled") return;

      if (t.type === "payment_in" || t.type === "payment_out") {
        totalPaid += t.amount;
      } else if (t.type === "credit_note" || t.type === "debit_note") {
        totalAdjustments += t.amount;
      }
    });

    const netPayable = totalBillAmount - totalAdjustments;
    const currentBalance = netPayable - totalPaid;

    // Precision helper
    const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
    const pendingBalance = round(currentBalance);

    // --- Validation Switch ---
    switch (type) {
      case "payment_in":
        // Valid for Sales (Receiving customer payment) OR Purchases (Receiving refund from supplier)
        if (bill_type === "sale") {
          // Cannot overcharge a customer
          if (amount > pendingBalance) {
            throw new Error(
              `Overpayment: You are trying to receive ₹${amount}, but the pending balance is only ₹${pendingBalance}.`,
            );
          }
        } else if (bill_type === "purchase") {
          // Supplier is refunding us cash. We cannot get back more than we actually paid.
          if (amount > totalPaid) {
            throw new Error(
              "Refund Error: Cannot receive a cash refund larger than what was actually paid to the supplier.",
            );
          }
        }
        break;

      case "payment_out":
        // Valid for Purchases (Paying a supplier) OR Sales (Giving cash refund to customer)
        if (bill_type === "purchase") {
          // Cannot overpay a supplier
          if (amount > pendingBalance) {
            throw new Error(
              `Overpayment: You are trying to pay ₹${amount}, but the pending balance is only ₹${pendingBalance}.`,
            );
          }
        } else if (bill_type === "sale") {
          // We are refunding a customer cash. We cannot refund more than they actually paid.
          if (amount > totalPaid) {
            throw new Error(
              "Refund Error: Cannot issue a cash refund larger than what the customer actually paid.",
            );
          }
        }
        break;

      case "credit_note":
        // Credit notes strictly reduce Sale values
        if (bill_type !== "sale")
          throw new Error("Credit Notes are only valid for Sales.");
        if (amount > totalBillAmount - totalAdjustments) {
          throw new Error(
            "Credit Note amount cannot exceed the remaining net bill value.",
          );
        }
        break;

      case "debit_note":
        // Debit notes strictly reduce Purchase values
        if (bill_type !== "purchase")
          throw new Error("Debit Notes are only valid for Purchases.");
        if (amount > totalBillAmount - totalAdjustments) {
          throw new Error(
            "Debit Note amount cannot exceed the remaining net bill value.",
          );
        }
        break;

      default:
        throw new Error("Invalid transaction type.");
    }

    // 4. Create Transaction
    const result = createTransactionRepo(transactionData);

    // 5. ✅ NEW: Sync Bill Status and Paid Amount
    await syncBillFinancials(bill_id, bill_type);

    // 6. Return the new record
    return getTransactionByIdRepo(result.lastInsertRowid);
  } catch (error) {
    console.error("[TransactionService] Create Failed:", error.message);
    throw new Error(error.message);
  }
}

/**
 * @description Retrieves a single transaction by its ID.
 */
export async function getTransactionByIdService(id) {
  try {
    const transaction = getTransactionByIdRepo(id);
    if (!transaction) throw new Error("Transaction not found.");
    return transaction;
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * @description Retrieves a paginated list of transactions.
 */
export async function getAllTransactionsService(filters) {
  try {
    return getAllTransactionsRepo(filters);
  } catch (error) {
    throw new Error("Failed to fetch transactions: " + error.message);
  }
}

/**
 * @description Retrieves related transactions.
 */
export async function getTransactionsByRelatedIdService(relatedId, entityType) {
  try {
    return await getTransactionsByRelatedIdRepo(relatedId, entityType);
  } catch (error) {
    throw new Error("Failed to fetch related transactions: " + error.message);
  }
}

/**
 * @description Updates a transaction. STRICTLY prohibits updating 'Bill ID' or 'Type'.
 */
export async function updateTransactionService(id, updatedData) {
  try {
    // 1. Fetch existing
    const existing = getTransactionByIdRepo(id);
    if (!existing) throw new Error(`Transaction #${id} not found.`);
    if (existing.status === "deleted")
      throw new Error("Cannot update a deleted transaction.");

    // 2. Prevent changing critical fields that would break the audit trail
    if (updatedData.bill_id && updatedData.bill_id !== existing.bill_id) {
      throw new Error(
        "Modification of Linked Bill ID is not allowed. Delete and recreate if necessary.",
      );
    }
    if (updatedData.type && updatedData.type !== existing.type) {
      throw new Error("Modification of Transaction Type is not allowed.");
    }

    // 3. Execute Update
    const result = updateTransactionRepo(id, updatedData);

    // 4. ✅ NEW: Sync Bill Status (Logic re-evaluates totals)
    // We sync the bill linked to the transaction
    if (updatedData.amount || updatedData.status) {
      await syncBillFinancials(existing.bill_id, existing.bill_type);
    }

    return getTransactionByIdRepo(id);
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * @description Soft-deletes a transaction.
 */
export async function deleteTransactionService(id) {
  try {
    const existing = getTransactionByIdRepo(id);
    if (!existing) throw new Error("Transaction not found.");

    // Check if already deleted
    if (existing.status === "deleted")
      return { message: "Transaction already deleted." };

    const result = deleteTransactionRepo(id);
    if (result.changes === 0)
      throw new Error("Database failed to delete record.");

    // 5. ✅ NEW: Sync Bill Status (Revert status if needed)
    await syncBillFinancials(existing.bill_id, existing.bill_type);

    return { message: "Transaction deleted successfully." };
  } catch (error) {
    throw new Error(error.message);
  }
}

// --- Wrappers for Account Summaries ---

export async function getCustomerAccountSummaryService(customerId, filters) {
  if (!customerId || isNaN(customerId)) throw new Error("Invalid Customer ID");
  return getCustomerAccountSummaryRepo(customerId, filters);
}

export async function getSupplierAccountSummaryService(supplierId, filters) {
  if (!supplierId || isNaN(supplierId)) throw new Error("Invalid Supplier ID");
  return getSupplierAccountSummaryRepo(supplierId, filters);
}

export async function getEntityTransactionsService(filters) {
  if (!filters.entityId || !filters.entityType)
    throw new Error("Entity ID and Type are required.");
  return getEntityTransactionsRepo(filters);
}

/**
 * @private
 * @description Helper function to recalculate the financial status of a bill (Sale/Purchase)
 * and update its 'paid_amount' and 'status' in the database.
 */
async function syncBillFinancials(billId, billType) {
  try {
    let bill = null;
    let updateFn = null;

    // 1. Identify Bill and Update Function
    if (billType === "sale") {
      bill = await getSaleById(billId);
      updateFn = updateSale;
    } else if (billType === "purchase") {
      bill = await getPurchaseById(billId);
      updateFn = updatePurchase;
    } else {
      return; // Not a supported bill type
    }

    if (!bill) return;

    // 2. Fetch All Valid Transactions
    const transactions = await getTransactionsByRelatedIdRepo(billId, billType);

    let totalPaymentIn = 0;
    let totalPaymentOut = 0;
    let totalCreditNotes = 0;
    let totalDebitNotes = 0;

    transactions.forEach((t) => {
      // Ignore deleted transactions
      if (t.status === "deleted" || t.status === "cancelled") return;

      if (t.type === "payment_in") totalPaymentIn += t.amount;
      if (t.type === "payment_out") totalPaymentOut += t.amount;
      if (t.type === "credit_note") totalCreditNotes += t.amount;
      if (t.type === "debit_note") totalDebitNotes += t.amount;
    });

    // 3. Calculate Reconciled Logic
    let safeNet = 0;
    let safePaid = 0;

    if (billType === "sale") {
      // Sales Net: Gross + Extra Charges (DN) - Returns (CN)
      safeNet = bill.total_amount + totalDebitNotes - totalCreditNotes;
      // Paid by Customer: Cash Received - Cash Refunded
      safePaid = totalPaymentIn - totalPaymentOut;
    } else if (billType === "purchase") {
      // Purchase Net: Gross + Extra Charges (CN) - Returns (DN)
      safeNet = bill.total_amount + totalCreditNotes - totalDebitNotes;
      // Paid to Supplier: Cash Sent - Cash Refunded (Received back)
      safePaid = totalPaymentOut - totalPaymentIn;
    }

    // Precision rounding to handle float mishaps
    const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
    safeNet = round(safeNet);
    safePaid = round(safePaid);

    let newStatus = "pending";

    // Status Assignment Logic
    if (safePaid >= safeNet && safeNet > 0) {
      newStatus = "paid";
    } else if (safePaid > 0) {
      newStatus = "partial";
    } else {
      newStatus = "pending";
    }

    // Handle fully returned status
    if (safeNet <= 0 && (totalCreditNotes > 0 || totalDebitNotes > 0)) {
      newStatus = "returned";
    }

    // 4. Update the Parent Record
    // We update both status and the cached paid_amount column
    await updateFn(billId, {
      status: newStatus,
      paid_amount: safePaid,
    });

    console.log(
      `[TransactionSync] Updated ${billType} #${bill.reference_no}: Status=${newStatus}, Paid=${safePaid}, Net=${safeNet}`,
    );
  } catch (error) {
    console.error(
      `[TransactionSync] Failed to sync ${billType} #${billId}:`,
      error,
    );
  }
}
