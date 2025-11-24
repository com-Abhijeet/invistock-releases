export const auditLog = async (req, res, next) => {
  try {
    const { method, originalUrl, body } = req;
    const db = (await import("../db/db.mjs")).default;

    const insert = db.prepare(`
      INSERT INTO audit_logs (method, endpoint, timestamp, payload)
      VALUES (?, ?, ?, ?)
    `);
    insert.run(
      method,
      originalUrl,
      new Date().toISOString(),
      JSON.stringify(body || {})
    );
  } catch (err) {
    console.error("❌ Audit log error:", err.message);
  }
  next();
};
