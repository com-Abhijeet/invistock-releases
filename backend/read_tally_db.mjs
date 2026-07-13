import Database from 'better-sqlite3';
const db = new Database('./db/tally_sync.db');
console.log(db.prepare("SELECT * FROM sync_state WHERE status='failed'").all());
