import dbProxy from "../../db/db.mjs";
import { QueueEngine } from "./QueueEngine.mjs";
import { DependencyResolver } from "./DependencyResolver.mjs";
import { HttpTransport } from "../transport/HttpTransport.mjs";
import { syncEventEmitter } from "../tallySseRoutes.mjs";
import { XmlValidator } from "../xml/XmlValidator.mjs";
import { wrapTallyXML, formatTallyDate, normalizeTallyUnit } from "../xml/TallyXmlUtil.mjs";
import { AccountingDocument } from "../models/AccountingDocument.mjs";
import { SalesInventoryBuilder } from "../xml/builders/SalesInventoryBuilder.mjs";
import { SalesAccountingBuilder } from "../xml/builders/SalesAccountingBuilder.mjs";
import { PurchaseInventoryBuilder } from "../xml/builders/PurchaseInventoryBuilder.mjs";
import { PurchaseAccountingBuilder } from "../xml/builders/PurchaseAccountingBuilder.mjs";
import { TransactionAccountingBuilder } from "../xml/builders/TransactionAccountingBuilder.mjs";

export class TallySyncOrchestrator {
  /**
   * Processes the entire queue
   */
  static async processQueue(settings) {
    syncEventEmitter.emit("log", { message: "Starting Tally Sync Queue processing..." });
    
    const initialTotal = QueueEngine.getPendingCount();
    
    if (initialTotal === 0) {
      syncEventEmitter.emit("log", { message: "Queue is empty. Nothing to sync." });
      syncEventEmitter.emit("complete", { success: true, message: "Queue is empty." });
      return { success: true, message: "Queue is empty." };
    }

    let successCount = 0;
    let failCount = 0;
    let processedThisRun = 0;
    
    // Reset flags at the start
    global.tallySyncPaused = false;
    global.tallySyncStopped = false;

    while (true) {
      if (global.tallySyncStopped) {
         syncEventEmitter.emit("log", { message: "Sync stopped by user." });
         break;
      }
      if (global.tallySyncPaused) {
         await new Promise(resolve => setTimeout(resolve, 2000));
         continue;
      }

      const batch = QueueEngine.getNextBatch(100);
      
      if (batch.length === 0) {
        break; // No more items
      }

      for (const item of batch) {
        if (global.tallySyncStopped) {
           syncEventEmitter.emit("log", { message: "Sync stopped by user." });
           break;
        }
        while (global.tallySyncPaused) {
           await new Promise(resolve => setTimeout(resolve, 2000));
           if (global.tallySyncStopped) break;
        }
        if (global.tallySyncStopped) break;

        processedThisRun++;
        syncEventEmitter.emit("progress", { 
          current: processedThisRun, 
          total: initialTotal > processedThisRun ? initialTotal : processedThisRun, 
          item: `${item.entity_type} #${item.entity_id}` 
        });
        syncEventEmitter.emit("log", { message: `[${processedThisRun}/${initialTotal}] Syncing ${item.entity_type} #${item.entity_id}...` });
        
        try {
          await this.processItem(item, settings);
          QueueEngine.markSynced(item.entity_type, item.entity_id);
          successCount++;
          syncEventEmitter.emit("log", { message: `✅ Successfully synced ${item.entity_type} #${item.entity_id}` });
        } catch (err) {
          QueueEngine.markFailed(item.entity_type, item.entity_id, err.message);
          failCount++;
          syncEventEmitter.emit("log", { message: `❌ Failed to sync ${item.entity_type} #${item.entity_id}: ${err.message}` });
        }
      }

    }

    const finalMessage = `Processed ${processedThisRun} items. Success: ${successCount}, Failed: ${failCount}`;
    syncEventEmitter.emit("log", { message: finalMessage });
    syncEventEmitter.emit("complete", { successCount, failCount });
    return { success: true, message: finalMessage };
  }

  static async processItem(item, settings) {
    if (item.action_type === 'Delete') {
      // Just map to Cancel action for vouchers, handled in builders
    }

    if (item.entity_type === "sale" || item.entity_type === "purchase" || item.entity_type === "transaction" || item.entity_type === "expense") {
      const doc = this.buildAccountingDocument(item, settings);
      
      const validation = XmlValidator.validate(doc);
      if (!validation.isValid) {
        throw new Error("Validation Failed: " + validation.errors.join(" | "));
      }

      // Inline Auto-Recovery
      if (item.entity_type === "sale" || item.entity_type === "purchase") {
        await DependencyResolver.resolveLedger(doc.partyLedgerName, settings, item.entity_type === "sale", item.entity_type === "sale" ? doc._customerId : null);
        if (doc.isItemized) {
          for (const i of doc.items) {
            await DependencyResolver.resolveStockItem(i, settings);
          }
        }
      } else if (item.entity_type === "transaction") {
        if (doc.partyLedgerName) {
           await DependencyResolver.resolveLedger(doc.partyLedgerName, settings, doc._isCustomer, doc._customerId);
        }
      } else if (item.entity_type === "expense") {
        await DependencyResolver.resolveExpenseLedger(doc.partyLedgerName, settings);
      }

      // Build XML
      let xml = "";
      if (item.entity_type === "sale") {
        xml = doc.isItemized ? SalesInventoryBuilder.build(doc, settings) : SalesAccountingBuilder.build(doc, settings);
      } else if (item.entity_type === "purchase") {
        xml = doc.isItemized ? PurchaseInventoryBuilder.build(doc, settings) : PurchaseAccountingBuilder.build(doc, settings);
      } else if (item.entity_type === "transaction" || item.entity_type === "expense") {
        xml = TransactionAccountingBuilder.build(doc, settings);
      }

      const payload = wrapTallyXML(xml, "Vouchers");
      let res = await HttpTransport.send(settings.tally_url, payload, item.entity_type, item.entity_id);
      
      if (!res.success) {
        // Idempotency & Auto-Healing: If Tally says it's a duplicate, it already exists.
        if (res.message.toLowerCase().includes("duplicate voucher number") || res.message.toLowerCase().includes("voucher number already exists")) {
           // It exists! If Kosh meant to Create, we can just treat it as Auto-Healed.
           // If Kosh wanted to ensure it is fully updated with current data, we switch to Alter and retry.
           console.log(`[TALLY] Auto-healing triggered for ${item.entity_type} ${doc.referenceNo}. Retrying as Alter.`);
           
           // Replace Create with Alter in the XML
           const alterXml = xml.replace('ACTION="Create"', 'ACTION="Alter"');
           const alterPayload = wrapTallyXML(alterXml, "Vouchers");
           
           res = await HttpTransport.send(settings.tally_url, alterPayload, item.entity_type, item.entity_id);
           
           if (!res.success) {
             throw new Error("Auto-Heal Alter Failed: " + res.message);
           }
        } else if (res.message.toLowerCase().includes("date cannot be below financial year") || res.message.toLowerCase().includes("date cannot be above") || res.message.toLowerCase().includes("out of range")) {
           console.log(`[TALLY] Date validation error for ${doc.referenceNo}. Auto-correcting to 1-Apr and retrying.`);
           const dateCorrectedXml = xml.replace(/<DATE>[^<]+<\/DATE>/g, '<DATE>01-Apr</DATE>');
           const datePayload = wrapTallyXML(dateCorrectedXml, "Vouchers");
           
           res = await HttpTransport.send(settings.tally_url, datePayload, item.entity_type, item.entity_id);
           if (!res.success) {
             throw new Error("Date Auto-Correct Failed: " + res.message);
           }
        } else {
          throw new Error(res.message);
        }
      }
    } else if (item.entity_type === "customer" || item.entity_type === "supplier" || item.entity_type === "product" || item.entity_type === "unit" || item.entity_type === "group") {
      // Masters that are in queue explicitly
      // Typically resolved via DependencyResolver, but if they are edited independently, we sync them here.
      if (item.entity_type === "customer") await DependencyResolver.resolveLedger(this.getEntityName("customers", item.entity_id), settings, true, item.entity_id);
      if (item.entity_type === "supplier") await DependencyResolver.resolveLedger(this.getEntityName("suppliers", item.entity_id), settings, false);
      if (item.entity_type === "product") {
         const p = dbProxy.prepare(`
           SELECT p.*, c.name as category_name 
           FROM products p 
           LEFT JOIN categories c ON p.category = c.id 
           WHERE p.id = ?
         `).get(item.entity_id);
         if (p) await DependencyResolver.resolveStockItem({ 
           name: p.name, 
           category: p.category_name, 
           unit: normalizeTallyUnit(p.base_unit), 
           hsn: p.hsn, 
           gstRate: p.gst_rate 
         }, settings);
      }
    } else {
      throw new Error(`Unsupported entity type: ${item.entity_type}`);
    }
  }

  static getEntityName(table, id) {
     const ent = dbProxy.prepare(`SELECT name FROM ${table} WHERE id = ?`).get(id);
     return ent ? ent.name : null;
  }

  static buildAccountingDocument(item, settings) {
    const mainDb = dbProxy;
    const doc = new AccountingDocument();
    doc.id = item.entity_id;
    doc.action = item.action_type;
    doc.isItemized = settings.sync_mode === 'itemized';
    const safeTallyDate = (...candidates) => {
      const selected = candidates.find((candidate) => candidate && candidate.toString().trim());
      return formatTallyDate(selected || new Date(), settings.educational_mode);
    };

    if (item.entity_type === "sale") {
      const sale = mainDb.prepare("SELECT * FROM sales WHERE id = ?").get(item.entity_id);
      if (!sale) throw new Error("Sale not found in main database.");

      doc.voucherType = "Sales";
      doc.date = safeTallyDate(sale.created_at);
      doc.referenceNo = sale.reference_no;
      doc.partyLedgerName = sale.customer_name || settings.cash_ledger;
      doc._customerId = sale.customer_id;
      doc.partyState = sale.state || "";
      doc.totalAmount = Number(sale.total_amount);
      doc.discountAmount = Number(sale.discount || 0);
      doc.roundOffAmount = Number(sale.round_off || 0);
      
      const shop = mainDb.prepare("SELECT state FROM shop WHERE id = 1").get();
      doc.isInterstate = doc.partyState && shop?.state && doc.partyState.toLowerCase() !== shop.state.toLowerCase();

      const items = mainDb.prepare("SELECT * FROM sales_items WHERE sale_id = ?").all(sale.id);
      let taxAmount = 0;
      let taxableSum = 0;

      for (const i of items) {
        const itemPrice = Number(i.price);
        const gstRate = i.gst_rate || 0;
        const taxable = Number((itemPrice / (1 + gstRate / 100)).toFixed(2));
        const tax = Number((itemPrice - taxable).toFixed(2));
        
        taxableSum += taxable;
        taxAmount += tax;

        doc.items.push({
          name: i.product_name,
          quantity: i.quantity,
          rate: Number((taxable / (i.quantity || 1)).toFixed(2)),
          amount: taxable,
          unit: normalizeTallyUnit(i.unit),
          gstRate: gstRate,
          hsn: i.hsn
        });
      }

      doc.taxableAmount = Number(taxableSum.toFixed(2));
      if (doc.isInterstate) {
        doc.igstAmount = Number(taxAmount.toFixed(2));
      } else {
        doc.cgstAmount = Number((taxAmount / 2).toFixed(2));
        doc.sgstAmount = Number((taxAmount / 2).toFixed(2));
      }
    } else if (item.entity_type === "purchase") {
       const pur = mainDb.prepare("SELECT * FROM purchases WHERE id = ?").get(item.entity_id);
       if (!pur) throw new Error("Purchase not found in main database.");
 
       doc.voucherType = "Purchase";
       doc.date = safeTallyDate(pur.purchase_date, pur.created_at);
       doc.referenceNo = pur.reference_no;
       doc.partyLedgerName = pur.supplier_name || settings.cash_ledger;
       doc.totalAmount = Number(pur.total_amount);
       doc.discountAmount = Number(pur.discount || 0);
       doc.roundOffAmount = Number(pur.round_off || 0);
       doc.isInterstate = pur.is_interstate === 1;
 
       const items = mainDb.prepare("SELECT * FROM purchase_items WHERE purchase_id = ?").all(pur.id);
       let taxAmount = 0;
       let taxableSum = 0;
 
       for (const i of items) {
         let pName = i.product_name;
         if (!pName) {
           const p = mainDb.prepare("SELECT name FROM products WHERE id = ?").get(i.product_id);
           pName = p ? p.name : `Item ${i.product_id}`;
         }

         const itemPrice = Number(i.price); // total price for this row including GST
         const gstRate = i.gst_rate || 0;
         const taxable = Number((itemPrice / (1 + gstRate / 100)).toFixed(2));
         const tax = Number((itemPrice - taxable).toFixed(2));
         
         taxableSum += taxable;
         taxAmount += tax;
 
         doc.items.push({
           name: pName,
           quantity: i.quantity,
           rate: Number((taxable / (i.quantity || 1)).toFixed(2)),
           amount: taxable,
           unit: normalizeTallyUnit(i.unit),
           gstRate: gstRate
         });
       }
 
       doc.taxableAmount = Number(taxableSum.toFixed(2));
       if (doc.isInterstate) {
         doc.igstAmount = Number(taxAmount.toFixed(2));
       } else {
         doc.cgstAmount = Number((taxAmount / 2).toFixed(2));
         doc.sgstAmount = Number((taxAmount / 2).toFixed(2));
       }
    } else if (item.entity_type === "transaction") {
       const txn = mainDb.prepare("SELECT * FROM transactions WHERE id = ?").get(item.entity_id);
       if (!txn) throw new Error("Transaction not found in main database.");
       
       doc.date = safeTallyDate(txn.transaction_date, txn.created_at);
       doc.referenceNo = txn.reference_no;
       doc.totalAmount = Number(txn.amount);
       doc.paymentMode = txn.payment_mode ? txn.payment_mode.toLowerCase() : "cash";
       doc.narration = txn.note || "";
       
       if (txn.type === "payment_in") {
         doc.voucherType = "Receipt";
       } else if (txn.type === "payment_out") {
         doc.voucherType = "Payment";
       } else if (txn.type === "credit_note") {
         doc.voucherType = "Credit Note";
       } else if (txn.type === "debit_note") {
         doc.voucherType = "Debit Note";
       } else {
         doc.voucherType = "Journal"; // fallback
       }

       // Find the party name from entity_id and entity_type
       if (txn.entity_type === "customer") {
         const c = mainDb.prepare("SELECT name FROM customers WHERE id = ?").get(txn.entity_id);
         doc.partyLedgerName = c ? c.name : `Customer ${txn.entity_id}`;
         doc._isCustomer = true;
         doc._customerId = txn.entity_id;
       } else if (txn.entity_type === "supplier") {
         const s = mainDb.prepare("SELECT name FROM suppliers WHERE id = ?").get(txn.entity_id);
         doc.partyLedgerName = s ? s.name : `Supplier ${txn.entity_id}`;
         doc._isCustomer = false;
         doc._customerId = txn.entity_id;
       } else {
         doc.partyLedgerName = `Entity ${txn.entity_id}`;
         doc._isCustomer = false;
       }

    } else if (item.entity_type === "expense") {
       const exp = mainDb.prepare("SELECT * FROM expenses WHERE id = ?").get(item.entity_id);
       if (!exp) throw new Error("Expense not found in main database.");
       
       doc.voucherType = "Payment"; // Expenses are payments
       doc.date = safeTallyDate(exp.date, exp.created_at);
       doc.referenceNo = "EXP/" + exp.id;
       doc.totalAmount = Number(exp.amount);
       doc.paymentMode = exp.payment_mode ? exp.payment_mode.toLowerCase() : "cash";
       doc.narration = exp.description || "";
       doc.partyLedgerName = exp.category || settings.default_expense_ledger;
    }

    return doc;
  }
}
