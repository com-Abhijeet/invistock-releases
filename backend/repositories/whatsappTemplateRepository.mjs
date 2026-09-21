import db from "../db/db.mjs";

export const DEFAULT_TEMPLATES = [
  // 1. Invoices
  {
    id: 1,
    name: "Standard Invoice Delivery",
    category: "invoice",
    is_default: 1,
    content: "Dear {{name}},\n\nThank you for shopping with {{shop_name}}!\n\nTotal Invoice Amount: ₹{{total}}.\n\nPlease find your tax invoice PDF attached below. Have a wonderful day!",
    meta_template_name: "invoice_delivery_v2",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 2,
    name: "Detailed Invoice Summary",
    category: "invoice",
    is_default: 0,
    content: "Greetings from {{shop_name}}!\nInvoice Summary\n———————————————\nHello {{name}},\n\n🧾 *Bill No:* {{reference_no}}\n\n*Total Amount:* ₹{{total}}\n———————————————\nThank you for shopping with us 🙏\nPlease find your tax invoice PDF attached below. Have a great day!",
    meta_template_name: "invoice_summary_text",
    meta_status: "LOCAL_ONLY",
  },

  // 2. Account Ledgers
  {
    id: 3,
    name: "Customer Account Ledger Statement",
    category: "ledgers",
    is_default: 1,
    content: "Dear {{name}},\n\nPlease find attached your detailed account ledger statement from {{shop_name}}.\n\nThank you for your business!",
    meta_template_name: "customer_ledger_statement",
    meta_status: "LOCAL_ONLY",
  },

  // 3. Outstanding Payment Reminders (All 10 built-in templates)
  {
    id: 4,
    name: "Payment Reminder #1 (Standard)",
    category: "outstandings",
    is_default: 1,
    content: "Dear {{name}},\n\nThis is a friendly reminder from {{shop_name}} regarding your outstanding balance of *₹{{total}}*.\n\n*Pending Invoices:* {{bills}}\n\nPlease arrange the payment at your earliest convenience. Thank you!",
    meta_template_name: "payment_reminder_standard",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 5,
    name: "Payment Reminder #2 (Gentle Note)",
    category: "outstandings",
    is_default: 0,
    content: "Hello {{name}},\n\nWe hope you are having a great day. Just writing to gently remind you about your pending dues with {{shop_name}}.\n\n*Account Overview:* {{bills}}\n\n*Total Due: ₹{{total}}*\n\nKindly process the payment soon. Thank you!",
    meta_template_name: "payment_reminder_gentle",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 6,
    name: "Payment Reminder #3 (Appreciation)",
    category: "outstandings",
    is_default: 0,
    content: "Greetings from {{shop_name}}, {{name}}!\n\nWe truly value your continued business. Please find the details of your outstanding invoices below:\n{{bills}}\n\n*Total Pending: ₹{{total}}*\n\nLooking forward to your prompt response. Thank you!",
    meta_template_name: "payment_reminder_appreciation",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 7,
    name: "Payment Reminder #4 (Quick Balance Check)",
    category: "outstandings",
    is_default: 0,
    content: "Hi {{name}},\n\nJust a quick note from {{shop_name}} to remind you of your overdue account balance.\n\n*Pending Details:* {{bills}}\n\n*Net Balance: ₹{{total}}*\n\nPlease let us know if you need any clarification. Thank you!",
    meta_template_name: "payment_reminder_quick_check",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 8,
    name: "Payment Reminder #5 (Automated Statement)",
    category: "outstandings",
    is_default: 0,
    content: "Dear {{name}},\n\nThis is an automated statement update from {{shop_name}}. Your account currently shows an outstanding balance of *₹{{total}}*.\n\n*Invoice Breakdown:* {{bills}}\n\nWe request you to kindly clear these dues. Thank you!",
    meta_template_name: "payment_reminder_automated",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 9,
    name: "Payment Reminder #6 (Soft Reminder)",
    category: "outstandings",
    is_default: 0,
    content: "Hello {{name}},\n\nThank you for your association with {{shop_name}}. We wanted to bring to your attention the following pending bills:\n{{bills}}\n\n*Total Amount Left: ₹{{total}}*\n\nYour prompt payment would be highly appreciated. Thank you!",
    meta_template_name: "payment_reminder_soft",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 10,
    name: "Payment Reminder #7 (Direct Due Notice)",
    category: "outstandings",
    is_default: 0,
    content: "Hi {{name}},\n\nGentle reminder regarding your pending balance of *₹{{total}}* with {{shop_name}}.\n\n*Details:* {{bills}}\n\nPlease initiate the payment at your earliest convenience. Have a great day!",
    meta_template_name: "payment_reminder_direct",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 11,
    name: "Payment Reminder #8 (Overdue Statement)",
    category: "outstandings",
    is_default: 0,
    content: "Greetings {{name}},\n\nWe are reaching out to share your latest outstanding statement from {{shop_name}}.\n\n*Unpaid Bills:* {{bills}}\n\n*Total Overdue: ₹{{total}}*\n\nKindly clear your dues to ensure uninterrupted service. Thank you!",
    meta_template_name: "payment_reminder_overdue",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 12,
    name: "Payment Reminder #9 (Urgent Action Required)",
    category: "outstandings",
    is_default: 0,
    content: "Dear {{name}},\n\nPlease note that your account with {{shop_name}} has overdue invoices pending clearance.\n\n*Summary:* {{bills}}\n\n*Total Due: ₹{{total}}*\n\nWe request your cooperation in settling this soon. Thank you!",
    meta_template_name: "payment_reminder_urgent",
    meta_status: "LOCAL_ONLY",
  },

  // 4. Marketing & Retention
  {
    id: 13,
    name: "Marketing - We Miss You",
    category: "marketing",
    is_default: 1,
    content: "Hello {{name}}! 👋\n\nIt's been a while since we saw you at {{shop_name}}. We miss you!\n\nAs a special gift, enjoy a discount on your next visit. Thank you!",
    meta_template_name: "marketing_we_miss_you",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 14,
    name: "Marketing - New Stock Arrivals",
    category: "marketing",
    is_default: 0,
    content: "Hi {{name}}! 🛍️\n\nJust wanted to let you know we have exciting new stock in store at {{shop_name}}.\n\nDrop by to check it out! See you soon!",
    meta_template_name: "marketing_new_stock",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 15,
    name: "Marketing - Special Sale Alert",
    category: "marketing",
    is_default: 0,
    content: "Big News {{name}}! 📣\n\nOur Special Sale starts tomorrow at {{shop_name}}. Up to 50% OFF on select items.\n\nDon't miss out! Visit us today!",
    meta_template_name: "marketing_sale_alert",
    meta_status: "LOCAL_ONLY",
  },

  // 5. Sales & Purchase Returns
  {
    id: 16,
    name: "Sales Return Confirmation",
    category: "sales_return",
    is_default: 1,
    content: "Dear {{name}},\n\nYour sales return reference {{reference_no}} for ₹{{amount}} has been processed successfully by {{shop_name}}. Thank you!",
    meta_template_name: "sales_return_receipt",
    meta_status: "LOCAL_ONLY",
  },
  {
    id: 17,
    name: "Purchase Return Advice",
    category: "purchase_return",
    is_default: 1,
    content: "Dear {{supplier_name}},\n\nPurchase return reference {{reference_no}} for ₹{{amount}} has been created by {{shop_name}}. Thank you!",
    meta_template_name: "purchase_return_advice",
    meta_status: "LOCAL_ONLY",
  },
];

/**
 * Seed initial default templates if missing, and update existing built-in default templates.
 */
export function seedDefaultTemplates() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(whatsapp_templates)").all();
    const hasBodyText = tableInfo.some((c) => c.name === "body_text");

    const updateStmt = hasBodyText
      ? db.prepare(`
          UPDATE whatsapp_templates 
          SET content = ?, body_text = ?
          WHERE meta_template_name = ? OR name = ?
        `)
      : db.prepare(`
          UPDATE whatsapp_templates 
          SET content = ?
          WHERE meta_template_name = ? OR name = ?
        `);

    const checkStmt = db.prepare(
      "SELECT id FROM whatsapp_templates WHERE (meta_template_name IS NOT NULL AND meta_template_name = ?) OR name = ?"
    );

    const insertStmt = hasBodyText
      ? db.prepare(`
          INSERT INTO whatsapp_templates (name, category, is_default, content, body_text, meta_template_name, meta_status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
      : db.prepare(`
          INSERT INTO whatsapp_templates (name, category, is_default, content, meta_template_name, meta_status)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

    let seededCount = 0;
    let updatedCount = 0;

    for (const tpl of DEFAULT_TEMPLATES) {
      const metaName = tpl.meta_template_name || "";
      const exists = checkStmt.get(metaName, tpl.name);

      if (exists) {
        if (hasBodyText) {
          const res = updateStmt.run(tpl.content, tpl.content, metaName, tpl.name);
          if (res.changes > 0) updatedCount += res.changes;
        } else {
          const res = updateStmt.run(tpl.content, metaName, tpl.name);
          if (res.changes > 0) updatedCount += res.changes;
        }
      } else {
        if (hasBodyText) {
          insertStmt.run(
            tpl.name,
            tpl.category,
            tpl.is_default ? 1 : 0,
            tpl.content,
            tpl.content,
            tpl.meta_template_name || null,
            tpl.meta_status || "LOCAL_ONLY"
          );
        } else {
          insertStmt.run(
            tpl.name,
            tpl.category,
            tpl.is_default ? 1 : 0,
            tpl.content,
            tpl.meta_template_name || null,
            tpl.meta_status || "LOCAL_ONLY"
          );
        }
        seededCount++;
      }
    }

    if (seededCount > 0 || updatedCount > 0) {
      console.log(`[DB] Seeded ${seededCount} new, updated ${updatedCount} built-in default WhatsApp templates.`);
    }
  } catch (err) {
    console.error("[DB] Error seeding default WhatsApp templates:", err.message);
  }
}

/**
 * Get templates, optionally filtered by category.
 */
export function getWhatsAppTemplates(category = null) {
  seedDefaultTemplates();
  try {
    let rows = [];
    if (category && category !== "all") {
      rows = db
        .prepare(
          `SELECT * FROM whatsapp_templates WHERE category = ? ORDER BY is_default DESC, created_at DESC`
        )
        .all(category);
    } else {
      rows = db
        .prepare(
          `SELECT * FROM whatsapp_templates ORDER BY category ASC, is_default DESC, created_at DESC`
        )
        .all();
    }

    if (rows && rows.length > 0) {
      return rows;
    }

    // Fallback: If DB returns 0 rows, return mapped DEFAULT_TEMPLATES
    if (category && category !== "all") {
      return DEFAULT_TEMPLATES.filter((t) => t.category === category);
    }
    return DEFAULT_TEMPLATES;
  } catch (err) {
    console.error("[DB] Failed to fetch WhatsApp templates:", err.message);
    if (category && category !== "all") {
      return DEFAULT_TEMPLATES.filter((t) => t.category === category);
    }
    return DEFAULT_TEMPLATES;
  }
}

/**
 * Create custom user template.
 */
export function createWhatsAppTemplate(data) {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(whatsapp_templates)").all();
    const hasBodyText = tableInfo.some((c) => c.name === "body_text");

    const stmt = hasBodyText
      ? db.prepare(`
          INSERT INTO whatsapp_templates (
            name, category, is_default, content, body_text, meta_template_name, meta_status, language
          ) VALUES (
            @name, @category, 0, @content, @content, @meta_template_name, 'LOCAL_ONLY', @language
          )
        `)
      : db.prepare(`
          INSERT INTO whatsapp_templates (
            name, category, is_default, content, meta_template_name, meta_status, language
          ) VALUES (
            @name, @category, 0, @content, @meta_template_name, 'LOCAL_ONLY', @language
          )
        `);

    const result = stmt.run({
      name: String(data.name).trim(),
      category: String(data.category || "marketing").trim(),
      content: String(data.content || "").trim(),
      meta_template_name: data.meta_template_name
        ? String(data.meta_template_name).trim().toLowerCase()
        : null,
      language: data.language || "en_US",
    });

    return { id: result.lastInsertRowid, success: true };
  } catch (err) {
    console.error("[DB] Failed to create WhatsApp template:", err.message);
    throw err;
  }
}

/**
 * Update custom template.
 */
export function updateWhatsAppTemplate(id, data) {
  try {
    const stmt = db.prepare(`
      UPDATE whatsapp_templates
      SET
        name = ?,
        category = ?,
        content = ?,
        meta_template_name = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ? AND is_default = 0
    `);

    stmt.run(
      String(data.name).trim(),
      String(data.category).trim(),
      String(data.content).trim(),
      data.meta_template_name ? String(data.meta_template_name).trim().toLowerCase() : null,
      id
    );

    return { success: true };
  } catch (err) {
    console.error("[DB] Failed to update WhatsApp template:", err.message);
    throw err;
  }
}

/**
 * Delete custom template.
 */
export function deleteWhatsAppTemplate(id) {
  try {
    const stmt = db.prepare(
      "DELETE FROM whatsapp_templates WHERE id = ? AND is_default = 0"
    );
    const res = stmt.run(id);
    return { success: true, deleted: res.changes > 0 };
  } catch (err) {
    console.error("[DB] Failed to delete WhatsApp template:", err.message);
    throw err;
  }
}

/**
 * Update meta_status for matching meta_template_name.
 */
export function updateMetaStatus(metaTemplateName, status) {
  try {
    db.prepare(`
      UPDATE whatsapp_templates
      SET meta_status = ?, updated_at = datetime('now', 'localtime')
      WHERE meta_template_name = ?
    `).run(status, metaTemplateName.toLowerCase());
  } catch (err) {
    console.error("[DB] Failed to update meta status:", err.message);
  }
}

/**
 * Fetch a single template by ID.
 */
export function getTemplateById(id) {
  try {
    return db.prepare("SELECT * FROM whatsapp_templates WHERE id = ?").get(id);
  } catch (err) {
    console.error("[DB] Failed to get WhatsApp template by ID:", err.message);
    return null;
  }
}

/**
 * Set a template as default for its category.
 */
export function setDefaultTemplate(id, category) {
  try {
    db.transaction(() => {
      // Clear default flag for all templates in category
      db.prepare("UPDATE whatsapp_templates SET is_default = 0 WHERE category = ?").run(category);
      // Set new default
      db.prepare("UPDATE whatsapp_templates SET is_default = 1 WHERE id = ?").run(id);
    })();
    return { success: true };
  } catch (err) {
    console.error("[DB] Failed to set default WhatsApp template:", err.message);
    throw err;
  }
}

