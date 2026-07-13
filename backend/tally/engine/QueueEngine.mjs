import { getTallyDb } from "../../db/tallyDb.mjs";

export class QueueEngine {
  /**
   * Add or update an entity in the sync queue
   */
  static enqueue(entityType, entityId, referenceNo, hash, actionType = "Create") {
    const tDb = getTallyDb();
    
    // Check if it already exists
    const existing = tDb.prepare("SELECT status FROM sync_state WHERE entity_type = ? AND entity_id = ?").get(entityType, entityId);
    
    if (existing) {
      if (existing.status === 'success') {
        actionType = "Alter";
      }
      tDb.prepare(`
        UPDATE sync_state 
        SET last_hash = ?, status = 'pending', action_type = ?, retry_count = 0, is_permanent_failure = 0 
        WHERE entity_type = ? AND entity_id = ?
      `).run(hash, actionType, entityType, entityId);
    } else {
      tDb.prepare(`
        INSERT INTO sync_state (entity_type, entity_id, reference_no, last_hash, status, action_type) 
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).run(entityType, entityId, referenceNo, hash, actionType);
    }
  }

  /**
   * Get the next batch of items to sync based on priority and dependencies
   */
  static getNextBatch(limit = 100) {
    const tDb = getTallyDb();
    
    // Priority:
    // 1. Groups & Units
    // 2. Ledgers (Customers, Suppliers)
    // 3. Stock Items
    // 4. Vouchers (Sales, Purchases, etc)
    
    return tDb.prepare(`
      SELECT * FROM sync_state 
      WHERE status = 'pending' AND is_permanent_failure = 0
      ORDER BY 
        CASE 
          WHEN entity_type IN ('unit', 'group') THEN 1
          WHEN entity_type IN ('customer', 'supplier', 'ledger') THEN 2 
          WHEN entity_type IN ('product') THEN 3
          ELSE 4 
        END,
        retry_count ASC,
        entity_id ASC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Mark as successfully synced
   */
  static markSynced(entityType, entityId) {
    const tDb = getTallyDb();
    tDb.prepare(`
      UPDATE sync_state 
      SET status = 'success', action_type = 'Alter', error_log = NULL, retry_count = 0, last_attempt = datetime('now', 'localtime') 
      WHERE entity_type = ? AND entity_id = ?
    `).run(entityType, entityId);
  }

  /**
   * Mark as failed
   */
  static markFailed(entityType, entityId, errorMessage, isPermanent = false) {
    const tDb = getTallyDb();
    const maxRetries = 5;
    
    const current = tDb.prepare("SELECT retry_count FROM sync_state WHERE entity_type = ? AND entity_id = ?").get(entityType, entityId);
    const newCount = (current ? current.retry_count : 0) + 1;
    const permanent = isPermanent || newCount >= maxRetries ? 1 : 0;
    
    tDb.prepare(`
      UPDATE sync_state 
      SET status = 'failed', 
          error_log = ?, 
          retry_count = ?, 
          is_permanent_failure = ?,
          last_attempt = datetime('now', 'localtime')
      WHERE entity_type = ? AND entity_id = ?
    `).run(errorMessage, newCount, permanent, entityType, entityId);
  }
  
  static markDeleted(entityType, entityId) {
    const tDb = getTallyDb();
    tDb.prepare("UPDATE sync_state SET status = 'deleted' WHERE entity_type = ? AND entity_id = ?").run(entityType, entityId);
  }

  /**
   * Get total number of pending or failed items that are actionable
   */
  static getPendingCount() {
    const tDb = getTallyDb();
    const result = tDb.prepare("SELECT count(*) as count FROM sync_state WHERE status = 'pending' AND is_permanent_failure = 0").get();
    return result ? result.count : 0;
  }
}
