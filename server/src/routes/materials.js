const express = require('express');
const path = require('path');
const db = require('../db');
const { auth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const scanner = require('../services/scanner');

const router = express.Router();

// UUID validation helper
const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Upload material
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title, description, category, department_id, department_ids, is_common, subject_id, subject, tags, course_code, course_title, year, semester } = req.body;

    // Parse department_ids: accept comma-separated string or array
    let deptIds = [];
    const commonFlag = is_common === 'true' || is_common === true;

    if (commonFlag) {
      // "Common for All Departments" — no specific department required
      deptIds = [];
    } else if (department_ids) {
      deptIds = typeof department_ids === 'string' ? department_ids.split(',').map(d => d.trim()).filter(Boolean) : department_ids;
    } else if (department_id) {
      deptIds = [department_id];
    }

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }
    if (!commonFlag && deptIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one department or mark as common' });
    }

    const validCategories = ['notes', 'question_papers', 'ppt', 'important_questions', 'study_materials'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags;
    }

    // Primary department_id for backward compat (first selected or null if common)
    const primaryDeptId = deptIds.length > 0 ? deptIds[0] : null;

    // Resolve subject
    let resolvedSubjectId = subject_id || null;
    let subjectName = subject || '';

    if (!resolvedSubjectId && subjectName && primaryDeptId) {
      const slug = subjectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const upsertResult = await db.query(
        `INSERT INTO subjects (name, slug, department_id) VALUES ($1, $2, $3)
         ON CONFLICT (name, department_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [subjectName.trim(), slug, primaryDeptId]
      );
      resolvedSubjectId = upsertResult.rows[0].id;
    }

    const result = await db.query(
      `INSERT INTO materials (title, description, file_url, file_name, file_type, file_size, category, department_id, subject_id, uploaded_by, tags, course_code, course_title, year, semester, is_common, status, scan_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', 'pending')
       RETURNING *`,
      [
        title, description || '', `/uploads/${req.file.filename}`, req.file.originalname,
        req.file.mimetype, req.file.size, category, primaryDeptId, resolvedSubjectId,
        req.user.id, parsedTags, course_code || null, course_title || null, year || null,
        semester ? parseInt(semester) : null, commonFlag,
      ]
    );

    const material = result.rows[0];

    // Insert into material_departments junction table
    if (commonFlag) {
      // For common materials, link to ALL departments
      const allDepts = await db.query('SELECT id FROM departments');
      for (const dept of allDepts.rows) {
        await db.query(
          'INSERT INTO material_departments (material_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [material.id, dept.id]
        );
      }
    } else {
      for (const dId of deptIds) {
        await db.query(
          'INSERT INTO material_departments (material_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [material.id, dId]
        );
      }
    }

    // Run content scan async
    const filePath = path.join(__dirname, '../../uploads', req.file.filename);
    scanner.scanFile(material.id, filePath, req.file.mimetype).then(scanResult => {
      console.log(`Scan completed for ${material.id}:`, scanResult);
    }).catch(err => {
      console.error(`Scan error for ${material.id}:`, err);
    });

    res.status(201).json({
      message: 'File uploaded successfully! It will be reviewed shortly.',
      material,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get materials (with filtering and search)
router.get('/', async (req, res) => {
  try {
    const {
      department_id, subject_id, category, search, tags, course_code,
      semester, year, status = 'approved', sort = 'newest', page = 1, limit = 20,
    } = req.query;

    let query = `
      SELECT DISTINCT m.*, d.name as department_name, d.slug as department_slug,
             s.name as subject_name, u.name as uploader_name,
             COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM ratings WHERE material_id = m.id), 0) as avg_rating,
             COALESCE((SELECT COUNT(*) FROM ratings WHERE material_id = m.id), 0) as rating_count,
             COALESCE((SELECT COUNT(*) FROM likes WHERE material_id = m.id), 0) as like_count
      FROM materials m
      LEFT JOIN departments d ON m.department_id = d.id
      LEFT JOIN subjects s ON m.subject_id = s.id
      LEFT JOIN users u ON m.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let pi = 1;

    if (status) { query += ` AND m.status = $${pi++}`; params.push(status); }
    if (department_id) {
      query += ` AND (m.is_common = TRUE OR EXISTS (SELECT 1 FROM material_departments md WHERE md.material_id = m.id AND md.department_id = $${pi++}))`;
      params.push(department_id);
    }
    if (subject_id) { query += ` AND m.subject_id = $${pi++}`; params.push(subject_id); }
    if (category) { query += ` AND m.category = $${pi++}`; params.push(category); }
    if (course_code) { query += ` AND m.course_code ILIKE $${pi++}`; params.push(`%${course_code}%`); }
    if (semester) { query += ` AND m.semester = $${pi++}`; params.push(parseInt(semester)); }
    if (year) { query += ` AND m.year = $${pi++}`; params.push(year); }
    if (search) {
      query += ` AND (m.title ILIKE $${pi} OR m.description ILIKE $${pi} OR m.course_code ILIKE $${pi} OR m.course_title ILIKE $${pi})`;
      params.push(`%${search}%`);
      pi++;
    }
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query += ` AND m.tags && $${pi++}`;
      params.push(tagArray);
    }

    switch (sort) {
      case 'oldest': query += ' ORDER BY m.created_at ASC'; break;
      case 'popular': query += ' ORDER BY m.download_count DESC'; break;
      case 'views': query += ' ORDER BY m.view_count DESC'; break;
      case 'rating': query += ' ORDER BY avg_rating DESC NULLS LAST'; break;
      default: query += ' ORDER BY m.created_at DESC';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${pi++} OFFSET $${pi++}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    // Fetch all department names for each material via junction table
    for (const mat of result.rows) {
      const depts = await db.query(
        `SELECT d.id, d.name, d.slug FROM material_departments md JOIN departments d ON md.department_id = d.id WHERE md.material_id = $1 ORDER BY d.name`,
        [mat.id]
      );
      mat.departments = depts.rows;
    }

    // Count query
    let cq = 'SELECT COUNT(DISTINCT m.id) FROM materials m WHERE 1=1';
    const cp = []; let ci = 1;
    if (status) { cq += ` AND m.status = $${ci++}`; cp.push(status); }
    if (department_id) {
      cq += ` AND (m.is_common = TRUE OR EXISTS (SELECT 1 FROM material_departments md WHERE md.material_id = m.id AND md.department_id = $${ci++}))`;
      cp.push(department_id);
    }
    if (subject_id) { cq += ` AND m.subject_id = $${ci++}`; cp.push(subject_id); }
    if (category) { cq += ` AND m.category = $${ci++}`; cp.push(category); }
    if (course_code) { cq += ` AND m.course_code ILIKE $${ci++}`; cp.push(`%${course_code}%`); }
    if (semester) { cq += ` AND m.semester = $${ci++}`; cp.push(parseInt(semester)); }
    if (year) { cq += ` AND m.year = $${ci++}`; cp.push(year); }
    if (search) {
      cq += ` AND (m.title ILIKE $${ci} OR m.description ILIKE $${ci} OR m.course_code ILIKE $${ci} OR m.course_title ILIKE $${ci})`;
      cp.push(`%${search}%`); ci++;
    }
    if (tags) { const ta = tags.split(',').map(t => t.trim()); cq += ` AND m.tags && $${ci++}`; cp.push(ta); }

    const countResult = await db.query(cq, cp);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      materials: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Get single material (with bookmark/rating status if authed)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });

    const result = await db.query(
      `SELECT m.*, d.name as department_name, d.slug as department_slug,
              s.name as subject_name, u.name as uploader_name,
              COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM ratings WHERE material_id = m.id), 0) as avg_rating,
              COALESCE((SELECT COUNT(*) FROM ratings WHERE material_id = m.id), 0) as rating_count,
              COALESCE((SELECT COUNT(*) FROM likes WHERE material_id = m.id), 0) as like_count
       FROM materials m
       LEFT JOIN departments d ON m.department_id = d.id
       LEFT JOIN subjects s ON m.subject_id = s.id
       LEFT JOIN users u ON m.uploaded_by = u.id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

    // Increment view
    const updated = await db.query(
      'UPDATE materials SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count',
      [req.params.id]
    );

    const material = { ...result.rows[0], view_count: updated.rows[0].view_count };

    // Fetch all departments for this material
    const depts = await db.query(
      `SELECT d.id, d.name, d.slug FROM material_departments md JOIN departments d ON md.department_id = d.id WHERE md.material_id = $1 ORDER BY d.name`,
      [req.params.id]
    );
    material.departments = depts.rows;

    // Check if user bookmarked/rated
    if (req.user) {
      const bookmark = await db.query(
        'SELECT id FROM bookmarks WHERE user_id = $1 AND material_id = $2',
        [req.user.id, req.params.id]
      );
      material.is_bookmarked = bookmark.rows.length > 0;

      const rating = await db.query(
        'SELECT rating FROM ratings WHERE user_id = $1 AND material_id = $2',
        [req.user.id, req.params.id]
      );
      material.user_rating = rating.rows.length > 0 ? rating.rows[0].rating : null;

      const like = await db.query(
        'SELECT id FROM likes WHERE user_id = $1 AND material_id = $2',
        [req.user.id, req.params.id]
      );
      material.is_liked = like.rows.length > 0;
    }

    res.json({ material });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// Download material
router.post('/:id/download', auth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });
    const result = await db.query(
      'UPDATE materials SET download_count = download_count + 1 WHERE id = $1 AND downloads_disabled = FALSE RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found or downloads disabled' });

    // Track activity
    await db.query(
      `INSERT INTO study_streaks (user_id, active_date) VALUES ($1, CURRENT_DATE)
       ON CONFLICT (user_id, active_date) DO UPDATE SET actions = study_streaks.actions + 1`,
      [req.user.id]
    ).catch(() => {});

    res.json({ message: 'Download count updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update download count' });
  }
});

// Bookmark / Unbookmark
router.post('/:id/bookmark', auth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

    const existing = await db.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND material_id = $2',
      [req.user.id, req.params.id]
    );

    if (existing.rows.length > 0) {
      await db.query('DELETE FROM bookmarks WHERE user_id = $1 AND material_id = $2',
        [req.user.id, req.params.id]);
      return res.json({ bookmarked: false, message: 'Bookmark removed' });
    }

    await db.query('INSERT INTO bookmarks (user_id, material_id) VALUES ($1, $2)',
      [req.user.id, req.params.id]);
    res.json({ bookmarked: true, message: 'Material bookmarked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// Rate material (1-5)
router.post('/:id/rate', auth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    await db.query(
      `INSERT INTO ratings (user_id, material_id, rating) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, material_id) DO UPDATE SET rating = $3, updated_at = NOW()`,
      [req.user.id, req.params.id, rating]
    );

    const avgResult = await db.query(
      'SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as count FROM ratings WHERE material_id = $1',
      [req.params.id]
    );

    res.json({
      message: 'Rating saved',
      avg_rating: parseFloat(avgResult.rows[0].avg_rating),
      rating_count: parseInt(avgResult.rows[0].count),
      user_rating: rating,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rate material' });
  }
});

// Get bookmarked materials (saved notes)
router.get('/user/bookmarks', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*, d.name as department_name, s.name as subject_name, b.created_at as bookmarked_at
       FROM bookmarks b
       JOIN materials m ON b.material_id = m.id
       LEFT JOIN departments d ON m.department_id = d.id
       LEFT JOIN subjects s ON m.subject_id = s.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    // Attach departments array
    for (const mat of result.rows) {
      const depts = await db.query(
        `SELECT d.id, d.name, d.slug FROM material_departments md JOIN departments d ON md.department_id = d.id WHERE md.material_id = $1 ORDER BY d.name`,
        [mat.id]
      );
      mat.departments = depts.rows;
    }
    res.json({ materials: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Get my uploads
router.get('/user/my-uploads', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*, d.name as department_name, s.name as subject_name
       FROM materials m
       LEFT JOIN departments d ON m.department_id = d.id
       LEFT JOIN subjects s ON m.subject_id = s.id
       WHERE m.uploaded_by = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    // Attach departments array
    for (const mat of result.rows) {
      const depts = await db.query(
        `SELECT d.id, d.name, d.slug FROM material_departments md JOIN departments d ON md.department_id = d.id WHERE md.material_id = $1 ORDER BY d.name`,
        [mat.id]
      );
      mat.departments = depts.rows;
    }
    res.json({ materials: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// Edit material metadata (owner only, before approval)
router.put('/:id/edit', auth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

    const check = await db.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

    const material = check.rows[0];
    if (material.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Students can only edit pending materials
    if (req.user.role !== 'admin' && material.status !== 'pending') {
      return res.status(400).json({ error: 'Can only edit materials that are pending approval' });
    }

    const { title, description, category, course_code, course_title, tags, year, semester } = req.body;
    let parsedTags = material.tags;
    if (tags !== undefined) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags;
    }

    const result = await db.query(
      `UPDATE materials SET 
        title = COALESCE(NULLIF($1, ''), title),
        description = COALESCE($2, description),
        category = COALESCE(NULLIF($3, ''), category),
        course_code = COALESCE($4, course_code),
        course_title = COALESCE($5, course_title),
        tags = $6,
        year = COALESCE($7, year),
        semester = COALESCE($8, semester),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [title, description, category, course_code, course_title, parsedTags, year, semester ? parseInt(semester) : null, req.params.id]
    );

    res.json({ message: 'Material updated', material: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// Related materials
router.get('/:id/related', async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

    const material = await db.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);
    if (material.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const mat = material.rows[0];

    // Find related: same department + (same subject OR same category OR similar title)
    const result = await db.query(
      `SELECT m.*, d.name as department_name, s.name as subject_name,
              COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM ratings WHERE material_id = m.id), 0) as avg_rating
       FROM materials m
       LEFT JOIN departments d ON m.department_id = d.id
       LEFT JOIN subjects s ON m.subject_id = s.id
       WHERE m.id != $1 AND m.status = 'approved' AND (
         (m.department_id = $2 AND m.subject_id = $3) OR
         (m.department_id = $2 AND m.category = $4) OR
         (m.course_code IS NOT NULL AND m.course_code = $5)
       )
       ORDER BY 
         CASE WHEN m.subject_id = $3 THEN 0 ELSE 1 END,
         m.download_count DESC
       LIMIT 6`,
      [req.params.id, mat.department_id, mat.subject_id, mat.category, mat.course_code]
    );

    res.json({ materials: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch related materials' });
  }
});

// Delete material (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });
    const result = await db.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

    const material = result.rows[0];
    if (material.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this material' });
    }

    await db.query('DELETE FROM materials WHERE id = $1', [req.params.id]);

    const fs = require('fs');
    const filePath = path.join(__dirname, '../..', material.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// ═══════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════

// Get comments for a material
router.get('/:id/comments', async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });
    const result = await db.query(
      `SELECT c.*, u.name as user_name, u.avatar_url, u.badge
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.material_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );
    res.json({ comments: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add comment
router.post('/:id/comments', auth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content is required' });
    if (content.length > 1000) return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });

    const result = await db.query(
      `INSERT INTO comments (material_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, content.trim()]
    );

    const user = await db.query('SELECT name, avatar_url, badge FROM users WHERE id = $1', [req.user.id]);

    res.status(201).json({
      comment: { ...result.rows[0], user_name: user.rows[0].name, avatar_url: user.rows[0].avatar_url, badge: user.rows[0].badge }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete comment (owner or admin)
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM comments WHERE id = $1', [req.params.commentId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

    if (result.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query('DELETE FROM comments WHERE id = $1', [req.params.commentId]);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ═══════════════════════════════════════════════════════════
// LIKES / UPVOTES
// ═══════════════════════════════════════════════════════════

// Toggle like
router.post('/:id/like', auth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

    const existing = await db.query(
      'SELECT id FROM likes WHERE user_id = $1 AND material_id = $2',
      [req.user.id, req.params.id]
    );

    if (existing.rows.length > 0) {
      await db.query('DELETE FROM likes WHERE user_id = $1 AND material_id = $2', [req.user.id, req.params.id]);
    } else {
      await db.query('INSERT INTO likes (user_id, material_id) VALUES ($1, $2)', [req.user.id, req.params.id]);
    }

    const count = await db.query('SELECT COUNT(*) FROM likes WHERE material_id = $1', [req.params.id]);

    res.json({
      liked: existing.rows.length === 0,
      like_count: parseInt(count.rows[0].count),
      message: existing.rows.length > 0 ? 'Like removed' : 'Material liked'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

module.exports = router;
