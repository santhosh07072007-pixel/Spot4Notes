const db = require('./src/db');

async function fixAdmin() {
  await db.query("DELETE FROM users WHERE email LIKE '%@college.edu'");
  console.log('Old admin removed');
  process.exit();
}

fixAdmin().catch(e => { console.error(e.message); process.exit(1); });
