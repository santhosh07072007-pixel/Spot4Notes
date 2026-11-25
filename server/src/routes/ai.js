const express = require('express');
const path = require('path');
const db = require('../db');
const { auth, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// ═══════════════════════════════════════════════════════════
// 1. AI NOTE QUALITY SCORING
// ═══════════════════════════════════════════════════════════

// POST /api/ai/score/:id - Score a material's quality
router.post('/score/:id', auth, async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });

        const mat = await db.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);
        if (mat.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

        const material = mat.rows[0];

        // Check if already scored
        if (material.ai_quality_score && material.ai_quality_score.overall_score) {
            return res.json({ score: material.ai_quality_score, cached: true });
        }

        // Extract text
        const filePath = path.join(__dirname, '../..', material.file_url);
        const text = await aiService.extractText(filePath, material.file_type);

        if (!text || text.trim().length < 50) {
            return res.json({ score: null, message: 'Not enough text to score. The file may be an image or scanned document.' });
        }

        // Score
        const score = await aiService.scoreNoteQuality(text, material.title);

        // Save to DB
        await db.query(
            'UPDATE materials SET ai_quality_score = $1, ai_processed = TRUE, ai_processed_at = NOW() WHERE id = $2',
            [JSON.stringify(score), req.params.id]
        );

        res.json({ score, cached: false });
    } catch (error) {
        console.error('AI Score error:', error);
        res.status(500).json({ error: 'Failed to score material' });
    }
});

// GET /api/ai/score/:id - Get existing score
router.get('/score/:id', async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });
        const mat = await db.query('SELECT ai_quality_score FROM materials WHERE id = $1', [req.params.id]);
        if (mat.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
        res.json({ score: mat.rows[0].ai_quality_score });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch score' });
    }
});

// ═══════════════════════════════════════════════════════════
// 2. AI AUTO SUMMARY
// ═══════════════════════════════════════════════════════════

// POST /api/ai/summary/:id - Generate summary for a material
router.post('/summary/:id', auth, async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });

        const mat = await db.query(
            `SELECT m.*, d.name as department_name FROM materials m LEFT JOIN departments d ON m.department_id = d.id WHERE m.id = $1`,
            [req.params.id]
        );
        if (mat.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

        const material = mat.rows[0];

        // Check if already summarized
        if (material.ai_summary && material.ai_summary.five_line_summary) {
            return res.json({ summary: material.ai_summary, cached: true });
        }

        const filePath = path.join(__dirname, '../..', material.file_url);
        const text = await aiService.extractText(filePath, material.file_type);

        if (!text || text.trim().length < 50) {
            return res.json({ summary: null, message: 'Not enough text to summarize.' });
        }

        const summary = await aiService.generateAutoSummary(text, material.title, material.department_name);

        if (!summary) {
            return res.json({ summary: null, message: 'AI service unavailable. Please try again later.' });
        }

        // Save
        await db.query(
            'UPDATE materials SET ai_summary = $1, ai_processed = TRUE, ai_processed_at = NOW() WHERE id = $2',
            [JSON.stringify(summary), req.params.id]
        );

        res.json({ summary, cached: false });
    } catch (error) {
        console.error('AI Summary error:', error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

// GET /api/ai/summary/:id - Get existing summary
router.get('/summary/:id', async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });
        const mat = await db.query('SELECT ai_summary FROM materials WHERE id = $1', [req.params.id]);
        if (mat.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
        res.json({ summary: mat.rows[0].ai_summary });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// ═══════════════════════════════════════════════════════════
// 3. AI QUESTION GENERATOR
// ═══════════════════════════════════════════════════════════

// POST /api/ai/questions/:id - Generate questions from a material
router.post('/questions/:id', auth, async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });

        const { mcqCount, twoMarkCount, tenMarkCount, vivaCount } = req.body;

        const mat = await db.query(
            `SELECT m.*, d.name as department_name FROM materials m LEFT JOIN departments d ON m.department_id = d.id WHERE m.id = $1`,
            [req.params.id]
        );
        if (mat.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

        const material = mat.rows[0];

        // Check if already generated (and no custom counts)
        if (!mcqCount && !twoMarkCount && !tenMarkCount && !vivaCount &&
            material.ai_questions && material.ai_questions.mcqs) {
            return res.json({ questions: material.ai_questions, cached: true });
        }

        const filePath = path.join(__dirname, '../..', material.file_url);
        const text = await aiService.extractText(filePath, material.file_type);

        if (!text || text.trim().length < 50) {
            return res.json({ questions: null, message: 'Not enough text to generate questions.' });
        }

        const questions = await aiService.generateQuestions(text, material.title, material.department_name, {
            mcqCount: mcqCount || 5,
            twoMarkCount: twoMarkCount || 5,
            tenMarkCount: tenMarkCount || 3,
            vivaCount: vivaCount || 5,
        });

        if (!questions) {
            return res.json({ questions: null, message: 'AI service unavailable. Please try again later.' });
        }

        // Save the default question set
        if (!mcqCount && !twoMarkCount && !tenMarkCount && !vivaCount) {
            await db.query(
                'UPDATE materials SET ai_questions = $1, ai_processed = TRUE, ai_processed_at = NOW() WHERE id = $2',
                [JSON.stringify(questions), req.params.id]
            );
        }

        res.json({ questions, cached: false });
    } catch (error) {
        console.error('AI Questions error:', error);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

// GET /api/ai/questions/:id - Get existing questions
router.get('/questions/:id', async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });
        const mat = await db.query('SELECT ai_questions FROM materials WHERE id = $1', [req.params.id]);
        if (mat.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
        res.json({ questions: mat.rows[0].ai_questions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// ═══════════════════════════════════════════════════════════
// 4. AI SEMANTIC SEARCH
// ═══════════════════════════════════════════════════════════

// GET /api/ai/search?q=query&department_id=XXX
router.get('/search', async (req, res) => {
    try {
        const { q, department_id, limit } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        const result = await aiService.semanticSearch(q.trim(), department_id, parseInt(limit) || 20);

        res.json(result);
    } catch (error) {
        console.error('AI Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ═══════════════════════════════════════════════════════════
// 5. AI PROCESS ALL (score + summary + questions in one shot)
// ═══════════════════════════════════════════════════════════

router.post('/process/:id', auth, async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });

        const mat = await db.query(
            `SELECT m.*, d.name as department_name FROM materials m LEFT JOIN departments d ON m.department_id = d.id WHERE m.id = $1`,
            [req.params.id]
        );
        if (mat.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

        const material = mat.rows[0];
        const filePath = path.join(__dirname, '../..', material.file_url);
        const text = await aiService.extractText(filePath, material.file_type);

        if (!text || text.trim().length < 50) {
            return res.json({ message: 'Not enough text to process.', score: null, summary: null, questions: null });
        }

        // Run all three in parallel
        const [score, summary, questions] = await Promise.all([
            material.ai_quality_score?.overall_score ? Promise.resolve(material.ai_quality_score) : aiService.scoreNoteQuality(text, material.title),
            material.ai_summary?.five_line_summary ? Promise.resolve(material.ai_summary) : aiService.generateAutoSummary(text, material.title, material.department_name),
            material.ai_questions?.mcqs ? Promise.resolve(material.ai_questions) : aiService.generateQuestions(text, material.title, material.department_name),
        ]);

        // Save all
        await db.query(
            `UPDATE materials SET 
        ai_quality_score = COALESCE($1, ai_quality_score),
        ai_summary = COALESCE($2, ai_summary),
        ai_questions = COALESCE($3, ai_questions),
        ai_processed = TRUE,
        ai_processed_at = NOW()
       WHERE id = $4`,
            [
                score ? JSON.stringify(score) : null,
                summary ? JSON.stringify(summary) : null,
                questions ? JSON.stringify(questions) : null,
                req.params.id,
            ]
        );

        res.json({ score, summary, questions });
    } catch (error) {
        console.error('AI Process error:', error);
        res.status(500).json({ error: 'Failed to process material' });
    }
});

// ═══════════════════════════════════════════════════════════
// 6. DUPLICATE CHECK
// ═══════════════════════════════════════════════════════════

router.post('/check-duplicate/:id', auth, async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid material ID' });

        const mat = await db.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);
        if (mat.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

        const material = mat.rows[0];
        const filePath = path.join(__dirname, '../..', material.file_url);
        const text = await aiService.extractText(filePath, material.file_type);

        const result = await aiService.checkDuplicate(text, req.params.id);

        // Update duplicate status
        const status = result.is_duplicate ? 'duplicate' : (result.similar.length > 0 ? 'similar' : 'unique');
        await db.query(
            'UPDATE materials SET duplicate_status = $1, similar_materials = $2 WHERE id = $3',
            [status, JSON.stringify(result.similar), req.params.id]
        );

        res.json({ ...result, status });
    } catch (error) {
        console.error('Duplicate check error:', error);
        res.status(500).json({ error: 'Failed to check for duplicates' });
    }
});

// ═══════════════════════════════════════════════════════════
// 7. STUDENT ANALYTICS
// ═══════════════════════════════════════════════════════════

router.get('/student-stats', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Your uploads
        const uploads = await db.query(
            `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM materials WHERE uploaded_by = $1`,
            [userId]
        );

        // Total downloads received on your materials
        const downloads = await db.query(
            'SELECT COALESCE(SUM(download_count), 0) as total_downloads FROM materials WHERE uploaded_by = $1 AND status = $2',
            [userId, 'approved']
        );

        // Total views on your materials
        const views = await db.query(
            'SELECT COALESCE(SUM(view_count), 0) as total_views FROM materials WHERE uploaded_by = $1 AND status = $2',
            [userId, 'approved']
        );

        // Average rating on your materials
        const avgRating = await db.query(
            `SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) as avg_rating, COUNT(r.id) as rating_count
       FROM ratings r JOIN materials m ON r.material_id = m.id WHERE m.uploaded_by = $1`,
            [userId]
        );

        // Contribution rank (among all users by upload count)
        const rank = await db.query(
            `SELECT COUNT(*) + 1 as rank FROM (
        SELECT uploaded_by, COUNT(*) as cnt FROM materials WHERE status = 'approved' GROUP BY uploaded_by
        HAVING COUNT(*) > (SELECT COUNT(*) FROM materials WHERE uploaded_by = $1 AND status = 'approved')
       ) sub`,
            [userId]
        );

        // Engagement score = uploads * 10 + downloads_received * 2 + views * 0.5
        const uploadsCount = parseInt(uploads.rows[0].approved) || 0;
        const downloadsCount = parseInt(downloads.rows[0].total_downloads) || 0;
        const viewsCount = parseInt(views.rows[0].total_views) || 0;
        const engagementScore = Math.round(uploadsCount * 10 + downloadsCount * 2 + viewsCount * 0.5);

        // Top materials by downloads
        const topMaterials = await db.query(
            `SELECT id, title, download_count, view_count, ai_quality_score,
              COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM ratings WHERE material_id = m.id), 0) as avg_rating
       FROM materials m WHERE uploaded_by = $1 AND status = 'approved'
       ORDER BY download_count DESC LIMIT 5`,
            [userId]
        );

        // Monthly upload trend
        const monthlyTrend = await db.query(
            `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
       FROM materials WHERE uploaded_by = $1
       GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month DESC LIMIT 6`,
            [userId]
        );

        // Update user engagement score
        await db.query(
            'UPDATE users SET engagement_score = $1, contribution_rank = $2, total_downloads_received = $3 WHERE id = $4',
            [engagementScore, parseInt(rank.rows[0].rank), downloadsCount, userId]
        ).catch(() => { });

        res.json({
            uploads: uploads.rows[0],
            totalDownloads: downloadsCount,
            totalViews: viewsCount,
            avgRating: parseFloat(avgRating.rows[0].avg_rating) || 0,
            ratingCount: parseInt(avgRating.rows[0].rating_count) || 0,
            contributionRank: parseInt(rank.rows[0].rank),
            engagementScore,
            topMaterials: topMaterials.rows,
            monthlyTrend: monthlyTrend.rows,
        });
    } catch (error) {
        console.error('Student stats error:', error);
        res.status(500).json({ error: 'Failed to fetch student stats' });
    }
});

module.exports = router;
