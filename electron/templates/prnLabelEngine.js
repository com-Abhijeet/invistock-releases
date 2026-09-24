/**
 * prnLabelEngine.js
 * TSPL/ZPL .prn Raw Barcode Label Template & Multi-Up Parser Engine.
 */

/**
 * Encode cost price using a cipher mapping (e.g. MONEYTALKS -> M=1, O=2, N=3, E=4, Y=5, T=6, A=7, L=8, K=9, S=0)
 */
function encodeCostCipher(costPrice, cipherKey = "MONEYTALKS") {
  if (!costPrice) return "";
  const key = (cipherKey || "MONEYTALKS").toUpperCase();
  const digits = String(costPrice).replace(/[^0-9]/g, "");

  return digits
    .split("")
    .map((d) => {
      const num = parseInt(d, 10);
      if (num === 0) return key[9] || "0";
      return key[num - 1] || d;
    })
    .join("");
}

/**
 * Replace placeholders in a PRN block for a single label item.
 */
function replaceLabelPlaceholders(templateStr, item, shop, cipherKey) {
  const product = item.product || {};
  const batch = item.batch || {};
  const serial = item.serial || {};

  const name = product.name || item.name || "Product";
  const code = product.product_code || product.code || "";
  const barcode = item.barcode || batch.barcode || product.barcode || "";
  const mrp = Number(batch.mrp || product.mrp || item.mrp || 0).toFixed(2);
  const price = Number(
    batch.mop || product.selling_price || product.price || item.price || mrp,
  ).toFixed(2);
  const cost = Number(batch.purchase_rate || product.cost_price || 0);
  const cipher = encodeCostCipher(cost, cipherKey);
  const batchNo = batch.batch_number || item.batch_number || "";
  const expDate = batch.expiry_date || item.expiry_date || "";
  const size = product.size || item.size || batch.size || "";
  const shopName = shop.name || "";

  return templateStr
    .replace(/\{\{SHOP_NAME\}\}/g, shopName)
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{ITEM_NAME\}\}/g, name)
    .replace(/\{\{PRODUCT_CODE\}\}/g, code)
    .replace(/\{\{BARCODE\}\}/g, barcode)
    .replace(/\{\{MRP\}\}/g, mrp)
    .replace(/\{\{PRICE\}\}/g, price)
    .replace(/\{\{SELLING_PRICE\}\}/g, price)
    .replace(/\{\{BATCH_NO\}\}/g, batchNo)
    .replace(/\{\{EXPIRY_DATE\}\}/g, expDate)
    .replace(/\{\{SIZE\}\}/g, size)
    .replace(/\{\{SERIAL_NO\}\}/g, serial.serial_number || "")
    .replace(/\{\{SECRET_COST_CIPHER\}\}/g, cipher);
}

/**
 * Generate PRN output for 1-Up, 2-Up, or 3-Up label rolls.
 * @param {string} prnTemplate Content of the .prn template file
 * @param {Array} items List of label items to print
 * @param {Object} shop Shop settings
 * @param {Object} options Options: { multiUp: 1 | 2 | 3, cipherKey: string }
 */
function renderPRNLabels(prnTemplate, items, shop = {}, options = {}) {
  let multiUp = Number(options.multiUp || 1);
  if (prnTemplate && prnTemplate.includes("COL_3_")) {
    multiUp = 3;
  } else if (prnTemplate && prnTemplate.includes("COL_2_")) {
    multiUp = 2;
  }

  const cipherKey = options.cipherKey || "MONEYTALKS";

  if (!prnTemplate || !Array.isArray(items) || items.length === 0) {
    return "";
  }

  // Expand items based on printable quantity
  const expandedItems = [];
  items.forEach((it) => {
    const printQty = Number(it.print_qty || it.qty || 1);
    for (let i = 0; i < printQty; i++) {
      expandedItems.push(it);
    }
  });

  // 1-UP ROLL MODE
  if (multiUp <= 1) {
    return expandedItems
      .map((item) =>
        replaceLabelPlaceholders(prnTemplate, item, shop, cipherKey),
      )
      .join("\n");
  }

  // 2-UP or 3-UP MULTI-ROLL MODE
  const outputBlocks = [];

  for (let i = 0; i < expandedItems.length; i += multiUp) {
    let block = prnTemplate;

    for (let col = 1; col <= multiUp; col++) {
      const currentItem = expandedItems[i + (col - 1)] || {};
      const prefix = `COL_${col}_`;

      const product = currentItem.product || {};
      const batch = currentItem.batch || {};
      const serial = currentItem.serial || {};

      const name = product.name || currentItem.name || "";
      const code = product.product_code || product.code || "";
      const barcode =
        currentItem.barcode || batch.barcode || product.barcode || "";
      const mrp = name
        ? Number(batch.mrp || product.mrp || currentItem.mrp || 0).toFixed(2)
        : "";
      const price = name
        ? Number(
            batch.mop ||
              product.selling_price ||
              product.price ||
              currentItem.price ||
              mrp,
          ).toFixed(2)
        : "";
      const cost = Number(batch.purchase_rate || product.cost_price || 0);
      const cipher = name ? encodeCostCipher(cost, cipherKey) : "";
      const batchNo = batch.batch_number || currentItem.batch_number || "";
      const expDate = batch.expiry_date || currentItem.expiry_date || "";
      const size = product.size || currentItem.size || batch.size || "";
      const shopName = shop.name || "";

      block = block
        .replace(new RegExp(`\\{\\{${prefix}SHOP_NAME\\}\\}`, "g"), shopName)
        .replace(new RegExp(`\\{\\{${prefix}NAME\\}\\}`, "g"), name)
        .replace(new RegExp(`\\{\\{${prefix}ITEM_NAME\\}\\}`, "g"), name)
        .replace(new RegExp(`\\{\\{${prefix}PRODUCT_CODE\\}\\}`, "g"), code)
        .replace(new RegExp(`\\{\\{${prefix}BARCODE\\}\\}`, "g"), barcode)
        .replace(new RegExp(`\\{\\{${prefix}MRP\\}\\}`, "g"), mrp)
        .replace(new RegExp(`\\{\\{${prefix}PRICE\\}\\}`, "g"), price)
        .replace(new RegExp(`\\{\\{${prefix}SELLING_PRICE\\}\\}`, "g"), price)
        .replace(new RegExp(`\\{\\{${prefix}BATCH_NO\\}\\}`, "g"), batchNo)
        .replace(new RegExp(`\\{\\{${prefix}EXPIRY_DATE\\}\\}`, "g"), expDate)
        .replace(new RegExp(`\\{\\{${prefix}SIZE\\}\\}`, "g"), size)
        .replace(
          new RegExp(`\\{\\{${prefix}SECRET_COST_CIPHER\\}\\}`, "g"),
          cipher,
        );
    }

    outputBlocks.push(block);
  }

  return outputBlocks.join("\n");
}

module.exports = {
  renderPRNLabels,
  encodeCostCipher,
};
