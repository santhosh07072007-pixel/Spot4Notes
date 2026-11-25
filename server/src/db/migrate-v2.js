const db = require('./index');
require('dotenv').config();

const migrateV2 = async () => {
  try {
    console.log('🔄 Running v2 migrations (new features)...');

    // Add roll_number and badge to users
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS badge VARCHAR(100);`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS study_streak INTEGER DEFAULT 0;`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date DATE;`);

    // Add course_code, course_title, year, semester to materials
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS course_code VARCHAR(50);`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS course_title VARCHAR(200);`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS year VARCHAR(20);`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS semester INTEGER;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS downloads_disabled BOOLEAN DEFAULT FALSE;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;`);

    // Bookmarks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, material_id)
      );
    `);

    // Ratings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, material_id)
      );
    `);

    // Announcements table
    await db.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Activity logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id UUID,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Study streaks table (daily tracking)
    await db.query(`
      CREATE TABLE IF NOT EXISTS study_streaks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        active_date DATE NOT NULL,
        actions INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, active_date)
      );
    `);

    // Exam countdowns table
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_countdowns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        exam_date DATE NOT NULL,
        department VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_material ON bookmarks(material_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_ratings_material ON ratings(material_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_study_streaks_user ON study_streaks(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_exam_countdowns_user ON exam_countdowns(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_course_code ON materials(course_code);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_semester ON materials(semester);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_year ON materials(year);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);`);

    console.log('✅ V2 migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ V2 Migration failed:', error);
    process.exit(1);
  }
};

migrateV2();
