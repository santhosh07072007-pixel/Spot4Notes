const db = require('./src/db');

(async () => {
  try {
    await db.query('ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_scan_status_check');
    await db.query(`ALTER TABLE materials ADD CONSTRAINT materials_scan_status_check CHECK (scan_status IN ('pending', 'scanning', 'clean', 'flagged', 'needs_review'))`);
    console.log('✅ Constraint updated successfully');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
