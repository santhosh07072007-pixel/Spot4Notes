const db = require('./index');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const departments = [
  { name: 'Artificial Intelligence and Data Science', slug: 'ai-and-ds', icon: '🤖', description: 'Artificial Intelligence and Data Science' },
  { name: 'Biomedical Engineering', slug: 'biomedical', icon: '🧬', description: 'Biomedical Engineering' },
  { name: 'Chemical Engineering', slug: 'chemical', icon: '⚗️', description: 'Chemical Engineering' },
  { name: 'Civil Engineering', slug: 'civil', icon: '🏗️', description: 'Civil Engineering' },
  { name: 'Computer Science Engineering', slug: 'computer-science', icon: '💻', description: 'Computer Science Engineering' },
  { name: 'Artificial Intelligence and Machine Learning', slug: 'cs-aiml', icon: '🧠', description: 'Artificial Intelligence and Machine Learning' },
  { name: 'Computer Science and Business Systems', slug: 'csbs', icon: '📊', description: 'Computer Science and Business Systems' },
  { name: 'Cyber Security', slug: 'cyber-security', icon: '🔒', description: 'Cyber Security' },
  { name: 'Electronics and Communication Engineering', slug: 'ece', icon: '📡', description: 'Electronics and Communication Engineering' },
  { name: 'Electrical and Electronics Engineering', slug: 'eee', icon: '⚡', description: 'Electrical and Electronics Engineering' },
  { name: 'Information Technology', slug: 'information-technology', icon: '🌐', description: 'Information Technology' },
  { name: 'Mechanical Engineering', slug: 'mechanical', icon: '⚙️', description: 'Mechanical Engineering' },
  { name: 'Mechatronics Engineering', slug: 'mechatronics', icon: '🦾', description: 'Mechatronics Engineering' },
  { name: 'Master of Business Administration', slug: 'mba', icon: '📈', description: 'Master of Business Administration' },
];

const seed = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Seed departments
    for (const dept of departments) {
      await db.query(
        `INSERT INTO departments (name, slug, icon, description) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [dept.name, dept.slug, dept.icon, dept.description]
      );
    }
    console.log('✅ Departments seeded');

    // Create default admin account
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await db.query(
      `INSERT INTO users (name, email, password, role, is_verified)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Admin', `admin@${process.env.COLLEGE_EMAIL_DOMAIN || 'kpriet.ac.in'}`, hashedPassword, 'admin', true]
    );
    console.log('✅ Admin user seeded');

    console.log('✅ Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
