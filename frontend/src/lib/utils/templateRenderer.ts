export interface TemplateVariables {
  Name?: string;
  CustomerName?: string;
  ShopName?: string;
  Total?: string | number;
  Amount?: string | number;
  ReferenceNo?: string;
  Bills?: string;
  DueDate?: string;
  PayLink?: string;
  SupplierName?: string;
  [key: string]: any;
}

/**
 * Resolves the actual shop name from passed variables, cached shop settings, or defaults to "Kosh Store".
 */
export function getResolvedShopName(overrideName?: string): string {
  if (
    overrideName &&
    overrideName.trim() &&
    !/invistock/i.test(overrideName) &&
    overrideName !== "Our Shop"
  ) {
    return overrideName.trim();
  }

  try {
    const cachedShop = localStorage.getItem("shop");
    if (cachedShop) {
      const parsed = JSON.parse(cachedShop);
      if (parsed?.shop_name && parsed.shop_name.trim()) {
        return parsed.shop_name.trim();
      }
    }
  } catch (e) {
    // ignore JSON parse error
  }

  try {
    const cachedBiz = localStorage.getItem("business_profile");
    if (cachedBiz) {
      const parsed = JSON.parse(cachedBiz);
      if (parsed?.name && parsed.name.trim()) {
        return parsed.name.trim();
      }
    }
  } catch (e) {
    // ignore JSON parse error
  }

  return "Kosh Store";
}

/**
 * Hydrates WhatsApp template placeholders with key-value variables.
 * Handles tags like {{Name}}, {{ShopName}}, {{Total}}, {{Bills}}, etc.
 */
export function hydrateTemplate(
  templateContent: string,
  variables: TemplateVariables
): string {
  if (!templateContent) return "";

  let result = templateContent;

  const actualShopName = getResolvedShopName(variables.ShopName || variables.shop_name);

  const nameVal = variables.Name || variables.name || variables.CustomerName || variables.customer_name || "Customer";
  const totalVal = variables.Total !== undefined ? (typeof variables.Total === "number" ? variables.Total.toFixed(2) : String(variables.Total))
                 : variables.total !== undefined ? (typeof variables.total === "number" ? variables.total.toFixed(2) : String(variables.total))
                 : "0.00";
  const amountVal = variables.Amount !== undefined ? (typeof variables.Amount === "number" ? variables.Amount.toFixed(2) : String(variables.Amount))
                  : variables.amount !== undefined ? (typeof variables.amount === "number" ? variables.amount.toFixed(2) : String(variables.amount))
                  : "0.00";
  const refNo = variables.ReferenceNo || variables.reference_no || variables.InvoiceNo || variables.invoice_no || "";
  const billsVal = variables.Bills || variables.bills || "";
  const dueDateVal = variables.DueDate || variables.due_date || "";
  const payLinkVal = variables.PayLink || variables.pay_link || "";
  const supplierVal = variables.SupplierName || variables.supplier_name || "Supplier";

  const mapping: Record<string, string> = {
    name: nameVal,
    Name: nameVal,
    customer_name: nameVal,
    CustomerName: nameVal,

    shop_name: actualShopName,
    ShopName: actualShopName,

    total: totalVal,
    Total: totalVal,

    amount: amountVal,
    Amount: amountVal,

    reference_no: refNo,
    ReferenceNo: refNo,
    invoice_no: refNo,
    InvoiceNo: refNo,

    bills: billsVal,
    Bills: billsVal,

    due_date: dueDateVal,
    DueDate: dueDateVal,

    pay_link: payLinkVal,
    PayLink: payLinkVal,

    supplier_name: supplierVal,
    SupplierName: supplierVal,
  };

  // Replace standard mapped keys
  Object.keys(mapping).forEach((key) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
    result = result.replace(regex, mapping[key]);
  });

  // Replace any extra dynamic parameters in variables object
  Object.keys(variables).forEach((key) => {
    if (mapping[key] === undefined && variables[key] !== undefined) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      result = result.replace(regex, String(variables[key]));
    }
  });

  // Ensure any standalone legacy "invistock" references in templates are converted to Kosh/ShopName
  result = result.replace(/\bInviStock\b/gi, actualShopName || "Kosh");

  return result;
}
