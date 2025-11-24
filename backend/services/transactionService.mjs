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

import { getSaleById } from "../repositories/salesRepository.mjs";
import { getPurchaseById } from "../repositories/purchaseRepository.mjs";

/**
 * @description Creates a new transaction record, applying business and GST logic.
 * @param {object} transactionData - The data for the new transaction.
 * @returns {Promise<object>} The newly created transaction record.
 * @throws {Error} If transaction data is invalid or business rules are violated.
 */
export async function createTransactionService(transactionData) {
  try {
    const { type, bill_id, amount, bill_type } = transactionData;

    if (!bill_id || !bill_type) {
      throw new Error("All transactions must be linked to an original bill.");
    }

    switch (type) {
      case "payment_in":
        // Payment towards a sale must be positive
        if (bill_type !== "sale" || amount <= 0) {
          throw new Error(
            "Payments-in must be for a sale and have a positive amount."
          );
        }
        break;
      case "payment_out":
        // Payment towards a purchase must be positive
        if (bill_type !== "purchase" || amount <= 0) {
          throw new Error(
            "Payments-out must be for a purchase and have a positive amount."
          );
        }
        break;
      case "credit_note":
        // Credit notes are for sales and must have a negative amount
        if (bill_type !== "sale" || amount >= 0) {
          throw new Error(
            "Credit notes must be for a sale and have a negative amount."
          );
        }
        break;
      case "debit_note":
        // Debit notes are for purchases and must have a negative amount
        if (bill_type !== "purchase" || amount >= 0) {
          throw new Error(
            "Debit notes must be for a purchase and have a negative amount."
          );
        }
        break;
      default:
        throw new Error("Invalid transaction type.");
    }

    // Determine which repository to call based on bill_type
    let originalBill;
    if (bill_type === "sale") {
      originalBill = await getSaleById(bill_id);
    } else if (bill_type === "purchase") {
      originalBill = await getPurchaseById(bill_id);
    } else {
      throw new Error(`Invalid bill_type provided: ${bill_type}`);
    }

    if (!originalBill) {
      throw new Error("Original bill not found.");
    }

    // Calculate the current paid amount and adjustments for the bill
    const relatedTransactions = getTransactionsByRelatedIdRepo(
      bill_id,
      bill_type
    );
    const totalPaymentsAndNotes = relatedTransactions.reduce(
      (sum, t) => sum + t.amount
    );

    // If the new transaction is a payment, ensure it doesn't over-pay the bill
    // ✅ FIX: Use the correct property name `total_amount` from the sale/purchase record
    if (
      type.startsWith("payment") &&
      totalPaymentsAndNotes + Math.abs(amount) > originalBill.total_amount
    ) {
      throw new Error(
        "This payment would result in an over-payment of the bill."
      );
    }

    // --- Create the transaction record (Unchanged) ---
    const result = createTransactionRepo(transactionData);
    return getTransactionByIdRepo(result.lastInsertRowid);
  } catch (error) {
    console.error("Error in createTransactionService:", error.message);
    throw new Error("Failed to create transaction: " + error.message);
  }
}

/**
 * @description Retrieves a single transaction by its ID.
 * @param {number} id - The ID of the transaction.
 * @returns {object|null} The transaction object, or null if not found.
 * @throws {Error} If fetching the transaction fails.
 */
export async function getTransactionByIdService(id) {
  try {
    const transaction = getTransactionByIdRepo(id);
    return transaction || null;
  } catch (error) {
    console.error("Error in getTransactionByIdService:", error.message);
    throw new Error("Failed to fetch transaction: " + error.message);
  }
}

/**
 * @description Retrieves a paginated list of transactions with optional filters.
 * @param {object} filters - An object containing filtering and pagination options.
 * @returns {object} An object containing the filtered records and the total count.
 * @throws {Error} If fetching transactions fails.
 */
export async function getAllTransactionsService(filters) {
  try {
    const result = getAllTransactionsRepo(filters);
    return result;
  } catch (error) {
    console.error("Error in getAllTransactionsService:", error.message);
    throw new Error("Failed to fetch transactions: " + error.message);
  }
}

/**
 * @description Retrieves all transactions related to a specific original transaction.
 * @param {number} relatedId - The ID of the original transaction (sale/purchase).
 * @param {string} entityType - The type of the entity ('customer' or 'supplier').
 * @returns {Array<object>} An array of related transaction records.
 * @throws {Error} If fetching related transactions fails.
 */
export async function getTransactionsByRelatedIdService(relatedId, entityType) {
  try {
    return getTransactionsByRelatedIdRepo(relatedId, entityType);
  } catch (error) {
    console.error("Error in getTransactionsByRelatedIdService:", error.message);
    throw new Error("Failed to fetch related transactions: " + error.message);
  }
}

/**
 * @description Updates an existing transaction record by its ID.
 * @param {number} id - The ID of the transaction to update.
 * @param {object} updatedData - The data to update.
 * @returns {object} The updated transaction record.
 * @throws {Error} If the update fails.
 */
export async function updateTransactionService(id, updatedData) {
  try {
    const result = updateTransactionRepo(id, updatedData);
    if (result.changes === 0) {
      throw new Error(`Transaction with ID ${id} not found.`);
    }
    return getTransactionByIdRepo(id);
  } catch (error) {
    console.error("Error in updateTransactionService:", error.message);
    throw new Error("Transaction update failed: " + error.message);
  }
}

/**
 * @description Soft-deletes a transaction record by updating its status to 'deleted'.
 * @param {number} id - The ID of the transaction to soft-delete.
 * @returns {object} The result of the deletion operation.
 * @throws {Error} If the transaction is not found or deletion fails.
 */
export async function deleteTransactionService(id) {
  try {
    const result = deleteTransactionRepo(id);
    if (result.changes === 0) {
      throw new Error(`Transaction with ID ${id} not found.`);
    }
    return { message: "Transaction soft-deleted successfully." };
  } catch (error) {
    console.error("Error in deleteTransactionService:", error.message);
    throw new Error("Failed to soft-delete transaction: " + error.message);
  }
}

/**
 * @description Retrieves a customer's account summary with optional filters.
 * @param {number} customerId - The ID of the customer.
 * @param {object} [filters={}] - Optional date and other filters.
 * @returns {object} A summary of the customer's financial history.
 * @throws {Error} If the customer ID is invalid or fetching fails.
 */
export async function getCustomerAccountSummaryService(customerId, filters) {
  try {
    if (isNaN(customerId) || customerId <= 0) {
      throw new Error("Invalid customer ID.");
    }
    return getCustomerAccountSummaryRepo(customerId, filters);
  } catch (error) {
    console.error("Error in getCustomerAccountSummaryService:", error.message);
    throw new Error("Failed to get customer account summary.");
  }
}

/**
 * @description Retrieves a supplier's account summary with optional filters.
 * @param {number} supplierId - The ID of the supplier.
 * @param {object} [filters={}] - Optional date and other filters.
 * @returns {object} A summary of the supplier's financial history.
 * @throws {Error} If the supplier ID is invalid or fetching fails.
 */
export async function getSupplierAccountSummaryService(supplierId, filters) {
  try {
    if (isNaN(supplierId) || supplierId <= 0) {
      throw new Error("Invalid supplier ID.");
    }
    return getSupplierAccountSummaryRepo(supplierId, filters);
  } catch (error) {
    console.error("Error in getSupplierAccountSummaryService:", error.message);
    throw new Error("Failed to get supplier account summary.");
  }
}

/**
 * @description Retrieves a paginated list of transactions for a given entity (customer/supplier).
 * @param {object} filters - All filter and pagination parameters.
 * @returns {object} An object containing paginated records and the total count.
 * @throws {Error} If `entityId` or `entityType` is missing.
 */
export async function getEntityTransactionsService(filters) {
  try {
    const { entityId, entityType } = filters;
    if (!entityId || !entityType) {
      throw new Error("Entity ID and Type are required.");
    }
    return getEntityTransactionsRepo(filters);
  } catch (error) {
    console.error("Error in getEntityTransactionsService:", error.message);
    throw new Error("Failed to get entity transactions.");
  }
}
