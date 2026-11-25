const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const Filter = require('bad-words');
const db = require('../db');

const filter = new Filter();

// ═══════════════════════════════════════════════════════════
// AI PROVIDERS (Groq primary, Gemini fallback, Claude tertiary)
// ═══════════════════════════════════════════════════════════
let groqClient = null;
try {
  const Groq = require('groq-sdk');
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key') {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
} catch (_) { }

let genAI = null;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (_) { }

let anthropicClient = null;
try {
  const Anthropic = require('@anthropic-ai/sdk');
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key') {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
} catch (_) { }

// ═══════════════════════════════════════════════════════════
// HARD REJECT PATTERNS (instant reject before any AI call)
// ═══════════════════════════════════════════════════════════
const hardRejectPatterns = [
  /\b(porn|xxx|nude|naked|sex\s?tape|onlyfans|hentai|nsfw)\b/gi,
  /\b(cocaine|heroin|meth|weed\s+dealer|drug\s+deal)\b/gi,
  /\b(kill\s+people|murder\s+guide|bomb\s+making|terrorist)\b/gi,
  /\b(gambl(e|ing)|casino|betting\s+tips|slot\s?machine)\b/gi,
  /\b(child\s+abuse|child\s+porn|cp\b)/gi,
  /\b(hate\s+speech|racial\s+slur|white\s+supremac)/gi,
];

// ═══════════════════════════════════════════════════════════
// STRONG ACADEMIC INDICATORS (high-confidence auto-approve)
// ═══════════════════════════════════════════════════════════
const strongAcademicKeywords = [
  'lecture', 'notes', 'chapter', 'unit', 'module', 'exam', 'test',
  'assignment', 'question paper', 'solution', 'theory', 'formula',
  'equation', 'theorem', 'proof', 'definition', 'concept',
  'introduction', 'conclusion', 'reference', 'bibliography',
  'abstract', 'summary', 'syllabus', 'lab manual', 'experiment',
  'observation', 'result', 'procedure', 'apparatus', 'viva',
];

const academicSubjectKeywords = [
  'engineering', 'science', 'mathematics', 'physics', 'chemistry',
  'programming', 'algorithm', 'data structure', 'database', 'network',
  'circuit', 'thermodynamics', 'mechanics', 'electronics', 'signal',
  'compiler', 'operating system', 'artificial intelligence', 'machine learning',
  'computer', 'software', 'hardware', 'logic', 'probability', 'statistics',
  'calculus', 'linear algebra', 'discrete', 'digital', 'analog',
  'semester', 'marks', 'grade', 'university', 'college', 'department',
  'subject', 'course', 'degree', 'diploma', 'regulation',
];

const nonAcademicPatterns = [
  /\b(buy\s+now|order\s+today|limited\s+offer|discount|promo\s?code)\b/gi,
  /\b(subscribe|follow\s+me|like\s+and\s+share|click\s+here)\b/gi,
  /\b(personal\s+diary|my\s+feelings|dear\s+diary)\b/gi,
  /\b(political\s+party|vote\s+for|election\s+campaign)\b/gi,
];

// ═══════════════════════════════════════════════════════════
// AI CONTENT MODERATION PROMPT — The moderation agent spec
// ═══════════════════════════════════════════════════════════
const MODERATION_SYSTEM_PROMPT = `You are an AI Content Moderation Agent for a student note-sharing platform called Spot4Notes.

Your role is to analyze uploaded content and classify it into one of three categories:

1. APPROVED – If the content is clearly and fully academic or study-related. 
   → This must be AUTO-APPROVED with no manual/admin review required.

2. REJECTED – If the content contains fully explicit 18+ sexual material.
   → This must be AUTO-REJECTED with no manual/admin review required.

3. ADMIN_REVIEW – Only if the content is unclear, partially inappropriate, mixed, ambiguous, or requires human verification.

Strict Decision Rules:

- If the content clearly contains definitions, formulas, subject explanations, academic discussions, educational diagrams, research materials, assignments, or exam preparation notes with no explicit content → classify as APPROVED immediately.

- If the content clearly contains explicit adult sexual content, pornographic descriptions, or graphic sexual language → classify as REJECTED immediately.

- Use ADMIN_REVIEW only when:
  • The intent is unclear
  • The content is mixed academic + suspicious text
  • The system confidence is moderate
  • The content may be context-dependent

Confidence Scoring Rules:

- 90–100% → Very clear decision (Auto Approved or Auto Rejected)
- 60–89% → Likely but not fully certain (Admin Review)
- Below 60% → Admin Review

Return your response strictly in this JSON format:

{
  "classification": "APPROVED / REJECTED / ADMIN_REVIEW",
  "confidence_score": "0-100%",
  "reason": "Short explanation of why this decision was made"
}

Do not provide any text outside the JSON response.`;

// ═══════════════════════════════════════════════════════════
// AI CLASSIFICATION — tries Claude → Groq → Gemini
// ═══════════════════════════════════════════════════════════
async function classifyWithAI(textSample) {
  const prompt = `Analyze the following uploaded content and moderate it:\n\n---\n${textSample}\n---`;

  // Try Claude first (best at moderation tasks)
  if (anthropicClient) {
    const models = ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'];
    for (const model of models) {
      try {
        const msg = await anthropicClient.messages.create({
          model,
          max_tokens: 512,
          system: MODERATION_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = msg.content?.[0]?.text;
        if (text) {
          const parsed = parseAIResponse(text);
          if (parsed) return parsed;
        }
      } catch (err) {
        if (String(err.message).includes('429')) { await sleep(1000); continue; }
        break;
      }
    }
  }

  // Try Groq
  if (groqClient) {
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of models) {
      try {
        const completion = await groqClient.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: MODERATION_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 512,
        });
        const text = completion.choices?.[0]?.message?.content;
        if (text) {
          const parsed = parseAIResponse(text);
          if (parsed) return parsed;
        }
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('429') || msg.includes('rate')) {
          await sleep(1000);
          continue;
        }
        break;
      }
    }
  }

  // Try Gemini as final fallback
  if (genAI) {
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`${MODERATION_SYSTEM_PROMPT}\n\n${prompt}`);
        const text = result.response.text();
        if (text) {
          const parsed = parseAIResponse(text);
          if (parsed) return parsed;
        }
      } catch (err) {
        const msg = String(err.message || '');
        if (msg.includes('429') || msg.includes('quota')) {
          await sleep(1000);
          continue;
        }
        break;
      }
    }
  }

  return null; // AI unavailable — will use rule-based fallback
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════
// PARSE AI RESPONSE — Supports new format with confidence_score
// ═══════════════════════════════════════════════════════════
function parseAIResponse(raw) {
  try {
    // Strip markdown code fences if present
    let cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const obj = JSON.parse(cleaned);

    // ─── New format: classification + confidence_score ───
    if (obj.classification) {
      const classification = String(obj.classification).toUpperCase().trim();
      let confidenceNum = 50; // default

      // Parse confidence_score: could be "95%", "95", or number
      if (obj.confidence_score !== undefined) {
        const scoreStr = String(obj.confidence_score).replace('%', '').trim();
        confidenceNum = parseInt(scoreStr) || 50;
        confidenceNum = Math.min(100, Math.max(0, confidenceNum));
      }

      // Map classification → internal decision
      let decision;
      if (classification === 'APPROVED') {
        decision = confidenceNum >= 90 ? 'APPROVE' : 'REVIEW';
      } else if (classification === 'REJECTED') {
        decision = confidenceNum >= 90 ? 'REJECT' : 'REVIEW';
      } else if (classification === 'ADMIN_REVIEW') {
        decision = 'REVIEW';
      } else {
        // Fallback: try to match known decisions
        if (['APPROVE', 'REVIEW', 'REJECT'].includes(classification)) {
          decision = classification;
        } else {
          decision = 'REVIEW';
        }
      }

      // Confidence label
      let confidence;
      if (confidenceNum >= 90) confidence = 'high';
      else if (confidenceNum >= 60) confidence = 'medium';
      else confidence = 'low';

      return {
        decision,
        confidence,
        confidence_score: confidenceNum,
        reason: obj.reason || 'AI classification',
        ai_classification: classification,
      };
    }

    // ─── Legacy format: decision + confidence (string) ───
    if (obj.decision) {
      const decision = String(obj.decision).toUpperCase();
      if (['APPROVE', 'REVIEW', 'REJECT'].includes(decision)) {
        return {
          decision,
          confidence: obj.confidence || 'medium',
          confidence_score: obj.confidence === 'high' ? 95 : obj.confidence === 'medium' ? 70 : 40,
          reason: obj.reason || 'AI classification',
          ai_classification: decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'ADMIN_REVIEW',
        };
      }
    }
  } catch (_) { }

  // Try to extract decision from plain text
  const upper = raw.toUpperCase();
  if (upper.includes('REJECTED') || upper.includes('REJECT')) {
    return { decision: 'REJECT', confidence: 'medium', confidence_score: 70, reason: 'AI flagged as non-academic/harmful', ai_classification: 'REJECTED' };
  }
  if (upper.includes('ADMIN_REVIEW') || upper.includes('REVIEW')) {
    return { decision: 'REVIEW', confidence: 'medium', confidence_score: 65, reason: 'AI flagged for manual review', ai_classification: 'ADMIN_REVIEW' };
  }
  if (upper.includes('APPROVED') || upper.includes('APPROVE')) {
    return { decision: 'APPROVE', confidence: 'medium', confidence_score: 75, reason: 'AI classified as academic', ai_classification: 'APPROVED' };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// RULE-BASED CLASSIFIER (fallback when all AI providers fail)
// Uses the same 3-tier logic: APPROVE / REJECT / REVIEW
// ═══════════════════════════════════════════════════════════
function classifyWithRules(text) {
  if (!text || text.trim().length === 0) {
    return {
      decision: 'REVIEW',
      confidence: 'low',
      confidence_score: 30,
      reason: 'No extractable text — requires manual admin review',
      ai_classification: 'ADMIN_REVIEW',
    };
  }

  const lowerText = text.toLowerCase();
  const issues = [];

  // 1. Hard-reject patterns (adult, drugs, violence, gambling)
  for (const pattern of hardRejectPatterns) {
    if (pattern.test(text)) {
      issues.push('harmful_content');
    }
    pattern.lastIndex = 0;
  }
  if (issues.includes('harmful_content')) {
    return {
      decision: 'REJECT',
      confidence: 'high',
      confidence_score: 98,
      reason: 'Contains harmful or prohibited content (explicit 18+ material, drugs, violence, or hate speech)',
      ai_classification: 'REJECTED',
    };
  }

  // 2. Profanity check
  try {
    if (filter.isProfane(text)) {
      issues.push('profanity');
    }
  } catch (_) { }

  // 3. Non-academic spam patterns
  let spamHits = 0;
  for (const pattern of nonAcademicPatterns) {
    if (pattern.test(text)) spamHits++;
    pattern.lastIndex = 0;
  }
  if (spamHits >= 2) {
    return {
      decision: 'REJECT',
      confidence: 'high',
      confidence_score: 92,
      reason: 'Content appears to be advertisements or spam — auto-rejected',
      ai_classification: 'REJECTED',
    };
  }

  // 4. Academic keyword analysis
  const strongMatches = strongAcademicKeywords.filter(kw => lowerText.includes(kw)).length;
  const subjectMatches = academicSubjectKeywords.filter(kw => lowerText.includes(kw)).length;
  const totalAcademic = strongMatches + subjectMatches;

  // 5. Decision logic with confidence scoring
  if (text.length < 100) {
    return {
      decision: 'REVIEW',
      confidence: 'low',
      confidence_score: 35,
      reason: 'Content too short to determine academic relevance — requires admin review',
      ai_classification: 'ADMIN_REVIEW',
    };
  }

  // Strong academic content → AUTO-APPROVE
  if (totalAcademic >= 5 && issues.length === 0) {
    return {
      decision: 'APPROVE',
      confidence: 'high',
      confidence_score: 95,
      reason: `Clearly academic content detected — ${totalAcademic} academic keywords found. Auto-approved.`,
      ai_classification: 'APPROVED',
    };
  }

  // Moderate academic content → AUTO-APPROVE with slightly lower confidence
  if (totalAcademic >= 3 && issues.length === 0) {
    return {
      decision: 'APPROVE',
      confidence: 'high',
      confidence_score: 90,
      reason: `Academic content detected — ${totalAcademic} academic keywords. Auto-approved.`,
      ai_classification: 'APPROVED',
    };
  }

  // Some academic keywords but also some issues → ADMIN_REVIEW
  if (totalAcademic >= 1 && issues.length <= 1) {
    return {
      decision: 'REVIEW',
      confidence: 'medium',
      confidence_score: 65,
      reason: 'Partially academic content with minor issues — requires admin verification',
      ai_classification: 'ADMIN_REVIEW',
    };
  }

  // Issues with zero academic content → REJECT
  if (issues.length > 0 && totalAcademic === 0) {
    return {
      decision: 'REJECT',
      confidence: 'medium',
      confidence_score: 80,
      reason: 'Contains inappropriate language with no academic content — auto-rejected',
      ai_classification: 'REJECTED',
    };
  }

  // Long text with no academic keywords → ADMIN_REVIEW
  if (text.length > 500 && totalAcademic === 0) {
    return {
      decision: 'REVIEW',
      confidence: 'medium',
      confidence_score: 55,
      reason: 'Substantial text with no academic keywords — needs admin review',
      ai_classification: 'ADMIN_REVIEW',
    };
  }

  return {
    decision: 'REVIEW',
    confidence: 'low',
    confidence_score: 40,
    reason: 'Unable to confidently classify — requires manual admin review',
    ai_classification: 'ADMIN_REVIEW',
  };
}

// ═══════════════════════════════════════════════════════════
// MAIN SCANNER CLASS
// ═══════════════════════════════════════════════════════════
class ContentScanner {
  // ─── Text extraction ───
  async extractPdfText(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text || '';
    } catch (error) {
      console.error('PDF extraction error:', error.message);
      return '';
    }
  }

  async extractDocxText(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    } catch (error) {
      console.error('DOCX extraction error:', error.message);
      return '';
    }
  }

  async extractImageText(filePath) {
    try {
      const Tesseract = require('tesseract.js');
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
      return text || '';
    } catch (error) {
      console.error('OCR extraction error:', error.message);
      return '';
    }
  }

  async extractText(filePath, mimeType) {
    if (mimeType === 'application/pdf') {
      return this.extractPdfText(filePath);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return this.extractDocxText(filePath);
    } else if (mimeType.startsWith('image/')) {
      return this.extractImageText(filePath);
    } else if (
      mimeType === 'application/vnd.ms-powerpoint' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return '';
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════
  // MAIN SCAN — 3-tier AI Content Moderation Agent
  //
  // APPROVED  (90-100% confidence) → Auto-Approve, no admin needed
  // REJECTED  (90-100% confidence) → Auto-Reject, no admin needed
  // ADMIN_REVIEW (< 90% or ambiguous) → Stays pending for admin
  // ═══════════════════════════════════════════════════════
  async scanFile(materialId, filePath, mimeType) {
    try {
      // Mark as scanning
      await db.query(
        'UPDATE materials SET scan_status = $1 WHERE id = $2',
        ['scanning', materialId]
      );

      // Extract text
      const text = await this.extractText(filePath, mimeType);

      // ────────────────────────────────────────────────────
      // CASE 1: No text extracted (PPT, scanned image failed)
      // → Send to ADMIN_REVIEW
      // ────────────────────────────────────────────────────
      if (!text || text.trim().length === 0) {
        const scanDetails = {
          scannedAt: new Date().toISOString(),
          textLength: 0,
          method: 'no_text',
          decision: 'REVIEW',
          ai_classification: 'ADMIN_REVIEW',
          confidence: 'low',
          confidence_score: 30,
          reason: 'No text could be extracted — requires admin review',
        };
        await db.query(
          'UPDATE materials SET scan_status = $1, scan_details = $2, status = $3 WHERE id = $4',
          ['needs_review', JSON.stringify(scanDetails), 'pending', materialId]
        );
        return { decision: 'REVIEW', ai_classification: 'ADMIN_REVIEW', status: 'pending', reason: 'No extractable text' };
      }

      // ────────────────────────────────────────────────────
      // CASE 2: Hard-reject pattern check (instant, no AI needed)
      // Explicit 18+ / drugs / violence / hate → AUTO-REJECT
      // ────────────────────────────────────────────────────
      for (const pattern of hardRejectPatterns) {
        if (pattern.test(text)) {
          pattern.lastIndex = 0;
          const scanDetails = {
            scannedAt: new Date().toISOString(),
            textLength: text.length,
            method: 'hard_reject',
            decision: 'REJECT',
            ai_classification: 'REJECTED',
            confidence: 'high',
            confidence_score: 99,
            reason: 'Contains explicit 18+ material, drugs, violence, or hate speech — auto-rejected with no admin review required',
          };
          await db.query(
            'UPDATE materials SET scan_status = $1, scan_details = $2, status = $3 WHERE id = $4',
            ['rejected', JSON.stringify(scanDetails), 'rejected', materialId]
          );
          // Notify uploader about rejection
          await this.notifyUploader(materialId, scanDetails.reason);
          await this.notifyAdmins(materialId, 'REJECTED', scanDetails.reason, 99);
          return { decision: 'REJECT', ai_classification: 'REJECTED', status: 'rejected', confidence_score: 99, reason: scanDetails.reason };
        }
        pattern.lastIndex = 0;
      }

      // ────────────────────────────────────────────────────
      // CASE 3: AI Classification (primary method)
      // ────────────────────────────────────────────────────
      const textSample = text.substring(0, 4000);
      let classification = null;
      let method = 'rules';

      // Try AI classification
      try {
        classification = await classifyWithAI(textSample);
        if (classification) method = 'ai';
      } catch (err) {
        console.warn('AI classification failed, falling back to rules:', err.message);
      }

      // Fall back to rule-based if AI failed
      if (!classification) {
        classification = classifyWithRules(text);
        method = 'rules';
      }

      // Build scan details
      const scanDetails = {
        scannedAt: new Date().toISOString(),
        textLength: text.length,
        method,
        decision: classification.decision,
        ai_classification: classification.ai_classification || 'ADMIN_REVIEW',
        confidence: classification.confidence,
        confidence_score: classification.confidence_score || 50,
        reason: classification.reason,
      };

      // ────────────────────────────────────────────────────
      // APPLY THE DECISION
      // ────────────────────────────────────────────────────

      if (classification.decision === 'APPROVE') {
        // ✅ APPROVED — Auto-approve, no admin review required
        await db.query(
          'UPDATE materials SET scan_status = $1, scan_details = $2, status = $3 WHERE id = $4',
          ['clean', JSON.stringify(scanDetails), 'approved', materialId]
        );
        // Notify uploader of approval
        await this.notifyUploaderApproval(materialId);
        console.log(`✅ AUTO-APPROVED [${materialId}] — confidence: ${scanDetails.confidence_score}% — ${classification.reason}`);
        return { decision: 'APPROVE', ai_classification: 'APPROVED', status: 'approved', confidence_score: scanDetails.confidence_score, reason: classification.reason };

      } else if (classification.decision === 'REJECT') {
        // ❌ REJECTED — Auto-reject, no admin review required
        await db.query(
          'UPDATE materials SET scan_status = $1, scan_details = $2, status = $3 WHERE id = $4',
          ['rejected', JSON.stringify(scanDetails), 'rejected', materialId]
        );
        await this.notifyUploader(materialId, classification.reason);
        await this.notifyAdmins(materialId, 'REJECTED', classification.reason, scanDetails.confidence_score);
        console.log(`❌ AUTO-REJECTED [${materialId}] — confidence: ${scanDetails.confidence_score}% — ${classification.reason}`);
        return { decision: 'REJECT', ai_classification: 'REJECTED', status: 'rejected', confidence_score: scanDetails.confidence_score, reason: classification.reason };

      } else {
        // 🔍 ADMIN_REVIEW — Keep pending for manual admin review
        await db.query(
          'UPDATE materials SET scan_status = $1, scan_details = $2, status = $3 WHERE id = $4',
          ['flagged', JSON.stringify(scanDetails), 'pending', materialId]
        );
        await this.notifyAdmins(materialId, 'ADMIN_REVIEW', classification.reason, scanDetails.confidence_score);
        console.log(`🔍 ADMIN_REVIEW [${materialId}] — confidence: ${scanDetails.confidence_score}% — ${classification.reason}`);
        return { decision: 'REVIEW', ai_classification: 'ADMIN_REVIEW', status: 'pending', confidence_score: scanDetails.confidence_score, reason: classification.reason };
      }

    } catch (error) {
      console.error('Scan error:', error);
      await db.query(
        'UPDATE materials SET scan_status = $1, scan_details = $2 WHERE id = $3',
        ['pending', JSON.stringify({ error: error.message, scannedAt: new Date().toISOString() }), materialId]
      );
      return { decision: 'REVIEW', ai_classification: 'ADMIN_REVIEW', status: 'pending', error: error.message };
    }
  }

  // ─── Notify the uploader about rejection ───
  async notifyUploader(materialId, reason) {
    try {
      const mat = await db.query('SELECT uploaded_by, title FROM materials WHERE id = $1', [materialId]);
      if (mat.rows[0]) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
          [
            mat.rows[0].uploaded_by,
            '❌ Upload Auto-Rejected',
            `Your upload "${mat.rows[0].title}" was automatically rejected: ${reason}`,
            'error',
            `/my-uploads`,
          ]
        );
      }
    } catch (_) { }
  }

  // ─── Notify the uploader about approval ───
  async notifyUploaderApproval(materialId) {
    try {
      const mat = await db.query('SELECT uploaded_by, title FROM materials WHERE id = $1', [materialId]);
      if (mat.rows[0]) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
          [
            mat.rows[0].uploaded_by,
            '✅ Upload Auto-Approved',
            `Your upload "${mat.rows[0].title}" has been automatically approved and is now live!`,
            'success',
            `/materials/${materialId}`,
          ]
        );
      }
    } catch (_) { }
  }

  // ─── Notify admin users about flagged/rejected content ───
  async notifyAdmins(materialId, classification, reason, confidenceScore) {
    try {
      // Fetch rich metadata for the notification
      const materialResult = await db.query(
        `SELECT m.title, m.file_name, m.file_type, m.created_at, m.uploaded_by, u.name as uploader_name 
         FROM materials m LEFT JOIN users u ON m.uploaded_by = u.id WHERE m.id = $1`,
        [materialId]
      );

      if (materialResult.rows.length === 0) return;
      const m = materialResult.rows[0];

      const admins = await db.query('SELECT id FROM users WHERE role = $1', ['admin']);
      const isRejected = classification === 'REJECTED';
      const title = isRejected ? '❌ Auto-Rejected Upload' : '🔍 Upload Needs Admin Review';
      const type = isRejected ? 'error' : 'warning';

      // Format metadata for the message
      const timestamp = new Date(m.created_at).toLocaleString();
      const metadataStr = `Uploader: ${m.uploader_name || 'Anonymous'} (ID: ${m.uploaded_by || 'N/A'})\nTime: ${timestamp}\nFile: ${m.file_name} (${m.file_type})\nReason: ${reason}`;

      for (const admin of admins.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
          [
            admin.id,
            title,
            `AI Moderation: ${classification} (${confidenceScore}% confidence)\n\n${metadataStr}`,
            type,
            `/admin/scanner?id=${materialId}`,
          ]
        );
      }
    } catch (err) {
      console.error('Failed to notify admins:', err.message);
    }
  }
}

module.exports = new ContentScanner();
