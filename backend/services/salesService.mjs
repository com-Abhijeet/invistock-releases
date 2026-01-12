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
import * as batchService from "../services/batchService.mjs"; // Import Batch Service

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
    const newReferenceNo = is_quote
      ? `QUO-${Date.now()}`
      : generateReference("S");

    // 1. Create Sale Header
    // NOTE: Passing empty array [] for items to prevent repo from creating generic items.
    // We handle item creation explicitly in the loop below to support Batch/Serial logic.
    const saleId = createSale(
      {
        customer_id: customer_id || null,
        reference_no: newReferenceNo,
        paid_amount,
        payment_mode,
        note,
        total_amount,
        status: is_quote ? "draft" : status,
        discount,
        is_reverse_charge,
        is_ecommerce_sale,
        is_quote,
      },
      []
    );

    if (!saleId) {
      throw new Error("Failed to create sale record.");
    }

    let totalGstAmount = 0;

    // 2. Process Items (Batch/Serial Logic)
    items.forEach((item) => {
      // Create item with Batch/Serial IDs
      createSaleItem({
        sale_id: saleId,
        ...item, // This now includes batch_id, serial_id from frontend
      });

      if (!is_quote) {
        const product = getProductById(item.product_id);
        if (!product)
          throw new Error(`Product not found (ID: ${item.product_id})`);

        // A. Deduct Aggregate Stock (General Product Qty)
        if (product.quantity < item.quantity) {
          // Optional: You can disable this check if you allow negative stock
          // throw new Error(`Insufficient stock for '${product.name}'`);
        }
        updateProductQuantity(
          item.product_id,
          product.quantity - item.quantity
        );

        // B. Deduct Specific Batch/Serial Stock
        if (item.batch_id || item.serial_id) {
          batchService.processSaleItemStockDeduction({
            batchId: item.batch_id,
            serialId: item.serial_id,
            quantity: item.quantity,
          });
        }
      }

      // Calculate GST
      const baseValue = item.rate * item.quantity;
      const discountAmount = (baseValue * (item.discount || 0)) / 100;
      const taxableValue = baseValue - discountAmount;
      const itemGst = (taxableValue * (item.gst_rate || 0)) / 100;
      totalGstAmount += itemGst;
    });

    // 3. Create Payment Transaction
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

// ... (Rest of the service functions remain unchanged)
async function updateSale(id, saleData) {
  const existing = await getSaleById(id);
  if (!existing) {
    const err = new Error("Sale not found");
    err.statusCode = 404;
    throw err;
  }
  return await updateSaleById(id, saleData);
}

export async function getSalesPaginated(page, limit) {
  return await getPaginatedSales(page, limit);
}

export async function getSaleWithItemsByIdService(saleId) {
  const sale = await getSaleWithItemsById(saleId);
  if (!sale) return null;
  return { ...sale };
}

export async function deleteSaleByIdService(saleId) {
  const sale = await getSaleById(saleId);
  if (!sale) return null;
  const items = await getItemsBySaleId(saleId);
  // Rollback stocks
  for (const item of items) {
    await updateProductStockById(item.product_id, item.quantity);
    // Note: Full batch rollback logic would go here if implementing delete
  }
  await deleteSale(saleId);
  return { message: "Sale and items deleted with stock rollback" };
}

export async function updateSaleStatusService(saleId, status) {
  const sale = await getSaleById(saleId);
  if (!sale) {
    return { message: "Sale not found" };
  }
  const res = await updateSaleStatus(saleId, status);
  return { message: "Sale status updated" };
}

export async function getCustomerSales(customerId, filters) {
  try {
    if (!customerId) return { message: "Customer id is required" };
    return await getSalesForCustomer(customerId, filters);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export function processSalesReturnService(payload) {
  if (
    !payload.saleId ||
    !payload.returnItems ||
    payload.returnItems.length === 0
  ) {
    throw new Error("Invalid return data: Sale ID and items are required.");
  }
  return processSalesReturn(payload);
}

export async function fetchCustomerSalesKPIService(customerId) {
  try {
    if (!customerId) return { message: "customer id is required" };
    return await salesStatsRepository.getCustomerSalesKpi(customerId);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getSalesSummaryService(startDate, endDate) {
  return await getSalesSummary(startDate, endDate);
}

export async function searchSalesByReferenceService(query) {
  return await searchSalesByReference(query);
}

// Stats wrappers
export function getSalesTrend(filters) {
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
