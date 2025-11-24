import * as transactionsService from "../services/transactionService.mjs";

/**
 * @description Creates a new transaction record.
 * @route POST /api/transactions
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {object} The newly created transaction record.
 */
export async function createTransactionController(req, res) {
  try {
    const transactionData = req.body;
    if (!transactionData || !transactionData.type || !transactionData.amount) {
      return res.status(400).json({
        status: "error",
        message: "Missing required transaction data.",
      });
    }
    const newTransaction = await transactionsService.createTransactionService(
      transactionData
    );
    return res.status(201).json({
      status: "success",
      message: "Transaction created successfully.",
      data: newTransaction,
    });
  } catch (error) {
    console.error("Error in createTransactionController:", error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to create transaction." });
  }
}

/**
 * @description Retrieves a paginated list of transactions with optional filters.
 * @route GET /api/transactions
 * @param {object} req - Express request object (query parameters for filters).
 * @param {object} res - Express response object.
 * @returns {object} A paginated list of transactions.
 */
export async function getAllTransactionsController(req, res) {
  try {
    const filters = {
      page: parseInt(req.query.page || "1"),
      limit: parseInt(req.query.limit || "20"),
      query: req.query.query || null,
      type: req.query.type || null,
      status: req.query.status || null,
      filter: req.query.filter || null,
      year: req.query.year || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      all: req.query.all === "true",
    };
    const result = await transactionsService.getAllTransactionsService(filters);
    return res.status(200).json({
      status: "success",
      message: "Transactions fetched successfully.",
      data: result.records,
      totalRecords: result.totalRecords,
    });
  } catch (error) {
    console.error("Error in getAllTransactionsController:", error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to fetch transactions." });
  }
}

/**
 * @description Retrieves a single transaction record by its ID.
 * @route GET /api/transactions/:id
 * @param {object} req - Express request object (params: id).
 * @param {object} res - Express response object.
 * @returns {object} The transaction object.
 */
export async function getTransactionByIdController(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid transaction ID." });
    }
    const transaction = await transactionsService.getTransactionByIdService(id);
    if (!transaction) {
      return res
        .status(404)
        .json({ status: "error", message: "Transaction not found." });
    }
    return res.status(200).json({
      status: "success",
      message: "Transaction fetched successfully.",
      data: transaction,
    });
  } catch (error) {
    console.error("Error in getTransactionByIdController:", error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to fetch transaction." });
  }
}

/**
 * @description Retrieves all transactions related to a specific original transaction ID.
 * @route GET /api/transactions/related/:id
 * @param {object} req - Express request object (params: id, query: entityType).
 * @param {object} res - Express response object.
 * @returns {object} An array of related transactions.
 */
export async function getTransactionsByRelatedIdController(req, res) {
  try {
    const relatedId = parseInt(req.params.id);
    const { entityType } = req.query;
    if (isNaN(relatedId) || !entityType) {
      return res.status(400).json({
        status: "error",
        message: "Invalid related ID or entity type.",
      });
    }
    const transactions =
      await transactionsService.getTransactionsByRelatedIdService(
        relatedId,
        entityType
      );
    return res.status(200).json({
      status: "success",
      message: "Related transactions fetched successfully.",
      data: transactions,
    });
  } catch (error) {
    console.error(
      "Error in getTransactionsByRelatedIdController:",
      error.message
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch related transactions.",
    });
  }
}

/**
 * @description Updates an existing transaction record by its ID.
 * @route PUT /api/transactions/:id
 * @param {object} req - Express request object (params: id, body: updatedData).
 * @param {object} res - Express response object.
 * @returns {object} The updated transaction record.
 */
export async function updateTransactionController(req, res) {
  try {
    const id = parseInt(req.params.id);
    const updatedData = req.body;
    if (isNaN(id) || Object.keys(updatedData).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID or no data provided for update.",
      });
    }
    const updatedTransaction =
      await transactionsService.updateTransactionService(id, updatedData);
    return res.status(200).json({
      status: "success",
      message: "Transaction updated successfully.",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error in updateTransactionController:", error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to update transaction." });
  }
}

/**
 * @description Soft-deletes a transaction record by its ID.
 * @route DELETE /api/transactions/:id
 * @param {object} req - Express request object (params: id).
 * @param {object} res - Express response object.
 * @returns {object} A success message.
 */
export async function deleteTransactionController(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid transaction ID." });
    }
    await transactionsService.deleteTransactionService(id);
    return res.status(200).json({
      status: "success",
      message: "Transaction soft-deleted successfully.",
    });
  } catch (error) {
    console.error("Error in deleteTransactionController:", error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to delete transaction." });
  }
}

/**
 * @description Gets a customer's account summary.
 * @route GET /api/customers/:id/summary
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {object} Response with the customer's account summary.
 */
export async function getCustomerAccountSummaryController(req, res) {
  try {
    const customerId = parseInt(req.params.id);
    const summary = await transactionsService.getCustomerAccountSummaryService(
      customerId,
      req.query
    );
    return res.status(200).json({ status: "success", data: summary });
  } catch (error) {
    console.error(
      "Error in getCustomerAccountSummaryController:",
      error.message
    );
    return res
      .status(500)
      .json({ status: "error", message: "Failed to fetch customer summary." });
  }
}

/**
 * @description Gets a supplier's account summary.
 * @route GET /api/suppliers/:id/summary
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {object} Response with the supplier's account summary.
 */
export async function getSupplierAccountSummaryController(req, res) {
  try {
    const supplierId = parseInt(req.params.id);
    const summary = await transactionsService.getSupplierAccountSummaryService(
      supplierId,
      req.query
    );
    return res.status(200).json({ status: "success", data: summary });
  } catch (error) {
    console.error(
      "Error in getSupplierAccountSummaryController:",
      error.message
    );

    return res
      .status(500)
      .json({ status: "error", message: "Failed to fetch supplier summary." });
  }
}

/**
 * @description Gets transactions for a specific customer or supplier.
 * @route GET /api/transactions/entity/:id
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {object} Response with a paginated list of transactions.
 */
export async function getEntityTransactionsController(req, res) {
  try {
    const filters = {
      entityId: parseInt(req.params.id),
      entityType: req.query.entityType,
      page: parseInt(req.query.page || "1"),
      limit: parseInt(req.query.limit || "20"),
      query: req.query.query || null,
      type: req.query.type || null,
      status: req.query.status || null,
      filter: req.query.filter || null,
      year: req.query.year || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      all: req.query.all === "false",
    };

    console.dir(req.query, 5);

    if (isNaN(filters.entityId) || !filters.entityType) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid entity ID or type." });
    }

    const result = await transactionsService.getEntityTransactionsService(
      filters
    );
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    console.error("Error in getEntityTransactionsController:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
}
