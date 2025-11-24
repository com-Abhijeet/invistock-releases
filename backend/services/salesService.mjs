import db from "../db/db.mjs";
import {
  createSale,
  getSaleWithItemsById,
  deleteSale,
  updateSaleById,
  getSalesForCustomer,
  getSaleById,
  updateSaleStatus,
  processSalesReturn,
} from "../repositories/salesRepository.mjs";
import {
  createSaleItem,
  getItemsBySaleId,
} from "../repositories/salesItemRepository.mjs";
import {
  getProductById,
  updateProductQuantity,
} from "../repositories/productRepository.mjs";
import { createTransaction } from "../repositories/transactionRepository.mjs";
import { generateReference } from "../repositories/referenceRepository.mjs";
import * as salesStatsRepository from "../repositories/salesStatsRepository.mjs";

/**
 * @description Creates a new sale or quote. For sales, it generates a compliant reference number,
 * creates items, and updates stock. For quotes, it creates a temporary record without affecting stock.
 * @param {object} saleData - The complete sale data from the frontend.
 * @returns {Promise<object>} The newly created sale/quote record with its items.
 * @throws {Error} If any part of the transaction fails.
 */
export function createSaleWithItems(saleData) {
  const {
    customer_id,
    paid_amount,
    payment_mode,
    note,
    total_amount,
    items,
    status,
    discount,
    is_reverse_charge = false,
    is_ecommerce_sale = false,
    is_quote = false,
  } = saleData;

  if (!items || items.length === 0) {
    throw new Error("At least one item is required.");
  }

  const transaction = db.transaction(() => {
    // ✅ Step 1: Conditionally generate the reference number.
    const newReferenceNo = is_quote
      ? `QUO-${Date.now()}`
      : generateReference("S");

    // Step 2: Create the main sale record, passing the new flags.
    console.log("creating sale with ,", newReferenceNo);
    const saleId = createSale({
      customer_id: customer_id || null,
      reference_no: newReferenceNo,
      paid_amount,
      payment_mode,
      note,
      total_amount,
      status: is_quote ? "draft" : status, // Quotes can have a 'draft' status
      discount,
      is_reverse_charge,
      is_ecommerce_sale,
      is_quote,
    });

    if (!saleId) {
      throw new Error("Failed to create sale record.");
    }

    let totalGstAmount = 0;

    // Step 3: Add sale items. Stock is only updated for final invoices.
    items.forEach((item) => {
      // This part runs for both quotes and invoices to save the items
      createSaleItem({
        sale_id: saleId,
        ...item,
      });

      // ✅ This logic now ONLY runs for final invoices, NOT for quotes
      if (!is_quote) {
        const product = getProductById(item.product_id);
        if (!product)
          throw new Error(`Product not found (ID: ${item.product_id})`);
        if (product.quantity < item.quantity)
          throw new Error(`Insufficient stock for '${product.name}'`);

        // Update stock only for a real sale
        updateProductQuantity(
          item.product_id,
          product.quantity - item.quantity
        );
      }

      // Calculate total GST
      const baseValue = item.rate * item.quantity;
      const discountAmount = (baseValue * (item.discount || 0)) / 100;
      const taxableValue = baseValue - discountAmount;
      const itemGst = (taxableValue * (item.gst_rate || 0)) / 100;
      totalGstAmount += itemGst;
    });

    // ✅ Step 4: Create a payment transaction ONLY for final invoices.
    if (!is_quote && paid_amount > 0) {
      createTransaction({
        type: "payment_in",
        bill_id: saleId,
        bill_type: "sale",
        entity_id: customer_id,
        entity_type: "customer",
        transaction_date: new Date().toISOString().slice(0, 10),
        amount: paid_amount,
        payment_mode,
        status: "completed",
        note: `Payment for Sale #${newReferenceNo}`,
        gst_amount: totalGstAmount,
      });

      console.log(transaction);
    }

    return saleId;
  });

  try {
    const newSaleId = transaction();
    return getSaleWithItemsById(newSaleId);
  } catch (err) {
    console.error("Sale creation failed:", err.message);
    throw new Error("Sale creation failed: " + err.message);
  }
}

async function updateSale(id, saleData) {
  const existing = await getSaleById(id);
  if (!existing) {
    const err = new Error("Sale not found");
    err.statusCode = 404;
    throw err;
  }

  return await updateSaleById(id, saleData);
}

// 🟢 Get Paginated Sales
export async function getSalesPaginated(page, limit) {
  return await getPaginatedSales(page, limit);
}

// 🟢 Get Sale with Items
export async function getSaleWithItemsByIdService(saleId) {
  const sale = await getSaleWithItemsById(saleId);
  if (!sale) return null;

  // const items = await getItemsBySaleId(saleId);
  return { ...sale };
}

// 🟢 Delete Sale and Rollback Stocks
export async function deleteSaleByIdService(saleId) {
  const sale = await getSaleById(saleId);
  if (!sale) return null;

  const items = await getItemsBySaleId(saleId);

  // rollback each item quantity to product stock
  for (const item of items) {
    await updateProductStockById(item.product_id, item.quantity); // increment back
  }

  await deleteSale(saleId);

  return { message: "Sale and items deleted with stock rollback" };
}

// Update Sale status -> Refund , Return, Pending, Paid, Cancelled
export async function updateSaleStatusService(saleId, status) {
  const sale = await getSaleById(saleId);
  if (!sale) {
    return { message: "Sale not found" };
  }
  const res = await updateSaleStatus(saleId, status);
  return { message: "Sale status updated" };
}

/* ---------------- GET SALES FOR A CUSTOMER ---------------- */
export async function getCustomerSales(customerId, filters) {
  try {
    if (!customerId) {
      return { message: "Customer id is required" };
    }
    const sales = await getSalesForCustomer(customerId, filters);
    return sales;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Processes a sales return, updates stock, and creates a credit note.
 * @param {object} payload - { saleId, returnItems, note }
 */
export function processSalesReturnService(payload) {
  // Validate payload
  if (
    !payload.saleId ||
    !payload.returnItems ||
    payload.returnItems.length === 0
  ) {
    throw new Error("Invalid return data: Sale ID and items are required.");
  }

  // Call the repository function (which handles the DB transaction)
  return processSalesReturn(payload);
}
/*------------------ GET CUSTOMER SALES KPI ----------------------*/
export async function fetchCustomerSalesKPIService(customerId) {
  try {
    if (!customerId) {
      return { message: "customer id is required" };
    }
    const kpiMetrics = await salesStatsRepository.getCustomerSalesKpi(
      customerId
    );
    return kpiMetrics;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// 🟢 Get Sales Summary
export async function getSalesSummaryService(startDate, endDate) {
  return await getSalesSummary(startDate, endDate);
}

// 🟢 Search Sales by Reference No
export async function searchSalesByReferenceService(query) {
  return await searchSalesByReference(query);
}

/*
STATS SERVICE */
export function getSalesTrend(filters) {
  // console.log("getting trend service");
  return salesStatsRepository.getSalesTrend(filters);
}

export function getFinancialMetrics(filters) {
  return salesStatsRepository.getFinancialMetrics(filters);
}

export function getOrderMetrics(filters) {
  return salesStatsRepository.getOrderMetrics(filters);
}

export function getTopCustomers(filters) {
  return salesStatsRepository.getTopCustomers(filters);
}

export function getTopProducts(filters) {
  return salesStatsRepository.getTopProducts(filters);
}

export function getCategoryRevenue(filters) {
  return salesStatsRepository.getCategoryRevenue(filters);
}

export function getPaymentModeBreakdown(filters) {
  return salesStatsRepository.getPaymentModeBreakdown(filters);
}

export function getCreditSales(filters) {
  return salesStatsRepository.getCreditSales(filters);
}

export function getBestSalesDay(filters) {
  return salesStatsRepository.getBestSalesDay(filters);
}

export function getSalesTable(filters) {
  return salesStatsRepository.getSalesTable(filters);
}
