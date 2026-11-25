const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all departments
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM departments ORDER BY name');
    res.json({ departments: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get department by slug
router.get('/:slug', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM departments WHERE slug = $1', [req.params.slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const department = result.rows[0];

    // Get subjects for this department
    const subjects = await db.query(
      'SELECT * FROM subjects WHERE department_id = $1 ORDER BY semester, name',
      [department.id]
    );

    // Get material counts by category
    const counts = await db.query(
      `SELECT category, COUNT(DISTINCT m.id) as count
       FROM materials m
       WHERE (m.is_common = TRUE OR EXISTS (SELECT 1 FROM material_departments md WHERE md.material_id = m.id AND md.department_id = $1))
         AND m.status = 'approved'
       GROUP BY category`,
      [department.id]
    );

    res.json({
      department,
      subjects: subjects.rows,
      materialCounts: counts.rows,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Get subjects by department
router.get('/:id/subjects', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM subjects WHERE department_id = $1 ORDER BY semester, name',
      [req.params.id]
    );
    res.json({ subjects: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Add subject to department (admin)
router.post('/:id/subjects', auth, adminOnly, async (req, res) => {
  try {
    const { name, semester } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const result = await db.query(
      'INSERT INTO subjects (name, slug, department_id, semester) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, slug, req.params.id, semester || null]
    );

    res.status(201).json({ subject: result.rows[0] });
  } catch (error) {
    if (error.constraint) {
      return res.status(400).json({ error: 'Subject already exists in this department' });
    }
    res.status(500).json({ error: 'Failed to add subject' });
  }
});

module.exports = router;
