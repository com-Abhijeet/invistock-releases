import dbProxy from "../../db/db.mjs";
import { LedgerBuilder } from "../xml/builders/LedgerBuilder.mjs";
import { UnitBuilder } from "../xml/builders/UnitBuilder.mjs";
import { StockGroupBuilder } from "../xml/builders/StockGroupBuilder.mjs";
import { StockItemBuilder } from "../xml/builders/StockItemBuilder.mjs";
import { VoucherTypeBuilder } from "../xml/builders/VoucherTypeBuilder.mjs";
import { HttpTransport } from "../transport/HttpTransport.mjs";
import { normalizeTallyUnit, wrapTallyXML } from "../xml/TallyXmlUtil.mjs";

export class DependencyResolver {
  /**
   * Resolves masters inline.
   * If a required master is missing (e.g. Sales Account, Customer A, Item X),
   * it constructs the XML and forces a sync via HttpTransport.
   * Throws Error if master creation fails, preventing voucher sync.
   */
  static async resolveLedger(ledgerName, settings, isCustomer = false, customerId = null) {
    if (!ledgerName) return;

    let action = "Alter"; // We try Alter first, if it fails due to missing, Tally handles it or we use Create.
    let xml = "";

    if (isCustomer && customerId) {
      const mainDb = dbProxy;
      const entity = mainDb.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
      if (entity) {
        xml = LedgerBuilder.build({
          action: "Alter",
          name: ledgerName,
          parentGroup: "Sundry Debtors",
          address: entity.address,
          state: entity.state,
          pincode: entity.pincode,
          gstin: entity.gst_no || entity.gst_number
        });
      }
    } else {
      // Basic Ledger (e.g., Sales Account, Taxes)
      let parent = "Indirect Expenses"; // Default fallback
      
      const lname = ledgerName.toLowerCase();
      if (lname.includes("gst")) parent = "Duties & Taxes";
      else if (lname.includes("sales") || lname.includes("sale")) parent = "Sales Accounts";
      else if (lname.includes("purchase")) parent = "Purchase Accounts";
      else if (lname.includes("bank")) parent = "Bank Accounts";
      else if (lname.includes("cash")) parent = "Cash-in-hand";
      else if (lname.includes("discount")) parent = "Indirect Expenses";
      else if (lname.includes("round")) parent = "Indirect Expenses";

      let affectsStock = false;
      if (parent === "Sales Accounts" || parent === "Purchase Accounts") {
        affectsStock = true;
      }

      xml = LedgerBuilder.build({
        action: "Alter",
        name: ledgerName,
        parentGroup: parent,
        affectsStock
      });
    }

    if (xml) {
      const payload = wrapTallyXML(xml, "All Masters");
      try {
        const response = await HttpTransport.send(settings.tally_url, payload);
        // If Tally says it altered or created, we are good.
        // If it throws an error that it doesn't exist, we send a Create.
        if (!response.success && response.message.includes("does not exist")) {
           const createXml = xml.replace('ACTION="Alter"', 'ACTION="Create"');
           await HttpTransport.send(settings.tally_url, wrapTallyXML(createXml, "All Masters"));
        }
      } catch (err) {
        console.warn(`[TALLY] Dependency resolution warning for ${ledgerName}: ${err.message}`);
      }
    }
  }

  static async resolveExpenseLedger(categoryName, settings) {
    if (!categoryName) return;
    
    // In Tally, expense categories usually map to Indirect Expenses.
    const xml = LedgerBuilder.build({
      action: "Alter",
      name: categoryName,
      parentGroup: "Indirect Expenses",
      affectsStock: false
    });

    try {
      const response = await HttpTransport.send(settings.tally_url, wrapTallyXML(xml, "All Masters"));
      if (!response.success && response.message.includes("does not exist")) {
        const createXml = LedgerBuilder.build({
          action: "Create",
          name: categoryName,
          parentGroup: "Indirect Expenses",
          affectsStock: false
        });
        await HttpTransport.send(settings.tally_url, wrapTallyXML(createXml, "All Masters"));
      }
    } catch (err) {
      console.warn(`[TALLY] Dependency resolution warning for Expense Ledger ${categoryName}: ${err.message}`);
    }
  }

  static async resolveStockItem(item, settings) {
    const unit = normalizeTallyUnit(item.unit);

    // 1. Resolve Unit
    const unitXml = UnitBuilder.build({ action: "Create", unitName: unit });
    await HttpTransport.send(settings.tally_url, wrapTallyXML(unitXml, "All Masters"));

    // 2. Resolve Group
    const groupName = item.category ? item.category.toString().trim() : "Primary";
    if (groupName && groupName.toLowerCase() !== "primary") {
      const groupXml = StockGroupBuilder.build({ action: "Create", groupName: groupName });
      await HttpTransport.send(settings.tally_url, wrapTallyXML(groupXml, "All Masters"));
    }

    // 3. Resolve Item
    const itemXml = StockItemBuilder.build({
      action: "Alter",
      itemName: item.name,
      parentGroup: groupName,
      unit,
      hsn: item.hsn,
      gstRate: item.gstRate
    });

    try {
      const response = await HttpTransport.send(settings.tally_url, wrapTallyXML(itemXml, "All Masters"));
      if (!response.success && response.message.includes("does not exist")) {
        const createXml = itemXml.replace('ACTION="Alter"', 'ACTION="Create"');
        await HttpTransport.send(settings.tally_url, wrapTallyXML(createXml, "All Masters"));
      }
    } catch (err) {
      throw new Error(`Failed to resolve Stock Item dependency '${item.name}': ${err.message}`);
    }
  }

  static async resolveVoucherType(typeName, parentGroup, settings) {
    if (!typeName) return;
    
    const restartDetails = [
      { date: "1-Apr", startingNumber: 1, periodicity: "Yearly" }
    ];

    const xml = VoucherTypeBuilder.build({
      action: "Alter",
      name: typeName,
      parentGroup: parentGroup,
      numberingMethod: "Automatic (Manual Override)",
      preventDuplicates: true,
      restartDetails,
      isInvoice: parentGroup === "Sales" || parentGroup === "Purchase"
    });

    try {
      const response = await HttpTransport.send(settings.tally_url, wrapTallyXML(xml, "All Masters"));
      if (!response.success && response.message.includes("does not exist")) {
        const createXml = xml.replace('ACTION="Alter"', 'ACTION="Create"');
        await HttpTransport.send(settings.tally_url, wrapTallyXML(createXml, "All Masters"));
      }
    } catch (err) {
      console.warn(`[TALLY] Dependency resolution warning for VoucherType ${typeName}: ${err.message}`);
    }
  }
}
