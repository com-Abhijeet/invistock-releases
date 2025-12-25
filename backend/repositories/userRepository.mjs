import db from "../db/db.mjs";

class UserRepository {
  createUser(userData) {
    const stmt = db.prepare(`
      INSERT INTO users (name, username, password, role, permissions)
      VALUES (@name, @username, @password, @role, @permissions)
    `);
    return stmt.run(userData);
  }

  findUserByUsername(username) {
    const stmt = db.prepare(
      "SELECT * FROM users WHERE username = ? AND is_active = 1"
    );
    return stmt.get(username);
  }

  findUserById(id) {
    const stmt = db.prepare(
      "SELECT id, name, username, role, permissions FROM users WHERE id = ?"
    );
    return stmt.get(id);
  }

  getAllUsers() {
    return db
      .prepare(
        "SELECT id, name, username, role, permissions, is_active, created_at FROM users"
      )
      .all();
  }

  updateUser(id, updates) {
    // Dynamic update query builder
    const fields = Object.keys(updates)
      .map((key) => `${key} = @${key}`)
      .join(", ");
    const stmt = db.prepare(`UPDATE users SET ${fields} WHERE id = @id`);
    return stmt.run({ ...updates, id });
  }

  deleteUser(id) {
    return db.prepare("DELETE FROM users WHERE id = ?").run(id);
  }

  logActivity(logData) {
    const stmt = db.prepare(`
      INSERT INTO access_logs (user_id, user_name, action, details, machine_type, ip_address)
      VALUES (@user_id, @user_name, @action, @details, @machine_type, @ip_address)
    `);
    return stmt.run(logData);
  }

  getRecentLogs(limit = 100) {
    console.log("getting access logs");
    return db
      .prepare("SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT ?")
      .all(limit);
  }
}

export default new UserRepository();
