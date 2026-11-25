const db = require('./index');
require('dotenv').config();

const migrateV4 = async () => {
    try {
        console.log('🔄 Running v4 migrations (AI features + analytics)...');

        // ─── AI Quality Score & Summary columns on materials ───
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS ai_quality_score JSONB;`);
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS ai_summary JSONB;`);
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS ai_questions JSONB;`);
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE;`);
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;`);
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS duplicate_status VARCHAR(50) DEFAULT 'unique';`);
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS similar_materials JSONB;`);

        // ─── AI Processing Queue table ───
        await db.query(`
      CREATE TABLE IF NOT EXISTS ai_processing_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
        task_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        result JSONB,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `);

        // ─── Student Analytics: engagement_score on users ───
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS contribution_rank INTEGER DEFAULT 0;`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_downloads_received INTEGER DEFAULT 0;`);

        // ─── Indexes ───
        await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_ai_processed ON materials(ai_processed);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_duplicate_status ON materials(duplicate_status);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_processing_queue(status);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_ai_queue_material ON ai_processing_queue(material_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_users_engagement ON users(engagement_score DESC);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_users_contribution ON users(contribution_rank);`);

        console.log('✅ V4 migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ V4 Migration failed:', error);
        process.exit(1);
    }
};

migrateV4();
