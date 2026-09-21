import db from "../db/db.mjs";

/**
 * Fetches WhatsApp configuration settings (or creates default row if missing).
 */
export function getWhatsAppSettings() {
  let settings = db.prepare("SELECT * FROM whatsapp_settings WHERE id = 1").get();

  if (!settings) {
    db.prepare(`INSERT OR IGNORE INTO whatsapp_settings (id) VALUES (1)`).run();
    settings = db.prepare("SELECT * FROM whatsapp_settings WHERE id = 1").get();
  }

  return {
    id: settings.id,
    official_enabled: Boolean(settings.official_enabled),
    official_provider: settings.official_provider || "msg91",
    msg91_auth_key: settings.msg91_auth_key || "",
    msg91_integrated_number: settings.msg91_integrated_number || "",
    official_phone_number_id: settings.official_phone_number_id || "",
    official_waba_id: settings.official_waba_id || "",
    official_access_token: settings.official_access_token || "",
    official_business_number: settings.official_business_number || "",
    route_invoice: settings.route_invoice || "unofficial",
    route_ledgers: settings.route_ledgers || "unofficial",
    route_marketing: settings.route_marketing || "unofficial",
    route_outstandings: settings.route_outstandings || "unofficial",
    updated_at: settings.updated_at,
  };
}

/**
 * Updates WhatsApp settings (id = 1).
 */
export function updateWhatsAppSettings(data) {
  const current = getWhatsAppSettings();

  const official_enabled =
    data.official_enabled !== undefined
      ? data.official_enabled
        ? 1
        : 0
      : current.official_enabled
      ? 1
      : 0;

  const official_provider = data.official_provider || current.official_provider;
  const msg91_auth_key =
    data.msg91_auth_key !== undefined
      ? String(data.msg91_auth_key).trim()
      : current.msg91_auth_key;
  const msg91_integrated_number =
    data.msg91_integrated_number !== undefined
      ? String(data.msg91_integrated_number).trim()
      : current.msg91_integrated_number;

  const official_phone_number_id =
    data.official_phone_number_id !== undefined
      ? String(data.official_phone_number_id).trim()
      : current.official_phone_number_id;
  const official_waba_id =
    data.official_waba_id !== undefined
      ? String(data.official_waba_id).trim()
      : current.official_waba_id;
  const official_access_token =
    data.official_access_token !== undefined
      ? String(data.official_access_token).trim()
      : current.official_access_token;
  const official_business_number =
    data.official_business_number !== undefined
      ? String(data.official_business_number).trim()
      : current.official_business_number;

  const route_invoice = data.route_invoice || current.route_invoice;
  const route_ledgers = data.route_ledgers || current.route_ledgers;
  const route_marketing = data.route_marketing || current.route_marketing;
  const route_outstandings =
    data.route_outstandings || current.route_outstandings;

  db.prepare(`
    UPDATE whatsapp_settings
    SET
      official_enabled = ?,
      official_provider = ?,
      msg91_auth_key = ?,
      msg91_integrated_number = ?,
      official_phone_number_id = ?,
      official_waba_id = ?,
      official_access_token = ?,
      official_business_number = ?,
      route_invoice = ?,
      route_ledgers = ?,
      route_marketing = ?,
      route_outstandings = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = 1
  `).run(
    official_enabled,
    official_provider,
    msg91_auth_key,
    msg91_integrated_number,
    official_phone_number_id,
    official_waba_id,
    official_access_token,
    official_business_number,
    route_invoice,
    route_ledgers,
    route_marketing,
    route_outstandings
  );

  return getWhatsAppSettings();
}

/**
 * Logs a sent or failed WhatsApp message.
 */
export function logWhatsAppMessage({
  provider,
  category,
  recipient,
  status = "sent",
  error_message = null,
}) {
  try {
    db.prepare(`
      INSERT INTO whatsapp_logs (provider, category, recipient, status, error_message)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      provider || "unofficial",
      category || "general",
      recipient || "",
      status,
      error_message ? String(error_message) : null
    );
  } catch (err) {
    console.error("[DB] Failed to log WhatsApp message:", err.message);
  }
}

/**
 * Returns daily aggregated WhatsApp message usage stats.
 */
export function getWhatsAppUsageStats(days = 30) {
  try {
    const stats = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN provider = 'official' AND status = 'sent' THEN 1 ELSE 0 END) as official_count,
        SUM(CASE WHEN provider = 'unofficial' AND status = 'sent' THEN 1 ELSE 0 END) as unofficial_count,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as total_sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM whatsapp_logs
      WHERE created_at >= datetime('now', '-' || ? || ' days', 'localtime')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all(days);

    return stats || [];
  } catch (err) {
    console.error("[DB] Failed to fetch WhatsApp usage stats:", err.message);
    return [];
  }
}

/**
 * Returns recent logs.
 */
export function getWhatsAppLogs(limit = 100) {
  try {
    return db.prepare(`
      SELECT * FROM whatsapp_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  } catch (err) {
    console.error("[DB] Failed to fetch WhatsApp logs:", err.message);
    return [];
  }
}
