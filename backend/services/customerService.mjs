import * as customerRepository from "../repositories/customerRepository.mjs";

/**
 * @description Validates and creates a new customer in the database.
 * @param {object} customerData - The raw customer data from the controller.
 * @param {string} customerData.name - The name of the customer (required).
 * @param {string} customerData.phone - The unique phone number of the customer (required).
 * @param {string} [customerData.address] - The customer's address.
 * @returns {Promise<object>} The newly created customer object from the repository.
 * @throws {Error} Throws an error with a specific message and status code for validation failures or duplicates.
 */
export const createCustomer = async (customerData) => {
  const { name, phone } = customerData;

  if (!name || !phone || !name.trim() || !phone.trim()) {
    const err = new Error("Customer name and phone number are required.");
    err.statusCode = 400; // Bad Request
    throw err;
  }

  const normalizedData = {
    ...customerData,
    name: name.trim(),
    phone: phone.trim(),
  };

  try {
    const existingCustomer = await customerRepository.getCustomerByPhone(
      normalizedData.phone
    );

    if (existingCustomer) {
      const err = new Error(
        "A customer with this phone number already exists."
      );
      err.statusCode = 409; // Conflict
      throw err;
    }

    // If validation passes and no duplicate is found, create the customer.
    const newCustomer = await customerRepository.createCustomer(normalizedData);
    return newCustomer;
  } catch (error) {
    console.error("Error in createCustomer service:", error.message);
    // Re-throw our custom errors so the controller can catch them
    if (error.statusCode) {
      throw error;
    }
    // For any other unexpected errors, throw a generic server error
    throw new Error("Failed to create customer due to a database error.");
  }
};

/**
 * @description Fetches a paginated list of customers with optional search functionality.
 * @param {object} params - The pagination and search parameters.
 * @param {number} params.page - The page number to fetch.
 * @param {number} params.limit - The number of records per page.
 * @param {string} [params.query] - A search string to filter customers by name or phone.
 * @param {boolean} [params.all=false] - If true, fetches all customers without pagination.
 * @returns {Promise<object>} A promise that resolves to an object containing customer records and the total count.
 * @throws {Error} If fetching customers fails.
 */
export const getAllCustomersService = async ({
  page,
  limit,
  query,
  all = false,
}) => {
  try {
    const customers = customerRepository.getAllCustomers({
      page,
      limit,
      query,
      all,
    });
    return customers;
  } catch (error) {
    console.error("Error in getPaginatedCustomers service:", error);
    throw new Error("Failed to fetch customers: " + error.message);
  }
};

/**
 * @description Fetches all customer records from the database.
 * @returns {Promise<Array>} An array of all customer records.
 * @throws {Error} If fetching all customers fails.
 */
export const getAllCustomers = async () => {
  try {
    const customers = customerRepository.getAllCustomers();
    return customers;
  } catch (error) {
    console.error("Error in getAllCustomers service:", error);
    throw new Error("Failed to fetch all customers: " + error.message);
  }
};

export const getCustomerById = async (customerId) => {
  try {
    if (!customerId || customerId === null) {
      return "customer id is required";
    }
    const customer = await customerRepository.getCustomerById(customerId);
    return customer;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const getCustomerByPhone = async (phoneNumber) => {
  try {
    if (!phoneNumber) {
      return "phone number is required";
    }

    const customer = await customerRepository.getCustomerByPhone(phoneNumber);
    return customer;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const updateCustomer = async (customerId, customerData) => {
  try {
    if (!customerId || customerId === null) {
      return "customer id is required";
    }
    if (!customerData || customerData === null) {
      return "customer data is required";
    }
    const updatedCustomer = await customerRepository.updateCustomer(
      customerId,
      customerData
    );
    return updatedCustomer;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const deleteCustomer = async (customerId) => {
  try {
    if (!customerId || customerId === null) {
      return "customer id is required";
    }
    await customerRepository.deleteCustomer(customerId);
    return "customer deleted successfully";
  } catch (error) {
    console.error(error);
    return error;
  }
};

/**
 * Processes overdue customers and organizes them into 7, 15, and 30+ day buckets.
 */
export function getOverdueSummary() {
  const customers = customerRepository.getOverdueCustomerSummary();

  const buckets = {
    "7-14": [],
    "15-30": [],
    "30+": [],
  };

  for (const customer of customers) {
    if (customer.oldest_bill_age > 30) {
      buckets["30+"].push(customer);
    } else if (customer.oldest_bill_age > 15) {
      buckets["15-30"].push(customer);
    } else {
      // It's already been filtered by HAVING oldest_bill_age > 7
      buckets["7-14"].push(customer);
    }
  }

  return {
    totalOverdueCustomers: customers.length,
    buckets: [
      { range: "Over 30 Days", customers: buckets["30+"] },
      { range: "15-30 Days", customers: buckets["15-30"] },
      { range: "7-14 Days", customers: buckets["7-14"] },
    ],
  };
}
