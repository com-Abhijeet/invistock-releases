/**
 * Dynamically builds an SQL INSERT statement from an object.
 * @param {string} tableName The name of the table to insert into.
 * @param {object} data The data object. Keys must match column names.
 * @returns {{sql: string}}
 */
export function buildInsertQuery(tableName, data) {
  const columns = Object.keys(data);
  const placeholders = columns.map((col) => `@${col}`).join(", ");
  const sql = `INSERT INTO ${tableName} (${columns.join(
    ", "
  )}) VALUES (${placeholders})`;
  return { sql };
}

/**
 * Dynamically builds an SQL UPDATE statement from an object.
 * @param {string} tableName The name of the table to update.
 * @param {object} data The object containing columns and new values.
 * @param {string} whereKey The primary key or column to use in the WHERE clause (e.g., "id").
 * @returns {{sql: string}}
 */
export function buildUpdateQuery(tableName, data, whereKey) {
  const fields = Object.keys(data);
  const setClause = fields.map((field) => `${field} = @${field}`).join(", ");
  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereKey} = @${whereKey}`;
  return { sql };
}
