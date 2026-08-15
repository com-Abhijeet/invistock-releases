import db from "../db/db.mjs";

/**
 * Fetches current sales billing settings (or creates default single row if missing).
 */
export function getSalesBillingSettings() {
  let settings = db.prepare("SELECT * FROM sales_billing_settings WHERE id = 1").get();

  if (!settings) {
    db.prepare(`
      INSERT OR IGNORE INTO sales_billing_settings (
        id, use_queue, queue_type, use_default_customer, auto_print_after_save, send_whatsapp_invoice, payment_marking_timing, enable_split_payments
      ) VALUES (1, 1, 'fefo', 1, 0, 0, 'pre_save', 1)
    `).run();
    settings = db.prepare("SELECT * FROM sales_billing_settings WHERE id = 1").get();
  }

  return {
    id: settings.id,
    use_queue: Boolean(settings.use_queue),
    queue_type: settings.queue_type || "fefo",
    use_default_customer: Boolean(settings.use_default_customer),
    auto_print_after_save: Boolean(settings.auto_print_after_save),
    send_whatsapp_invoice: Boolean(settings.send_whatsapp_invoice),
    payment_marking_timing: settings.payment_marking_timing || "pre_save",
    enable_split_payments: Boolean(settings.enable_split_payments),
    updated_at: settings.updated_at,
  };
}

/**
 * Updates sales billing settings row (id = 1).
 */
export function updateSalesBillingSettings(data) {
  const current = getSalesBillingSettings();

  const use_queue = data.use_queue !== undefined ? (data.use_queue ? 1 : 0) : (current.use_queue ? 1 : 0);
  const queue_type = data.queue_type ? String(data.queue_type).toLowerCase() : current.queue_type;
  const use_default_customer = data.use_default_customer !== undefined ? (data.use_default_customer ? 1 : 0) : (current.use_default_customer ? 1 : 0);
  const auto_print_after_save = data.auto_print_after_save !== undefined ? (data.auto_print_after_save ? 1 : 0) : (current.auto_print_after_save ? 1 : 0);
  const send_whatsapp_invoice = data.send_whatsapp_invoice !== undefined ? (data.send_whatsapp_invoice ? 1 : 0) : (current.send_whatsapp_invoice ? 1 : 0);
  const payment_marking_timing = data.payment_marking_timing ? String(data.payment_marking_timing) : current.payment_marking_timing;
  const enable_split_payments = data.enable_split_payments !== undefined ? (data.enable_split_payments ? 1 : 0) : (current.enable_split_payments ? 1 : 0);

  db.prepare(`
    UPDATE sales_billing_settings
    SET
      use_queue = ?,
      queue_type = ?,
      use_default_customer = ?,
      auto_print_after_save = ?,
      send_whatsapp_invoice = ?,
      payment_marking_timing = ?,
      enable_split_payments = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = 1
  `).run(
    use_queue,
    queue_type,
    use_default_customer,
    auto_print_after_save,
    send_whatsapp_invoice,
    payment_marking_timing,
    enable_split_payments
  );

  return getSalesBillingSettings();
}
