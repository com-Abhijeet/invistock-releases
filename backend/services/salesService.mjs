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
  updateSaleHeader,
  replaceSaleItems,
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
import * as batchService from "../services/batchService.mjs";
import * as EmployeeSalesService from "../services/employeeSalesService.mjs"; // ✅ Import Employee Sales Service

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
    employee_id,
    reference_no, // ✅ Destructure potential manual reference
  } = saleData;

  if (!items || items.length === 0) {
    throw new Error("At least one item is required.");
  }

  const transaction = db.transaction(() => {
    let finalReferenceNo = reference_no;

    // 1. Determine Reference Number
    // If frontend sent "Auto Generated On Submit" or empty, we generate one.
    // Otherwise, we use the manual input.
    console.log("reference_no", reference_no);
    if (
      !finalReferenceNo ||
      finalReferenceNo === "Auto Generated On Submit" ||
      finalReferenceNo.trim() === ""
    ) {
      finalReferenceNo = is_quote
        ? `QUO-${Date.now()}`
        : generateReference("S");
    } else {
      // ✅ Manual Reference Check
      // Ensure manual reference is unique to avoid primary key/unique constraint violations or logical dupes
      const check = db
        .prepare("SELECT id FROM sales WHERE reference_no = ?")
        .get(finalReferenceNo);
      if (check) {
        throw new Error(`Invoice Number '${finalReferenceNo}' already exists.`);
      }
    }

    // 2. Create Sale Header
    const saleId = createSale(
      {
        customer_id: customer_id || null,
        reference_no: finalReferenceNo, // Use the resolved reference
        paid_amount,
        payment_mode,
        note,
        total_amount,
        status: is_quote ? "draft" : status,
        discount,
        is_reverse_charge,
        is_ecommerce_sale,
        is_quote,
        employee_id: employee_id || null,
      },
      [],
    );

    if (!saleId) {
      throw new Error("Failed to create sale record.");
    }

    let totalGstAmount = 0;

    // 3. Process Items
    items.forEach((item) => {
      createSaleItem({
        sale_id: saleId,
        ...item,
      });

      if (!is_quote) {
        const product = getProductById(item.product_id);
        if (!product)
          throw new Error(`Product not found (ID: ${item.product_id})`);

        // Deduct Stock
        updateProductQuantity(
          item.product_id,
          product.quantity - item.quantity,
        );

        // Deduct Batch/Serial Stock
        if (item.batch_id || item.serial_id) {
          batchService.processSaleItemStockDeduction({
            batchId: item.batch_id,
            serialId: item.serial_id,
            quantity: item.quantity,
          });
        }
      }

      const baseValue = item.rate * item.quantity;
      const discountAmount = (baseValue * (item.discount || 0)) / 100;
      const taxableValue = baseValue - discountAmount;
      const itemGst = (taxableValue * (item.gst_rate || 0)) / 100;
      totalGstAmount += itemGst;
    });

    // 4. Record Employee Commission
    if (employee_id && !is_quote) {
      EmployeeSalesService.recordCommission(saleId, employee_id, total_amount);
    }

    // 5. Create Payment Transaction
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
        note: `Payment for Sale #${finalReferenceNo}`,
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

/**
 * @description Updates an existing sale, handling inventory rollbacks and financial deltas.
 */
export async function updateSaleWithItemsService(saleId, newData) {
  const oldSale = getSaleWithItemsById(saleId);
  console.log("new sale data", newData);
  if (!oldSale) throw new Error("Sale not found.");

  const transaction = db.transaction(() => {
    // 1. Rollback Stock for OLD items
    for (const item of oldSale.items) {
      const product = getProductById(item.product_id);
      if (product) {
        updateProductQuantity(
          item.product_id,
          product.quantity + item.quantity,
        );
        if (item.batch_id || item.serial_id) {
          batchService.processSaleItemStockReturn({
            batchId: item.batch_id,
            serialId: item.serial_id,
            quantity: item.quantity,
          });
        }
      }
    }

    // 2. Deduct Stock for NEW items
    for (const item of newData.items) {
      const product = getProductById(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found.`);

      updateProductQuantity(item.product_id, product.quantity - item.quantity);
      if (item.batch_id || item.serial_id) {
        batchService.processSaleItemStockDeduction({
          batchId: item.batch_id,
          serialId: item.serial_id,
          quantity: item.quantity,
        });
      }
    }

    // 3. Update Sale Header and Replace Items
    updateSaleHeader(saleId, newData);
    replaceSaleItems(saleId, newData.items);

    // 4. Handle Commission Changes
    // If employee changed or amount changed, we re-record/update commission
    if (!newData.is_quote) {
      // Clear old commission if exists
      db.prepare("DELETE FROM employee_sales WHERE sale_id = ?").run(saleId);
      if (newData.employee_id) {
        EmployeeSalesService.recordCommission(
          saleId,
          newData.employee_id,
          newData.total_amount,
        );
      }
    }

    // 5. Handle Payment Delta
    // For simplicity, if paid_amount changed, we create a delta transaction
    const deltaPaid = newData.paid_amount - oldSale.paid_amount;
    if (deltaPaid !== 0 && !newData.is_quote) {
      createTransaction({
        type: deltaPaid > 0 ? "payment_in" : "payment_out",
        bill_id: saleId,
        bill_type: "sale",
        entity_id: newData.customer_id,
        entity_type: "customer",
        transaction_date: new Date().toISOString().slice(0, 10),
        amount: Math.abs(deltaPaid),
        payment_mode: newData.payment_mode,
        status: "completed",
        note: `Adjustment for Sale Update #${newData.reference_no}`,
      });
    }

    return saleId;
  });

  try {
    transaction();
    return getSaleWithItemsById(saleId);
  } catch (err) {
    console.error("Sale update failed:", err.message);
    throw new Error("Sale update failed: " + err.message);
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
  for (const item of items) {
    await updateProductStockById(item.product_id, item.quantity);
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
