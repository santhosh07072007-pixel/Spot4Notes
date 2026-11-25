const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { sendVerificationEmail, sendNotificationEmail } = require('../utils/email');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, department, year, roll_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailDomain = email.split('@')[1];
    const allowedDomain = process.env.COLLEGE_EMAIL_DOMAIN;
    if (allowedDomain && emailDomain !== allowedDomain) {
      return res.status(400).json({ error: `Only ${allowedDomain} email addresses are allowed` });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const autoVerify = process.env.NODE_ENV !== 'production';

    const result = await db.query(
      `INSERT INTO users (name, email, password, department, year, roll_number, verification_token, verification_expires, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, role, department, year, roll_number, is_verified, badge`,
      [name, email, hashedPassword, department, year, roll_number || null, verificationToken, verificationExpires, autoVerify]
    );

    const user = result.rows[0];

    if (!autoVerify) {
      await sendVerificationEmail(email, verificationToken);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      user,
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      'SELECT id, name, email, password, role, department, year, roll_number, is_verified, is_banned, badge, study_streak FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been banned. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Track study streak
    await db.query(
      `INSERT INTO study_streaks (user_id, active_date) VALUES ($1, CURRENT_DATE)
       ON CONFLICT (user_id, active_date) DO UPDATE SET actions = study_streaks.actions + 1`,
      [user.id]
    ).catch(() => {});

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token required' });

    const result = await db.query(
      'SELECT id FROM users WHERE verification_token = $1 AND verification_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await db.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({ message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await db.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (result.rows[0].is_verified) return res.status(400).json({ error: 'Email already verified' });

    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
      [verificationToken, verificationExpires, result.rows[0].id]
    );

    await sendVerificationEmail(email, verificationToken);
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend verification' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, result.rows[0].id]
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 Reset token for ${email}: ${resetToken}`);
      return res.json({ message: 'Password reset link has been sent to your email.', resetToken });
    }

    await sendNotificationEmail(
      email,
      'Reset Your Spot4Notes Password',
      `<h2>Password Reset</h2><p>Hi ${result.rows[0].name},</p>
       <p>Use this token to reset your password:</p>
       <p style="font-size:24px;font-weight:bold;color:#4f46e5;text-align:center;padding:20px;">${resetToken}</p>
       <p>Token expires in 1 hour.</p>`
    );

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const result = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL, updated_at = NOW() WHERE id = $2',
      [hashedPassword, result.rows[0].id]
    );

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password (logged in)
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Min 6 characters' });

    const result = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get current user with stats
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, department, year, roll_number, avatar_url, is_verified, badge, study_streak, last_active_date, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = result.rows[0];

    const uploadStats = await db.query(
      `SELECT COUNT(*) as total_uploads, COUNT(*) FILTER (WHERE status = 'approved') as approved_uploads
       FROM materials WHERE uploaded_by = $1`,
      [req.user.id]
    );

    const downloadStats = await db.query(
      `SELECT COALESCE(SUM(download_count), 0) as total_downloads FROM materials WHERE uploaded_by = $1 AND status = 'approved'`,
      [req.user.id]
    );

    const bookmarkCount = await db.query('SELECT COUNT(*) FROM bookmarks WHERE user_id = $1', [req.user.id]);

    // Track activity
    await db.query(
      `INSERT INTO study_streaks (user_id, active_date) VALUES ($1, CURRENT_DATE)
       ON CONFLICT (user_id, active_date) DO UPDATE SET actions = study_streaks.actions + 1`,
      [req.user.id]
    ).catch(() => {});

    res.json({
      user: {
        ...user,
        total_uploads: parseInt(uploadStats.rows[0].total_uploads),
        approved_uploads: parseInt(uploadStats.rows[0].approved_uploads),
        total_downloads: parseInt(downloadStats.rows[0].total_downloads),
        bookmarks_count: parseInt(bookmarkCount.rows[0].count),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, department, year, roll_number } = req.body;

    if (name !== undefined && name !== null && name.trim() === '') {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    const result = await db.query(
      `UPDATE users SET name = COALESCE(NULLIF($1, ''), name), department = COALESCE($2, department), 
       year = COALESCE($3, year), roll_number = COALESCE($4, roll_number), updated_at = NOW() 
       WHERE id = $5 RETURNING id, name, email, role, department, year, roll_number, avatar_url, is_verified, badge`,
      [name, department, year, roll_number, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Study streak
router.get('/streak', auth, async (req, res) => {
  try {
    const streaks = await db.query(
      `SELECT active_date, actions FROM study_streaks WHERE user_id = $1 
       AND active_date >= CURRENT_DATE - INTERVAL '30 days' ORDER BY active_date DESC`,
      [req.user.id]
    );

    // Current streak
    const streakResult = await db.query(`
      WITH dates AS (
        SELECT DISTINCT active_date FROM study_streaks WHERE user_id = $1 ORDER BY active_date DESC
      ),
      numbered AS (
        SELECT active_date, active_date - (ROW_NUMBER() OVER (ORDER BY active_date DESC))::int AS grp FROM dates
      )
      SELECT COUNT(*) as streak FROM numbered WHERE grp = (SELECT grp FROM numbered LIMIT 1)
    `, [req.user.id]);

    // Longest streak
    const longestResult = await db.query(`
      WITH dates AS (
        SELECT DISTINCT active_date FROM study_streaks WHERE user_id = $1 ORDER BY active_date
      ),
      numbered AS (
        SELECT active_date, active_date - (ROW_NUMBER() OVER (ORDER BY active_date))::int AS grp FROM dates
      ),
      streaks AS (
        SELECT COUNT(*) as streak_len FROM numbered GROUP BY grp
      )
      SELECT COALESCE(MAX(streak_len), 0) as longest FROM streaks
    `, [req.user.id]);

    const currentStreak = parseInt(streakResult.rows[0]?.streak) || 0;
    const longestStreak = parseInt(longestResult.rows[0]?.longest) || 0;

    res.json({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      recent_activity: streaks.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await db.query(`
      SELECT u.id, u.name, u.department, u.year, u.badge, u.avatar_url,
             COUNT(m.id) FILTER (WHERE m.status = 'approved') as upload_count,
             COALESCE(SUM(m.download_count) FILTER (WHERE m.status = 'approved'), 0) as total_downloads
      FROM users u
      LEFT JOIN materials m ON u.id = m.uploaded_by
      WHERE u.is_banned = FALSE
      GROUP BY u.id, u.name, u.department, u.year, u.badge, u.avatar_url
      HAVING COUNT(m.id) FILTER (WHERE m.status = 'approved') > 0
      ORDER BY upload_count DESC, total_downloads DESC
      LIMIT 50
    `);
    res.json({ leaderboard: leaderboard.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Exam countdowns
router.get('/exams', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, title AS name, exam_date AS date, department FROM exam_countdowns WHERE user_id = $1 AND exam_date >= CURRENT_DATE ORDER BY exam_date ASC',
      [req.user.id]
    );
    res.json({ exams: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

router.post('/exams', auth, async (req, res) => {
  try {
    const title = req.body.title || req.body.name;
    const exam_date = req.body.exam_date || req.body.date;
    const department = req.body.department;
    if (!title || !exam_date) return res.status(400).json({ error: 'Title and date are required' });

    const result = await db.query(
      'INSERT INTO exam_countdowns (user_id, title, exam_date, department) VALUES ($1, $2, $3, $4) RETURNING id, title AS name, exam_date AS date, department',
      [req.user.id, title, exam_date, department || null]
    );
    res.status(201).json({ exam: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add exam' });
  }
});

router.delete('/exams/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM exam_countdowns WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

module.exports = router;
