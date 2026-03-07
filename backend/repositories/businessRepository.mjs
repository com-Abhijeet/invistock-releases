import db from "../db/db.mjs";

export function getBusiness() {
  // Return the row if it exists, otherwise return a default object to prevent frontend null errors
  return db.prepare("SELECT * FROM business WHERE id = 1").get() || { id: 1 };
}

export function updateBusiness(data) {
  const cleanData = { ...data };
  delete cleanData.id; // Prevent overwriting the primary key

  const keys = Object.keys(cleanData);

  if (keys.length > 0) {
    // Dynamically build the SET clause: "key1 = ?, key2 = ?"
    const setClause = keys.map((key) => `${key} = ?`).join(", ");
    const values = Object.values(cleanData);

    // Attempt to execute the update
    const stmt = db.prepare(`UPDATE business SET ${setClause} WHERE id = 1`);
    const info = stmt.run(...values);

    // If 0 rows were changed, the singleton row doesn't exist yet.
    // Create it now, then immediately apply the update.
    if (info.changes === 0) {
      db.prepare("INSERT INTO business (id) VALUES (1)").run();
      db.prepare(`UPDATE business SET ${setClause} WHERE id = 1`).run(
        ...values,
      );
    }
  } else {
    // Even if no data was passed, ensure the singleton row exists
    const existing = db.prepare("SELECT 1 FROM business WHERE id = 1").get();
    if (!existing) {
      db.prepare("INSERT INTO business (id) VALUES (1)").run();
    }
  }

  return getBusiness();
}
