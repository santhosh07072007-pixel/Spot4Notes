const db = require('./src/db');

async function verifyAll() {
  const result = await db.query("UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE");
  console.log(`Verified ${result.rowCount} user(s)`);
  process.exit();
}

verifyAll().catch(e => { console.error(e.message); process.exit(1); });
