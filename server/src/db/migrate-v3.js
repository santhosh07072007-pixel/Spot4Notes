const db = require('./index');
require('dotenv').config();

const migrateV3 = async () => {
  try {
    console.log('🔄 Running v3 migrations (multi-department support)...');

    // Add is_common column to materials
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT FALSE;`);

    // Create material_departments junction table for many-to-many
    await db.query(`
      CREATE TABLE IF NOT EXISTS material_departments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(material_id, department_id)
      );
    `);

    // Add indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_material_departments_material ON material_departments(material_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_material_departments_department ON material_departments(department_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_materials_is_common ON materials(is_common);`);

    // Backfill: for existing materials with department_id, add a row in junction table
    await db.query(`
      INSERT INTO material_departments (material_id, department_id)
      SELECT id, department_id FROM materials WHERE department_id IS NOT NULL
      ON CONFLICT (material_id, department_id) DO NOTHING;
    `);

    console.log('✅ V3 migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ V3 Migration failed:', error);
    process.exit(1);
  }
};

migrateV3();
