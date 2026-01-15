import * as customerService from "../services/customerService.mjs";
import xlsx from "xlsx";
import * as CustomerRepo from "../repositories/customerRepository.mjs";
/**
 * @description Creates a new customer.
 * @route POST /api/customers
 * @access Private
 * @param {object} req - Express request object, containing the customer data in the body.
 * @param {object} res - Express response object.
 */
export const createCustomer = async (req, res) => {
  try {
    // Pass the request body to the service layer for processing
    const customer = await customerService.createCustomer(req.body);

    return res
      .status(201)
      .json({ message: "Customer created successfully", data: customer });
  } catch (error) {
    console.error(
      `[BACKEND] - CUSTOMER CONTROLLER - ERROR IN CREATING CUSTOMER ${error}`
    );
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      message:
        error.message || "An unexpected error occurred creating the customer.",
    });
  }
};

/**
 * @description Fetches a paginated list of customers with optional search.
 * @route GET /api/customers
 * @param {object} req - Express request object (query: page, limit, q).
 * @param {object} res - Express response object.
 * @returns {object} Response with paginated customer data.
 */
export const getAllCustomersController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = req.query.q || "";
    const all = req.query.all === "true";

    const result = await customerService.getAllCustomersService({
      page,
      limit,
      query,
      all,
    });

    return res.status(200).json({
      status: "success",
      message: "Customers fetched successfully.",
      data: result.records,
      totalRecords: result.totalRecords,
    });
  } catch (error) {
    console.error(
      `[BACKEND] - CUSTOMER CONTROLLER - ERROR IN GETTING ALL CUSTOMERS ${error}`
    );
    return res
      .status(500)
      .json({ status: "error", message: "Failed to fetch customers." });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const id = req.params.id;
    const customer = await customerService.getCustomerById(id);
    return res
      .status(200)
      .json({ message: "Customer Fetched Successfully", data: customer });
  } catch (error) {
    console.error(
      `[BACKEND] - CUSTOMER CONTROLLER - ERROR IN GETTING CUSTOMER BY ID ${error}`
    );
    return res.status(500).json({ message: "Error Fetching Customer", error });
  }
};

export const getCustomerByPhone = async (req, res) => {
  try {
    const phone = req.params.phone;
    const customer = await customerService.getCustomerByPhone(phone);
    return res.status(200).json({ message: "customer fetched", customer });
  } catch (error) {
    console.error(
      `[BACKEND] - CUSTOMER CONTROLLER - ERROR IN GETTING CUSTOMER BY PHONE ${error}`
    );
    return res.status(500).json({ message: "Error Fetching Customer", error });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    const customer = await customerService.updateCustomer(id, req.body);
    return res
      .status(200)
      .json({ message: "Customer Updated Successfully", customer });
  } catch (error) {
    console.error(
      `[BACKEND] - CUSTOMER CONTROLLER - ERROR IN UPDATING CUSTOMER ${error}`
    );
    return res.status(500).json({ message: "Error Updating Customer", error });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id == null) {
      return res.status(400).json({ message: "Invalid Customer ID" });
    }
    await customerService.deleteCustomer(id);
    return res.status(200).json({ message: "Customer Deleted Successfully" });
  } catch (error) {
    console.error(
      `[BACKEND] - CUSTOMER CONTROLLER - ERROR IN DELETING CUSTOMER ${error}`
    );
    return res.status(500).json({ message: "Error Deleting Customer", error });
  }
};
/**
 * Handles the bulk import of customers from an Excel file.
 */
export async function importCustomersController(req, res) {
  try {
    const { filePath, mappings } = req.body;

    if (!filePath || !mappings) {
      return res.status(400).json({
        success: false,
        error: "File path and column mappings are required.",
      });
    }

    // 1. Read the Excel file content
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: true,
      rawNumbers: true,
    });

    // 2. Map the raw data to the structure the repository expects
    const customers = jsonData.map((row) => {
      const customer = {};
      for (const dbField in mappings) {
        const excelHeader = mappings[dbField];
        if (excelHeader && row[excelHeader] !== undefined) {
          customer[dbField] = row[excelHeader];
        }
      }
      return customer;
    });

    // 3. Call the bulk insert function
    const result = CustomerRepo.bulkInsertCustomers(customers);

    // 4. Send success response
    res.status(200).json({
      success: true,
      message: `${result.changes} customers imported successfully!`,
    });
  } catch (error) {
    console.error(
      `[BACKEND] - CUSTOMER CONTROLLER - ERROR IN IMPORTING CUSTOMERS ${error}`
    );
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getCustomerOverdueSummaryController(req, res) {
  try {
    const data = customerService.getOverdueSummary();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export const getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Call the service method (assuming it exists as per your snippet)
    const data = await customerService.getCustomerLedgerService(id, {
      startDate,
      endDate,
    });

    res.json({ success: true, ...data });
  } catch (error) {
    console.error("Error getting customer ledger:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export async function getCustomersFinancials(req, res) {
  try {
    const result = await customerService.getCustomerFinancialsList(req.query);

    // Explicitly construct the response to match frontend expectations
    return res.status(200).json({
      status: "success",
      message: "Customer Financials Fetched Successfully",
      data: result.data, // The array of customers
      pagination: result.pagination, // The pagination metadata
    });
  } catch (error) {
    console.error("Error fetching customer financials:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}
