const db = require('./index');
require('dotenv').config();

const migrateAdmin = async () => {
  try {
    console.log('🔄 Running admin feature migrations...');

    // Activity logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id UUID,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Announcements table
    await db.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(300) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add last_login_at to users if not exists
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    `);

    // Add is_locked column on materials for content control
    await db.query(`
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
    `);

    // Add downloads_disabled on materials
    await db.query(`
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS downloads_disabled BOOLEAN DEFAULT FALSE;
    `);

    // Add course_code to materials
    await db.query(`
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS course_code VARCHAR(50);
    `);

    // Add year to materials
    await db.query(`
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS year VARCHAR(20);
    `);

    // Add badge to users (for top contributor)
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS badge VARCHAR(50);
    `);

    // Indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_announcements_dept ON announcements(department_id);`);

    console.log('✅ Admin migrations completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Admin migration failed:', error);
    process.exit(1);
  }
};

migrateAdmin();
