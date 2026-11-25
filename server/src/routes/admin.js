const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All admin routes require auth + admin role
router.use(auth, adminOnly);

// ═══════════════════════════════════════════════════════════
// 1. DASHBOARD & ANALYTICS
// ═══════════════════════════════════════════════════════════

router.get('/analytics', async (req, res) => {
  try {
    const totalUsers = await db.query('SELECT COUNT(*) FROM users');
    const totalDepartments = await db.query('SELECT COUNT(*) FROM departments');
    const totalUploads = await db.query('SELECT COUNT(*) FROM materials');
    const pendingUploads = await db.query("SELECT COUNT(*) FROM materials WHERE status = 'pending'");
    const approvedUploads = await db.query("SELECT COUNT(*) FROM materials WHERE status = 'approved'");
    const rejectedUploads = await db.query("SELECT COUNT(*) FROM materials WHERE status = 'rejected'");
    const flaggedUploads = await db.query("SELECT COUNT(*) FROM materials WHERE scan_status = 'flagged'");
    const bannedUsers = await db.query('SELECT COUNT(*) FROM users WHERE is_banned = TRUE');

    const mostActiveDept = await db.query(`
      SELECT d.name, d.slug, COUNT(m.id) as upload_count
      FROM departments d LEFT JOIN materials m ON d.id = m.department_id
      GROUP BY d.id, d.name, d.slug ORDER BY upload_count DESC LIMIT 1
    `);

    const topContributors = await db.query(`
      SELECT u.id, u.name, u.email, u.department, u.badge, COUNT(m.id) as upload_count
      FROM users u LEFT JOIN materials m ON u.id = m.uploaded_by AND m.status = 'approved'
      GROUP BY u.id, u.name, u.email, u.department, u.badge
      HAVING COUNT(m.id) > 0 ORDER BY upload_count DESC LIMIT 5
    `);

    const deptUploads = await db.query(`
      SELECT d.name, d.slug, COUNT(m.id) as upload_count
      FROM departments d LEFT JOIN materials m ON d.id = m.department_id
      GROUP BY d.id, d.name, d.slug ORDER BY upload_count DESC
    `);

    const categoryUploads = await db.query(`
      SELECT category, COUNT(*) as count FROM materials GROUP BY category ORDER BY count DESC
    `);

    const yearUploads = await db.query(`
      SELECT COALESCE(year, 'Unknown') as year, COUNT(*) as count FROM materials GROUP BY year ORDER BY year
    `);

    const recentUploads = await db.query(`
      SELECT m.*, u.name as uploader_name, u.email as uploader_email, d.name as department_name
      FROM materials m LEFT JOIN users u ON m.uploaded_by = u.id
      LEFT JOIN departments d ON m.department_id = d.id
      ORDER BY m.created_at DESC LIMIT 10
    `);

    const dailyUploads = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count FROM materials
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);

    const monthlyRegistrations = await db.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count FROM users
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month
    `);

    const topDownloads = await db.query(`
      SELECT m.id, m.title, m.download_count, m.view_count, d.name as department_name
      FROM materials m LEFT JOIN departments d ON m.department_id = d.id
      WHERE m.status = 'approved' ORDER BY m.download_count DESC LIMIT 5
    `);

    // AI Analytics
    let aiProcessed = { rows: [{ count: '0' }] };
    let aiDuplicates = { rows: [{ count: '0' }] };
    let aiSimilar = { rows: [{ count: '0' }] };
    let avgQualityScore = { rows: [{ avg: null }] };
    try {
      aiProcessed = await db.query("SELECT COUNT(*) FROM materials WHERE ai_processed = TRUE");
      aiDuplicates = await db.query("SELECT COUNT(*) FROM materials WHERE duplicate_status = 'duplicate'");
      aiSimilar = await db.query("SELECT COUNT(*) FROM materials WHERE duplicate_status = 'similar'");
      avgQualityScore = await db.query("SELECT ROUND(AVG((ai_quality_score->>'overall_score')::numeric), 1) as avg FROM materials WHERE ai_quality_score IS NOT NULL");
    } catch (_) { }

    // Active users (logged in within 30 days)
    let activeUsers = { rows: [{ count: '0' }] };
    try {
      activeUsers = await db.query("SELECT COUNT(*) FROM users WHERE last_login_at >= NOW() - INTERVAL '30 days'");
    } catch (_) { }

    res.json({
      stats: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalDepartments: parseInt(totalDepartments.rows[0].count),
        totalUploads: parseInt(totalUploads.rows[0].count),
        pendingUploads: parseInt(pendingUploads.rows[0].count),
        approvedUploads: parseInt(approvedUploads.rows[0].count),
        rejectedUploads: parseInt(rejectedUploads.rows[0].count),
        flaggedUploads: parseInt(flaggedUploads.rows[0].count),
        bannedUsers: parseInt(bannedUsers.rows[0].count),
        mostActiveDepartment: mostActiveDept.rows[0] || null,
        activeUsers: parseInt(activeUsers.rows[0].count),
        aiProcessed: parseInt(aiProcessed.rows[0].count),
        aiDuplicates: parseInt(aiDuplicates.rows[0].count),
        aiSimilar: parseInt(aiSimilar.rows[0].count),
        avgQualityScore: parseFloat(avgQualityScore.rows[0].avg) || 0,
      },
      topContributors: topContributors.rows,
      departmentUploads: deptUploads.rows,
      categoryUploads: categoryUploads.rows,
      yearUploads: yearUploads.rows,
      recentUploads: recentUploads.rows,
      dailyUploads: dailyUploads.rows,
      monthlyRegistrations: monthlyRegistrations.rows,
      topDownloads: topDownloads.rows,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ═══════════════════════════════════════════════════════════
// 2. MATERIAL MANAGEMENT
// ═══════════════════════════════════════════════════════════

router.get('/materials', async (req, res) => {
  try {
    const { status, scan_status, department_id, category, year, search, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT m.*, d.name as department_name, s.name as subject_name,
             u.name as uploader_name, u.email as uploader_email, u.department as uploader_department
      FROM materials m LEFT JOIN departments d ON m.department_id = d.id
      LEFT JOIN subjects s ON m.subject_id = s.id
      LEFT JOIN users u ON m.uploaded_by = u.id WHERE 1=1
    `;
    const params = []; let pi = 1;
    if (status) { query += ` AND m.status = $${pi++}`; params.push(status); }
    if (scan_status) { query += ` AND m.scan_status = $${pi++}`; params.push(scan_status); }
    if (department_id) {
      query += ` AND (m.is_common = TRUE OR EXISTS (SELECT 1 FROM material_departments md WHERE md.material_id = m.id AND md.department_id = $${pi++}))`;
      params.push(department_id);
    }
    if (category) { query += ` AND m.category = $${pi++}`; params.push(category); }
    if (year) { query += ` AND m.year = $${pi++}`; params.push(year); }
    if (search) { query += ` AND (m.title ILIKE $${pi} OR m.description ILIKE $${pi} OR m.course_code ILIKE $${pi})`; params.push(`%${search}%`); pi++; }
    query += ' ORDER BY m.created_at DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${pi++} OFFSET $${pi++}`; params.push(parseInt(limit), offset);
    const result = await db.query(query, params);

    // Attach departments array to each material
    for (const mat of result.rows) {
      const depts = await db.query(
        `SELECT d.id, d.name, d.slug FROM material_departments md JOIN departments d ON md.department_id = d.id WHERE md.material_id = $1 ORDER BY d.name`,
        [mat.id]
      );
      mat.departments = depts.rows;
    }

    let cq = 'SELECT COUNT(*) FROM materials m WHERE 1=1';
    const cp = []; let ci = 1;
    if (status) { cq += ` AND m.status = $${ci++}`; cp.push(status); }
    if (scan_status) { cq += ` AND m.scan_status = $${ci++}`; cp.push(scan_status); }
    if (department_id) {
      cq += ` AND (m.is_common = TRUE OR EXISTS (SELECT 1 FROM material_departments md WHERE md.material_id = m.id AND md.department_id = $${ci++}))`;
      cp.push(department_id);
    }
    if (category) { cq += ` AND m.category = $${ci++}`; cp.push(category); }
    if (year) { cq += ` AND m.year = $${ci++}`; cp.push(year); }
    if (search) { cq += ` AND (m.title ILIKE $${ci} OR m.description ILIKE $${ci} OR m.course_code ILIKE $${ci})`; cp.push(`%${search}%`); ci++; }
    const countResult = await db.query(cq, cp);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      materials: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.put('/materials/:id/approve', async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE materials SET status = 'approved', scan_status = CASE WHEN scan_status = 'flagged' THEN 'clean' ELSE scan_status END, updated_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    const material = result.rows[0];
    if (material.uploaded_by) {
      await db.query(`INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
        [material.uploaded_by, 'Upload Approved', `Your upload "${material.title}" has been approved!`, 'success', `/materials/${material.id}`]);
    }
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'approve_material', 'material', material.id, JSON.stringify({ title: material.title })]);
    res.json({ message: 'Material approved', material });
  } catch (error) { res.status(500).json({ error: 'Failed to approve material' }); }
});

router.put('/materials/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await db.query(
      "UPDATE materials SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [reason || 'Content does not meet guidelines', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    const material = result.rows[0];
    if (material.uploaded_by) {
      await db.query(`INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
        [material.uploaded_by, 'Upload Rejected', `Your upload "${material.title}" was rejected. Reason: ${reason || 'Content does not meet guidelines'}`, 'error']);
    }
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'reject_material', 'material', material.id, JSON.stringify({ title: material.title, reason })]);
    res.json({ message: 'Material rejected', material });
  } catch (error) { res.status(500).json({ error: 'Failed to reject material' }); }
});

router.put('/materials/:id/edit', async (req, res) => {
  try {
    const { title, description, course_code, category, year } = req.body;
    const result = await db.query(
      `UPDATE materials SET title = COALESCE(NULLIF($1, ''), title), description = COALESCE($2, description),
       course_code = COALESCE($3, course_code), category = COALESCE(NULLIF($4, ''), category),
       year = COALESCE($5, year), updated_at = NOW() WHERE id = $6 RETURNING *`,
      [title, description, course_code, category, year, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    res.json({ message: 'Material updated', material: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to update material' }); }
});

router.delete('/materials/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    const material = result.rows[0];
    await db.query('DELETE FROM materials WHERE id = $1', [req.params.id]);
    const fs = require('fs'); const path = require('path');
    const filePath = path.join(__dirname, '../..', material.file_url || '');
    if (material.file_url && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'delete_material', 'material', material.id, JSON.stringify({ title: material.title })]);
    if (material.uploaded_by) {
      await db.query(`INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
        [material.uploaded_by, 'Upload Deleted', `Your upload "${material.title}" was removed by an admin.`, 'error']);
    }
    res.json({ message: 'Material deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete material' }); }
});

// ═══════════════════════════════════════════════════════════
// 3. SCANNER MONITORING
// ═══════════════════════════════════════════════════════════

router.get('/scanner/flagged', async (req, res) => {
  try {
    const { page = 1, limit = 20, id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `
      SELECT m.*, d.name as department_name, u.name as uploader_name, u.email as uploader_email
      FROM materials m LEFT JOIN departments d ON m.department_id = d.id
      LEFT JOIN users u ON m.uploaded_by = u.id
      WHERE (m.scan_status IN ('flagged', 'needs_review')
    `;
    const params = [parseInt(limit), offset];
    if (id) {
      query += ` OR m.id = $3)`;
      params.push(id);
    } else {
      query += `)`;
    }
    query += ` ORDER BY m.created_at DESC LIMIT $1 OFFSET $2`;
    const result = await db.query(query, params);
    const countResult = await db.query("SELECT COUNT(*) FROM materials WHERE scan_status IN ('flagged', 'needs_review')");
    res.json({
      materials: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].count), pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)) },
    });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch flagged materials' }); }
});

router.get('/scanner/logs', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await db.query(
      `SELECT m.id, m.title, m.file_name, m.scan_status, m.scan_details, m.status, m.created_at,
              u.name as uploader_name, d.name as department_name
       FROM materials m LEFT JOIN users u ON m.uploaded_by = u.id
       LEFT JOIN departments d ON m.department_id = d.id
       WHERE m.scan_status IS NOT NULL AND m.scan_status != 'pending'
       ORDER BY m.created_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), offset]);
    const countResult = await db.query("SELECT COUNT(*) FROM materials WHERE scan_status IS NOT NULL AND scan_status != 'pending'");
    res.json({
      logs: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].count), pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)) },
    });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch scanner logs' }); }
});

router.put('/scanner/:id/override', async (req, res) => {
  try {
    const { action } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const scanStatus = action === 'approve' ? 'clean' : 'flagged';
    const result = await db.query(`UPDATE materials SET status = $1, scan_status = $2, updated_at = NOW() WHERE id = $3 RETURNING *`, [status, scanStatus, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'scanner_override', 'material', req.params.id, JSON.stringify({ action })]);
    res.json({ message: `Scanner decision overridden: ${action}d`, material: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to override scanner decision' }); }
});

// ═══════════════════════════════════════════════════════════
// 4. USER MANAGEMENT
// ═══════════════════════════════════════════════════════════

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, department, status } = req.query;
    let query = `
      SELECT id, name, email, role, department, year, is_verified, is_banned, badge, last_login_at, created_at,
             (SELECT COUNT(*) FROM materials WHERE uploaded_by = users.id) as upload_count
      FROM users WHERE 1=1
    `;
    const params = []; let pi = 1;
    if (search) { query += ` AND (name ILIKE $${pi} OR email ILIKE $${pi})`; params.push(`%${search}%`); pi++; }
    if (department) { query += ` AND department = $${pi++}`; params.push(department); }
    if (status === 'banned') query += ' AND is_banned = TRUE';
    else if (status === 'unverified') query += ' AND is_verified = FALSE';
    else if (status === 'active') query += ' AND is_banned = FALSE AND is_verified = TRUE';
    query += ' ORDER BY created_at DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${pi++} OFFSET $${pi++}`; params.push(parseInt(limit), offset);
    const result = await db.query(query, params);

    let cq = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const cp = []; let ci = 1;
    if (search) { cq += ` AND (name ILIKE $${ci} OR email ILIKE $${ci})`; cp.push(`%${search}%`); ci++; }
    if (department) { cq += ` AND department = $${ci++}`; cp.push(department); }
    if (status === 'banned') cq += ' AND is_banned = TRUE';
    else if (status === 'unverified') cq += ' AND is_verified = FALSE';
    else if (status === 'active') cq += ' AND is_banned = FALSE AND is_verified = TRUE';
    const countResult = await db.query(cq, cp);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

router.put('/users/:id/ban', async (req, res) => {
  try {
    const result = await db.query('UPDATE users SET is_banned = TRUE WHERE id = $1 AND role != $2 RETURNING id, name, email, is_banned', [req.params.id, 'admin']);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found or is admin' });
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'ban_user', 'user', req.params.id, JSON.stringify({ name: result.rows[0].name })]);
    res.json({ message: 'User banned', user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to ban user' }); }
});

router.put('/users/:id/unban', async (req, res) => {
  try {
    const result = await db.query('UPDATE users SET is_banned = FALSE WHERE id = $1 RETURNING id, name, email, is_banned', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'unban_user', 'user', req.params.id, JSON.stringify({ name: result.rows[0].name })]);
    res.json({ message: 'User unbanned', user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to unban user' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const check = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (check.rows[0].role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' });
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'delete_user', 'user', req.params.id, JSON.stringify({ name: check.rows[0].name, email: check.rows[0].email })]);
    res.json({ message: 'User deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete user' }); }
});

router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const tempPassword = 'Spot4Notes@' + Math.random().toString(36).slice(-6);
    const hashed = await bcrypt.hash(tempPassword, 12);
    const result = await db.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email', [hashed, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'reset_password', 'user', req.params.id, JSON.stringify({ name: result.rows[0].name })]);
    res.json({ message: 'Password reset', tempPassword, user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to reset password' }); }
});

router.put('/users/:id/badge', async (req, res) => {
  try {
    const { badge } = req.body;
    const result = await db.query('UPDATE users SET badge = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, badge', [badge || null, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: badge ? 'Badge assigned' : 'Badge removed', user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to update badge' }); }
});

// ═══════════════════════════════════════════════════════════
// 5. DEPARTMENT & COURSE MANAGEMENT
// ═══════════════════════════════════════════════════════════

router.post('/departments', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required' });
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const result = await db.query('INSERT INTO departments (name, slug, description, icon) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), slug, description || '', icon || '📚']);
    await db.query(`INSERT INTO activity_logs (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'create_department', 'department', result.rows[0].id, JSON.stringify({ name })]);
    res.status(201).json({ message: 'Department created', department: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Department already exists' });
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const result = await db.query(
      `UPDATE departments SET name = COALESCE(NULLIF($1, ''), name), description = COALESCE($2, description), icon = COALESCE(NULLIF($3, ''), icon) WHERE id = $4 RETURNING *`,
      [name, description, icon, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department updated', department: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to update department' }); }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const check = await db.query('SELECT id, name FROM departments WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    const matCount = await db.query('SELECT COUNT(DISTINCT md.material_id) FROM material_departments md WHERE md.department_id = $1', [req.params.id]);
    if (parseInt(matCount.rows[0].count) > 0) return res.status(400).json({ error: `Cannot delete — department has ${matCount.rows[0].count} materials` });
    await db.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete department' }); }
});

router.get('/subjects', async (req, res) => {
  try {
    const { department_id } = req.query;
    let query = `SELECT s.*, d.name as department_name FROM subjects s LEFT JOIN departments d ON s.department_id = d.id WHERE 1=1`;
    const params = [];
    if (department_id) { query += ' AND s.department_id = $1'; params.push(department_id); }
    query += ' ORDER BY d.name, s.name';
    const result = await db.query(query, params);
    res.json({ subjects: result.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch subjects' }); }
});

router.post('/subjects', async (req, res) => {
  try {
    const { name, department_id, semester } = req.body;
    if (!name || !department_id) return res.status(400).json({ error: 'Name and department are required' });
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = await db.query('INSERT INTO subjects (name, slug, department_id, semester) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), slug, department_id, semester || null]);
    res.status(201).json({ message: 'Subject added', subject: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Subject already exists in this department' });
    res.status(500).json({ error: 'Failed to add subject' });
  }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete subject' }); }
});

// ═══════════════════════════════════════════════════════════
// 6. REPORTS & CSV EXPORT
// ═══════════════════════════════════════════════════════════

router.get('/reports/uploads', async (req, res) => {
  try {
    const { format, department_id, date_from, date_to } = req.query;
    let query = `
      SELECT m.title, m.category, m.status, m.scan_status, m.download_count, m.view_count,
             m.file_name, m.file_size, m.course_code, m.year,
             d.name as department, s.name as subject, u.name as uploader, u.email as uploader_email, m.created_at
      FROM materials m LEFT JOIN departments d ON m.department_id = d.id
      LEFT JOIN subjects s ON m.subject_id = s.id LEFT JOIN users u ON m.uploaded_by = u.id WHERE 1=1
    `;
    const params = []; let pi = 1;
    if (department_id) { query += ` AND m.department_id = $${pi++}`; params.push(department_id); }
    if (date_from) { query += ` AND m.created_at >= $${pi++}`; params.push(date_from); }
    if (date_to) { query += ` AND m.created_at <= $${pi++}`; params.push(date_to); }
    query += ' ORDER BY m.created_at DESC';
    const result = await db.query(query, params);

    if (format === 'csv') {
      const header = 'Title,Category,Status,Scan Status,Downloads,Views,Department,Subject,Uploader,Email,Course Code,Year,Date\n';
      const rows = result.rows.map(r =>
        `"${r.title}","${r.category}","${r.status}","${r.scan_status}",${r.download_count},${r.view_count},"${r.department || ''}","${r.subject || ''}","${r.uploader || ''}","${r.uploader_email || ''}","${r.course_code || ''}","${r.year || ''}","${new Date(r.created_at).toISOString()}"`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=uploads-report.csv');
      return res.send(header + rows);
    }
    res.json({ report: result.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to generate report' }); }
});

router.get('/reports/growth', async (req, res) => {
  try {
    const weeklyUploads = await db.query(`
      SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as count FROM materials
      WHERE created_at >= NOW() - INTERVAL '3 months' GROUP BY DATE_TRUNC('week', created_at) ORDER BY week
    `);
    const weeklyUsers = await db.query(`
      SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as count FROM users
      WHERE created_at >= NOW() - INTERVAL '3 months' GROUP BY DATE_TRUNC('week', created_at) ORDER BY week
    `);
    const totalDownloads = await db.query('SELECT SUM(download_count) as total FROM materials');
    const totalViews = await db.query('SELECT SUM(view_count) as total FROM materials');
    res.json({
      weeklyUploads: weeklyUploads.rows, weeklyUsers: weeklyUsers.rows,
      totalDownloads: parseInt(totalDownloads.rows[0].total) || 0,
      totalViews: parseInt(totalViews.rows[0].total) || 0,
    });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch growth stats' }); }
});

// ═══════════════════════════════════════════════════════════
// 7. CONTENT CONTROL
// ═══════════════════════════════════════════════════════════

router.get('/content/duplicates', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT m1.id, m1.title, m1.file_name, m1.file_size, m1.department_id, m1.created_at,
             d.name as department_name, u.name as uploader_name,
             (SELECT COUNT(*) FROM materials m2 WHERE m2.file_name = m1.file_name AND m2.file_size = m1.file_size AND m2.id != m1.id) as duplicate_count
      FROM materials m1 LEFT JOIN departments d ON m1.department_id = d.id LEFT JOIN users u ON m1.uploaded_by = u.id
      WHERE EXISTS (SELECT 1 FROM materials m2 WHERE m2.file_name = m1.file_name AND m2.file_size = m1.file_size AND m2.id != m1.id)
      ORDER BY m1.file_name, m1.created_at
    `);
    res.json({ duplicates: result.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to find duplicates' }); }
});

router.put('/content/:id/toggle-downloads', async (req, res) => {
  try {
    const result = await db.query('UPDATE materials SET downloads_disabled = NOT downloads_disabled, updated_at = NOW() WHERE id = $1 RETURNING id, title, downloads_disabled', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    res.json({ message: result.rows[0].downloads_disabled ? 'Downloads disabled' : 'Downloads enabled', material: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to toggle downloads' }); }
});

router.put('/content/:id/toggle-lock', async (req, res) => {
  try {
    const result = await db.query('UPDATE materials SET is_locked = NOT is_locked, updated_at = NOW() WHERE id = $1 RETURNING id, title, is_locked', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    res.json({ message: result.rows[0].is_locked ? 'Material locked' : 'Material unlocked', material: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to toggle lock' }); }
});

router.post('/content/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    const result = await db.query('DELETE FROM materials WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} materials deleted` });
  } catch (error) { res.status(500).json({ error: 'Failed to bulk delete' }); }
});

// ═══════════════════════════════════════════════════════════
// 8. AI STUDY ASSISTANT MONITORING
// ═══════════════════════════════════════════════════════════

router.get('/chatbot/stats', async (req, res) => {
  try {
    const totalSessions = await db.query('SELECT COUNT(DISTINCT session_id) as count FROM chat_messages');
    const totalMessages = await db.query('SELECT COUNT(*) as count FROM chat_messages');
    const uniqueUsers = await db.query('SELECT COUNT(DISTINCT user_id) as count FROM chat_messages');
    const dailyUsage = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count FROM chat_messages
      WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date
    `);
    const topDepartments = await db.query(`
      SELECT department, COUNT(*) as count FROM chat_messages
      WHERE department IS NOT NULL AND department != '' GROUP BY department ORDER BY count DESC LIMIT 10
    `);
    const recentQuestions = await db.query(`
      SELECT DISTINCT ON (session_id) content, department, subject, created_at FROM chat_messages
      WHERE role = 'user' ORDER BY session_id, created_at ASC LIMIT 20
    `);
    res.json({
      stats: {
        totalSessions: parseInt(totalSessions.rows[0].count),
        totalMessages: parseInt(totalMessages.rows[0].count),
        uniqueUsers: parseInt(uniqueUsers.rows[0].count),
      },
      dailyUsage: dailyUsage.rows,
      topDepartments: topDepartments.rows,
      recentQuestions: recentQuestions.rows,
    });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch chatbot stats' }); }
});

// ═══════════════════════════════════════════════════════════
// 9. NOTIFICATIONS / ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════

router.get('/notifications', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json({ notifications: result.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, message, department_id, type } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });
    const ann = await db.query('INSERT INTO announcements (title, message, type, department_id, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, message, type || 'general', department_id || null, req.user.id]);
    let userQuery = 'SELECT id FROM users WHERE is_banned = FALSE';
    const userParams = [];
    if (department_id) {
      const deptResult = await db.query('SELECT name FROM departments WHERE id = $1', [department_id]);
      if (deptResult.rows.length > 0) { userQuery += ' AND department = $1'; userParams.push(deptResult.rows[0].name); }
    }
    const users = await db.query(userQuery, userParams);
    for (const u of users.rows) {
      await db.query(`INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`, [u.id, title, message, 'announcement']);
    }
    res.status(201).json({ message: `Announcement sent to ${users.rows.length} users`, announcement: ann.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to send announcement' }); }
});

router.get('/announcements', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, d.name as department_name, u.name as created_by_name
      FROM announcements a LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC
    `);
    res.json({ announcements: result.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch announcements' }); }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Announcement deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete announcement' }); }
});

// ═══════════════════════════════════════════════════════════
// 10. SECURITY CONTROLS
// ═══════════════════════════════════════════════════════════

router.get('/security/logs', async (req, res) => {
  try {
    const { page = 1, limit = 30, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `SELECT al.*, u.name as user_name, u.email as user_email FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const params = []; let pi = 1;
    if (action) { query += ` AND al.action = $${pi++}`; params.push(action); }
    query += ' ORDER BY al.created_at DESC';
    query += ` LIMIT $${pi++} OFFSET $${pi++}`; params.push(parseInt(limit), offset);
    const result = await db.query(query, params);

    let cq = 'SELECT COUNT(*) FROM activity_logs WHERE 1=1';
    const cp = []; let ci = 1;
    if (action) { cq += ` AND action = $${ci++}`; cp.push(action); }
    const countResult = await db.query(cq, cp);
    res.json({
      logs: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].count), pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)) },
    });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch activity logs' }); }
});

router.get('/security/upload-history', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await db.query(
      `SELECT m.id, m.title, m.file_name, m.file_size, m.status, m.scan_status, m.created_at,
              u.name as uploader_name, u.email as uploader_email, d.name as department_name
       FROM materials m LEFT JOIN users u ON m.uploaded_by = u.id LEFT JOIN departments d ON m.department_id = d.id
       ORDER BY m.created_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), offset]);
    const countResult = await db.query('SELECT COUNT(*) FROM materials');
    res.json({
      history: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].count), pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)) },
    });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch upload history' }); }
});

router.get('/security/db-stats', async (req, res) => {
  try {
    const tables = await db.query(`
      SELECT relname as table_name, n_tup_ins as inserts, n_tup_upd as updates, n_tup_del as deletes, n_live_tup as live_rows
      FROM pg_stat_user_tables ORDER BY n_live_tup DESC
    `);
    const dbSize = await db.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
    res.json({ tables: tables.rows, databaseSize: dbSize.rows[0].size });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch database stats' }); }
});

module.exports = router;
