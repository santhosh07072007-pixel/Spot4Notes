const db = require('./index');
require('dotenv').config();

const migrate = async () => {
  try {
    console.log('🔄 Running migrations...');

    // Enable extensions
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    try {
      await db.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);
    } catch (extErr) {
      console.warn('⚠️  pg_trgm extension not available — full-text search may be limited:', extErr.message);
    }

    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
        department VARCHAR(100),
        year VARCHAR(10),
        avatar_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_banned BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_expires TIMESTAMPTZ,
        reset_token VARCHAR(255),
        reset_expires TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Departments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Subjects table
    await db.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) NOT NULL,
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        semester INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(name, department_id)
      );
    `);

    // Materials table
    await db.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(300) NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size BIGINT,
        category VARCHAR(50) NOT NULL CHECK (category IN ('notes', 'question_papers', 'ppt', 'important_questions', 'study_materials')),
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        scan_status VARCHAR(20) DEFAULT 'pending' CHECK (scan_status IN ('pending', 'scanning', 'clean', 'flagged', 'needs_review')),
        scan_details JSONB,
        download_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        tags TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Reports table (for flagged content)
    await db.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
        reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
        admin_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Chat messages table (for AI chatbot history)
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id UUID NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        department VARCHAR(100),
        subject VARCHAR(200),
        material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Comments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Likes table
    await db.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, material_id)
      );
    `);

    // Create indexes for fast search
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_department ON materials(department_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_subject ON materials(subject_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_tags ON materials USING GIN(tags);`);
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_title_trgm ON materials USING GIN(title gin_trgm_ops);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_description_trgm ON materials USING GIN(description gin_trgm_ops);`);
    } catch (trgmErr) {
      console.warn('⚠️  Trigram indexes skipped (pg_trgm not available)');
    }
    await db.query(`CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_comments_material ON comments(material_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_likes_material ON likes(material_id);`);

    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
