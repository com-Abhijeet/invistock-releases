import crypto from "crypto";
import dbProxy from "../../db/db.mjs";
import { QueueEngine } from "./QueueEngine.mjs";
import { getTallyDb } from "../../db/tallyDb.mjs";

export class ComparisonEngine {
  /**
   * Scans all main database entities and queues them if changed.
   * Returns total number of new/changed items detected.
   */
  static scanAll() {
    let changes = 0;
    changes += this.scanTable("customers", "customer");
    changes += this.scanTable("suppliers", "supplier");
    changes += this.scanTable("products", "product");
    changes += this.scanTable("sales", "sale", "reference_no");
    changes += this.scanTable("purchases", "purchase", "reference_no");
    changes += this.scanTable("transactions", "transaction", "reference_no");
    changes += this.scanTable("expenses", "expense", "reference_no");
    return changes;
  }

  static scanTable(tableName, entityType, refField = null) {
    const mainDb = dbProxy;
    let changes = 0;
    
    // Using LIMIT in a real scenario might be needed for huge tables, but for now we scan all.
    const records = mainDb.prepare(`SELECT * FROM ${tableName}`).all();
    const tDb = getTallyDb();
    
    for (const record of records) {
      const hash = this.generateHash(record);
      const ref = refField ? record[refField] : null;
      
      const existing = tDb.prepare("SELECT last_hash, status FROM sync_state WHERE entity_type = ? AND entity_id = ?").get(entityType, record.id);
      
      if (!existing) {
        QueueEngine.enqueue(entityType, record.id, ref, hash, "Create");
        changes++;
      } else if (existing.last_hash !== hash && existing.status !== 'pending' && existing.status !== 'processing') {
        QueueEngine.enqueue(entityType, record.id, ref, hash, "Alter");
        changes++;
      }
    }
    return changes;
  }

  static generateHash(obj) {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(obj))
      .digest("hex");
  }
}
