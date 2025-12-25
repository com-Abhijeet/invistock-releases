import * as transactionsService from "../services/transactionService.mjs";

/**
 * @description Standardized Response Helper
 */
const sendResponse = (res, statusCode, status, message, data = null) => {
  return res.status(statusCode).json({ status, message, data });
};

/**
 * @description Creates a new transaction record.
 * @route POST /api/transactions
 */
export async function createTransactionController(req, res) {
  try {
    const transactionData = req.body;

    // Controller level 'Required Field' check
    const required = [
      "type",
      "amount",
      "bill_id",
      "bill_type",
      "entity_id",
      "entity_type",
    ];
    const missing = required.filter((field) => !transactionData[field]);

    if (missing.length > 0) {
      return sendResponse(
        res,
        400,
        "error",
        `Missing required fields: ${missing.join(", ")}`
      );
    }

    const newTransaction = await transactionsService.createTransactionService(
      transactionData
    );

    return sendResponse(
      res,
      201,
      "success",
      "Transaction created successfully.",
      newTransaction
    );
  } catch (error) {
    // Distinguish between validation errors (400) and system errors (500)
    // If error message contains 'Overpayment', it's a 400 (Bad Request)
    const isValidation =
      error.message.includes("Overpayment") ||
      error.message.includes("must be") ||
      error.message.includes("not found");
    const code = isValidation ? 400 : 500;

    return sendResponse(res, code, "error", error.message);
  }
}

/**
 * @description Retrieves a paginated list of transactions.
 * @route GET /api/transactions
 */
export async function getAllTransactionsController(req, res) {
  try {
    // Parse filters
    const filters = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      query: req.query.query || "",
      type: req.query.type,
      status: req.query.status,
      filter: req.query.filter,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      all: req.query.all === "true",
    };

    const result = await transactionsService.getAllTransactionsService(filters);

    // Custom structure for lists
    return res.status(200).json({
      status: "success",
      message: "Transactions fetched.",
      data: result.records,
      totalRecords: result.totalRecords,
    });
  } catch (error) {
    return sendResponse(res, 500, "error", error.message);
  }
}

/**
 * @description Retrieves a single transaction.
 * @route GET /api/transactions/:id
 */
export async function getTransactionByIdController(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return sendResponse(res, 400, "error", "Invalid ID");

    const transaction = await transactionsService.getTransactionByIdService(id);
    return sendResponse(
      res,
      200,
      "success",
      "Transaction fetched.",
      transaction
    );
  } catch (error) {
    return sendResponse(res, 404, "error", error.message);
  }
}

/**
 * @description Retrieves related transactions.
 * @route GET /api/transactions/related/:id
 */
export async function getTransactionsByRelatedIdController(req, res) {
  try {
    const relatedId = Number(req.params.id);
    const { entityType } = req.query; // 'sale' or 'purchase' technically, but route params say entityType?
    // Wait, the route says /related/:id. The service expects (billId, billType).
    // The previous code had (relatedId, entityType) but the logic inside used it as bill_id/bill_type.
    // Let's stick to the convention: params.id = bill_id, query.type = bill_type.
    // The query param was 'entityType' in previous code. I will check.
    // Previous code: getTransactionsByRelatedId(relatedId, entityType) -> query: WHERE bill_id = ? AND entity_type = ?
    // Wait, transaction table has `bill_type` AND `entity_type`.
    // If I want transactions for Sale #1, I should query by bill_id=1 AND bill_type='sale'.

    // CORRECTING LOGIC:
    // User requests: /api/transactions/related/101?type=sale
    const billType = req.query.type || req.query.entityType; // Fallback support

    if (isNaN(relatedId) || !billType) {
      return sendResponse(res, 400, "error", "Invalid Bill ID or Type.");
    }

    // Using the service method
    const transactions =
      await transactionsService.getTransactionsByRelatedIdService(
        relatedId,
        billType
      );
    return sendResponse(
      res,
      200,
      "success",
      "Related transactions fetched.",
      transactions
    );
  } catch (error) {
    return sendResponse(res, 500, "error", error.message);
  }
}

/**
 * @description Updates a transaction.
 * @route PUT /api/transactions/:id
 */
export async function updateTransactionController(req, res) {
  try {
    const id = Number(req.params.id);
    const updatedData = req.body;

    if (isNaN(id)) return sendResponse(res, 400, "error", "Invalid ID");

    const updated = await transactionsService.updateTransactionService(
      id,
      updatedData
    );
    return sendResponse(res, 200, "success", "Transaction updated.", updated);
  } catch (error) {
    return sendResponse(res, 400, "error", error.message);
  }
}

/**
 * @description Deletes a transaction.
 * @route DELETE /api/transactions/:id
 */
export async function deleteTransactionController(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return sendResponse(res, 400, "error", "Invalid ID");

    const result = await transactionsService.deleteTransactionService(id);
    return sendResponse(res, 200, "success", result.message);
  } catch (error) {
    return sendResponse(res, 500, "error", error.message);
  }
}

// --- Summaries ---

export async function getCustomerAccountSummaryController(req, res) {
  try {
    const id = Number(req.params.id);
    const summary = await transactionsService.getCustomerAccountSummaryService(
      id,
      req.query
    );
    return sendResponse(res, 200, "success", "Summary fetched", summary);
  } catch (error) {
    return sendResponse(res, 500, "error", error.message);
  }
}

export async function getSupplierAccountSummaryController(req, res) {
  try {
    const id = Number(req.params.id);
    const summary = await transactionsService.getSupplierAccountSummaryService(
      id,
      req.query
    );
    return sendResponse(res, 200, "success", "Summary fetched", summary);
  } catch (error) {
    return sendResponse(res, 500, "error", error.message);
  }
}

export async function getEntityTransactionsController(req, res) {
  try {
    const filters = {
      entityId: Number(req.params.id),
      entityType: req.query.entityType,
      page: Number(req.query.page),
      limit: Number(req.query.limit),
      all: req.query.all === "true",
    };
    const result = await transactionsService.getEntityTransactionsService(
      filters
    );
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return sendResponse(res, 500, "error", error.message);
  }
}
