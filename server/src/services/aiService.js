const db = require('../db');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

// ═══════════════════════════════════════════════════════════
// AI PROVIDERS (same pattern as chatbot.js)
// ═══════════════════════════════════════════════════════════
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (_) {}

let anthropicClient = null;
if (Anthropic && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key') {
  try { anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); } catch (_) {}
}

let groqClient = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key') {
  try { groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY }); } catch (_) {}
}

let genAI = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key') {
  try { genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } catch (_) {}
}

// ─── Generic AI call (Claude → Groq → Gemini) ───
async function callAI(prompt, systemPrompt, opts = {}) {
  const maxTokens = opts.maxTokens || 4096;

  // Claude
  if (anthropicClient) {
    const models = ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'];
    for (const model of models) {
      try {
        const msg = await anthropicClient.messages.create({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: prompt }] });
        const text = msg.content?.[0]?.text;
        if (text && text.trim()) return text;
      } catch (err) {
        if (String(err.message).includes('429')) { await sleep(1000); continue; }
        break;
      }
    }
  }

  // Groq
  if (groqClient) {
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of models) {
      try {
        const c = await groqClient.chat.completions.create({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], temperature: 0.3, max_tokens: maxTokens });
        const text = c.choices?.[0]?.message?.content;
        if (text && text.trim()) return text;
      } catch (err) {
        if (String(err.message).includes('429')) { await sleep(1000); continue; }
        break;
      }
    }
  }

  // Gemini
  if (genAI) {
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
        const text = result.response.text();
        if (text && text.trim()) return text;
      } catch (err) {
        if (String(err.message).includes('429')) { await sleep(1000); continue; }
        break;
      }
    }
  }

  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseJSON(raw) {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON in the text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// TEXT EXTRACTION (reuse scanner logic)
// ═══════════════════════════════════════════════════════════
async function extractText(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const buf = fs.readFileSync(filePath);
      const data = await pdf(buf);
      return data.text || '';
    } else if (mimeType?.includes('wordprocessingml') || mimeType === 'application/msword') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    } else if (mimeType?.startsWith('image/')) {
      try {
        const Tesseract = require('tesseract.js');
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
        return text || '';
      } catch { return ''; }
    }
  } catch (e) {
    console.error('Text extraction error:', e.message);
  }
  return '';
}

// ═══════════════════════════════════════════════════════════
// 1. AI NOTE QUALITY SCORING
// ═══════════════════════════════════════════════════════════
const QUALITY_SYSTEM = `You are an academic note quality evaluator for a college note-sharing platform called Spot4Notes.

Evaluate the uploaded notes on these criteria (each scored 1-10):
1. **Clarity** — Are the concepts explained clearly and logically?
2. **Completeness** — Does it cover the topic thoroughly?
3. **Readability** — Is it well-formatted, legible, and organized?
4. **Relevance** — Is the content relevant to the subject/topic?
5. **Grammar** — Is the grammar and language quality acceptable?

Then compute an overall Quality Score (1-10) as a weighted average.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "clarity": 8,
  "completeness": 7,
  "readability": 9,
  "relevance": 8,
  "grammar": 7,
  "overall_score": 8,
  "strengths": ["Well-organized structure", "Clear diagrams"],
  "improvements": ["Add more examples", "Include formulas"],
  "brief_feedback": "Good quality notes with clear explanations. Could benefit from more worked examples."
}`;

async function scoreNoteQuality(text, title = '') {
  const sample = text.substring(0, 4000);
  const prompt = `Evaluate the quality of these academic notes${title ? ` (Title: "${title}")` : ''}:\n\n---\n${sample}\n---`;

  const raw = await callAI(prompt, QUALITY_SYSTEM);
  if (!raw) return getDefaultScore(text);

  const parsed = parseJSON(raw);
  if (parsed && parsed.overall_score) {
    return {
      clarity: Math.min(10, Math.max(1, parsed.clarity || 5)),
      completeness: Math.min(10, Math.max(1, parsed.completeness || 5)),
      readability: Math.min(10, Math.max(1, parsed.readability || 5)),
      relevance: Math.min(10, Math.max(1, parsed.relevance || 5)),
      grammar: Math.min(10, Math.max(1, parsed.grammar || 5)),
      overall_score: Math.min(10, Math.max(1, parsed.overall_score || 5)),
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      brief_feedback: parsed.brief_feedback || 'Quality assessment complete.',
      method: 'ai',
    };
  }
  return getDefaultScore(text);
}

function getDefaultScore(text) {
  const len = text.length;
  const completeness = Math.min(10, Math.max(3, Math.round(len / 500)));
  return {
    clarity: 5, completeness, readability: 5, relevance: 5, grammar: 5,
    overall_score: 5, strengths: ['Content uploaded successfully'],
    improvements: ['AI scoring unavailable — manual review recommended'],
    brief_feedback: 'AI quality scoring is temporarily unavailable.',
    method: 'fallback',
  };
}

// ═══════════════════════════════════════════════════════════
// 2. AI AUTO SUMMARY
// ═══════════════════════════════════════════════════════════
const SUMMARY_SYSTEM = `You are an academic summarization AI for Spot4Notes. Given student notes, generate:

1. **5-Line Summary** — A concise 5-line summary of the content
2. **Key Points** — Bullet list of the most important takeaways
3. **Important Formulas** — Any formulas, equations, or rules mentioned (use LaTeX notation if applicable)
4. **Exam-Focused Notes** — What a student MUST remember for exams
5. **Viva Tips** — Quick answers that would impress in a viva voce

Respond with ONLY valid JSON (no markdown fences):
{
  "five_line_summary": "Line 1. Line 2. Line 3. Line 4. Line 5.",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "important_formulas": ["Formula 1", "Formula 2"],
  "exam_focused_notes": ["Must remember 1", "Must remember 2"],
  "viva_tips": ["Tip 1", "Tip 2"]
}`;

async function generateAutoSummary(text, title = '', department = '') {
  const sample = text.substring(0, 6000);
  const prompt = `Summarize these academic notes${title ? ` (Title: "${title}")` : ''}${department ? ` (Department: ${department})` : ''}:\n\n---\n${sample}\n---`;

  const raw = await callAI(prompt, SUMMARY_SYSTEM);
  if (!raw) return null;

  const parsed = parseJSON(raw);
  if (parsed) return { ...parsed, method: 'ai' };
  
  // If JSON parse failed, return raw as text summary
  return {
    five_line_summary: raw.substring(0, 500),
    key_points: [],
    important_formulas: [],
    exam_focused_notes: [],
    viva_tips: [],
    method: 'ai_text',
  };
}

// ═══════════════════════════════════════════════════════════
// 3. AI QUESTION GENERATOR
// ═══════════════════════════════════════════════════════════
const QUESTION_SYSTEM = `You are an academic question generator for Spot4Notes. From the given notes, generate exam-style questions.

Respond with ONLY valid JSON (no markdown fences):
{
  "mcqs": [
    {"id": 1, "question": "Q?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A", "explanation": "..."}
  ],
  "two_mark": [
    {"id": 1, "question": "Q?", "model_answer": "Brief answer..."}
  ],
  "ten_mark": [
    {"id": 1, "question": "Q?", "key_points": ["Point 1", "Point 2"], "model_answer": "Detailed answer..."}
  ],
  "viva_questions": [
    {"id": 1, "question": "Q?", "expected_answer": "...", "follow_up": "...", "tip": "..."}
  ]
}`;

async function generateQuestions(text, title = '', department = '', options = {}) {
  const { mcqCount = 5, twoMarkCount = 5, tenMarkCount = 3, vivaCount = 5 } = options;
  const sample = text.substring(0, 5000);

  const prompt = `From these academic notes${title ? ` (Title: "${title}")` : ''}${department ? ` (Department: ${department})` : ''}, generate:
- ${mcqCount} MCQs (multiple choice questions with 4 options each)
- ${twoMarkCount} 2-mark short answer questions
- ${tenMarkCount} 10-mark long answer questions  
- ${vivaCount} viva voce questions with expected answers and tips

Notes:
---
${sample}
---`;

  const raw = await callAI(prompt, QUESTION_SYSTEM, { maxTokens: 8192 });
  if (!raw) return null;

  const parsed = parseJSON(raw);
  if (parsed) return { ...parsed, method: 'ai' };
  return null;
}

// ═══════════════════════════════════════════════════════════
// 4. AI SEMANTIC SEARCH
// ═══════════════════════════════════════════════════════════
async function semanticSearch(query, departmentId = null, limit = 20) {
  // Step 1: AI-expand the query into related academic terms
  const expandPrompt = `A student is searching for: "${query}"

Generate a list of related academic terms, synonyms, and subtopics that should also match this search. Include specific algorithms, concepts, formulas, and techniques related to the query.

Respond with ONLY valid JSON:
{"related_terms": ["term1", "term2", "term3", ...], "expanded_query": "broader search string"}`;

  const expandSystem = 'You are a search query expansion AI for an academic platform. Expand queries to find relevant study materials.';
  
  let searchTerms = [query];
  let expandedQuery = query;

  try {
    const raw = await callAI(expandPrompt, expandSystem, { maxTokens: 512 });
    if (raw) {
      const parsed = parseJSON(raw);
      if (parsed) {
        searchTerms = [query, ...(parsed.related_terms || [])];
        expandedQuery = parsed.expanded_query || query;
      }
    }
  } catch (e) {
    console.error('Query expansion error:', e.message);
  }

  // Step 2: Build SQL with expanded terms
  const conditions = [];
  const params = [];
  let pi = 1;

  // Original keyword search
  conditions.push(`(m.title ILIKE $${pi} OR m.description ILIKE $${pi} OR m.course_title ILIKE $${pi})`);
  params.push(`%${query}%`);
  pi++;

  // Expanded terms search (use OR for each)
  for (const term of searchTerms.slice(0, 10)) {
    if (term.toLowerCase() !== query.toLowerCase()) {
      conditions.push(`(m.title ILIKE $${pi} OR m.description ILIKE $${pi} OR m.tags::text ILIKE $${pi})`);
      params.push(`%${term}%`);
      pi++;
    }
  }

  let whereClause = `m.status = 'approved' AND (${conditions.join(' OR ')})`;
  
  if (departmentId) {
    whereClause += ` AND (m.is_common = TRUE OR EXISTS (SELECT 1 FROM material_departments md WHERE md.material_id = m.id AND md.department_id = $${pi}))`;
    params.push(departmentId);
    pi++;
  }

  const sql = `
    SELECT DISTINCT m.*, d.name as department_name, d.slug as department_slug,
           s.name as subject_name, u.name as uploader_name,
           COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM ratings WHERE material_id = m.id), 0) as avg_rating,
           COALESCE((SELECT COUNT(*) FROM likes WHERE material_id = m.id), 0) as like_count
    FROM materials m
    LEFT JOIN departments d ON m.department_id = d.id
    LEFT JOIN subjects s ON m.subject_id = s.id
    LEFT JOIN users u ON m.uploaded_by = u.id
    WHERE ${whereClause}
    ORDER BY m.download_count DESC, m.view_count DESC
    LIMIT $${pi}
  `;
  params.push(limit);

  const result = await db.query(sql, params);

  // Attach departments
  for (const mat of result.rows) {
    const depts = await db.query(
      `SELECT d.id, d.name, d.slug FROM material_departments md JOIN departments d ON md.department_id = d.id WHERE md.material_id = $1 ORDER BY d.name`,
      [mat.id]
    );
    mat.departments = depts.rows;
  }

  return {
    materials: result.rows,
    expanded_terms: searchTerms,
    expanded_query: expandedQuery,
    total: result.rows.length,
  };
}

// ═══════════════════════════════════════════════════════════
// 5. DUPLICATE DETECTION
// ═══════════════════════════════════════════════════════════
async function checkDuplicate(text, materialId = null) {
  if (!text || text.length < 100) return { is_duplicate: false, similar: [] };

  // Get a fingerprint of the text (first 200 chars normalized)
  const fingerprint = text.substring(0, 500).toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Check existing materials for similar content
  const existingMaterials = await db.query(
    `SELECT id, title, ai_summary FROM materials 
     WHERE status = 'approved' ${materialId ? `AND id != $1` : ''} 
     AND ai_summary IS NOT NULL
     ORDER BY created_at DESC LIMIT 50`,
    materialId ? [materialId] : []
  );

  // Simple similarity check (could be enhanced with embeddings)
  const similar = [];
  for (const mat of existingMaterials.rows) {
    const summary = mat.ai_summary;
    if (summary && typeof summary === 'object' && summary.five_line_summary) {
      const existingSummary = summary.five_line_summary.toLowerCase();
      // Check word overlap
      const queryWords = new Set(fingerprint.split(' ').filter(w => w.length > 3));
      const existingWords = new Set(existingSummary.split(' ').filter(w => w.length > 3));
      const overlap = [...queryWords].filter(w => existingWords.has(w)).length;
      const similarity = queryWords.size > 0 ? overlap / queryWords.size : 0;

      if (similarity > 0.5) {
        similar.push({ id: mat.id, title: mat.title, similarity: Math.round(similarity * 100) });
      }
    }
  }

  return {
    is_duplicate: similar.length > 0 && similar[0].similarity > 70,
    similar: similar.slice(0, 5),
  };
}

module.exports = {
  extractText,
  scoreNoteQuality,
  generateAutoSummary,
  generateQuestions,
  semanticSearch,
  checkDuplicate,
  callAI,
  parseJSON,
};
