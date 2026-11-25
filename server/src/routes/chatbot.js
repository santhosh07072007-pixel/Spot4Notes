const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ─── System prompt for the Spot4Notes AI Study Assistant ───
const SYSTEM_PROMPT = `You are **Spot4Notes AI Study Assistant**, an academic helper built exclusively for college students.

## Your Purpose
- Help students understand academic subjects clearly
- Explain concepts step-by-step
- Generate practice questions and quizzes
- Summarize notes and highlight key points
- Provide exam preparation help
- Answer ONLY academic and study-related queries

## Response Rules
1. Only respond to academic and study-related questions.
2. If the question is unrelated (politics, adult content, personal advice, entertainment, gossip, etc.), politely refuse with: "I'm here to help with academics only! 📚 Please ask me a study-related question."
3. Provide clear, structured answers using markdown formatting.
4. Use simple explanations first, then add technical depth if needed.
5. If the user mentions a department or course code, tailor the answer accordingly.

## When answering academic questions, provide (where applicable):
- **Definition** — Clear and concise
- **Explanation** — Step-by-step breakdown
- **Example** — Real-world or textbook example
- **Diagram** — Text-based diagram or flowchart if helpful
- **Exam Tips** — Key points to remember for exams

## Special Modes
- If user says "explain in simple terms" → Give an easy, beginner-friendly explanation
- If user says "explain in detail" → Give a thorough technical explanation
- If user says "give important questions" → Generate exam-oriented 2-mark, 5-mark, and 10-mark questions
- If user says "create quiz" or "quiz me" → Generate 5 MCQs with 4 options each, then reveal answers at the end
- If user pastes notes and asks to summarize → Summarize content, highlight key points, generate possible exam questions

## Tone
- Friendly but professional — like a helpful college tutor
- Encouraging and supportive
- Use emojis sparingly for warmth (📚, ✅, 💡, 🎯)

## Never
- Give harmful, inappropriate, or non-academic responses
- Make up fake references or citations
- Provide illegal content
- Respond to off-topic queries`;

// ─── Initialize AI Providers ───
// Provider 1: Claude / Anthropic (primary)
let anthropicClient = null;
if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key') {
  try {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    console.log('  ✅ Claude AI initialized (primary provider)');
  } catch (err) {
    console.warn('  ⚠️ Claude/Anthropic init failed:', err.message);
  }
}

// Provider 2: Groq (fallback)
let groqClient = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key') {
  try {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('  ✅ Groq AI initialized (fallback provider)');
  } catch (err) {
    console.warn('  ⚠️ Groq init failed:', err.message);
  }
}

// Provider 3: Gemini (last fallback)
let genAI = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key') {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('  ✅ Gemini AI initialized (last fallback provider)');
  } catch (err) {
    console.warn('  ⚠️ Gemini init failed:', err.message);
  }
}

// Helper: generate AI response — tries Claude first, then Groq, then Gemini, with retries
async function generateAIResponse(prompt, systemPrompt = SYSTEM_PROMPT) {
  // ── Try Claude first (primary provider) ──
  if (anthropicClient) {
    const claudeModels = ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'];
    for (const model of claudeModels) {
      try {
        const message = await anthropicClient.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            { role: 'user', content: prompt },
          ],
        });
        const text = message.content?.[0]?.text;
        if (text && text.trim()) return text;
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('429') || msg.includes('rate') || msg.includes('overloaded')) {
          console.warn(`  ⚠️ Claude ${model} rate limited, trying next...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        console.warn(`  ⚠️ Claude ${model} failed:`, msg.substring(0, 100));
        break;
      }
    }
  }

  // ── Try Groq as fallback ──
  if (groqClient) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
    for (const model of groqModels) {
      try {
        const completion = await groqClient.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        });
        const text = completion.choices?.[0]?.message?.content;
        if (text && text.trim()) return text;
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('429') || msg.includes('rate')) {
          console.warn(`  ⚠️ Groq ${model} rate limited, trying next...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        console.warn(`  ⚠️ Groq ${model} failed:`, msg.substring(0, 100));
        break;
      }
    }
  }

  // ── Try Gemini as last fallback ──
  if (genAI) {
    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
    for (const modelName of geminiModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
          const text = result.response.text();
          if (text && text.trim()) return text;
        } catch (err) {
          const msg = String(err.message || '');
          if (msg.includes('429') || msg.includes('quota')) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          break;
        }
      }
    }
  }

  return null; // All providers exhausted
}

// ─── Smart fallback responses when AI is unavailable ───
function getFallbackResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower === 'hey') {
    return `Hello! 👋 I'm the **Spot4Notes AI Study Assistant**.

I'm here to help you with your academics. Here's what I can do:

- 💡 **Explain concepts** — Ask me "what is [topic]?" or "explain [concept]"
- 📝 **Practice questions** — Say "give important questions on [topic]"
- 🧠 **Quiz me** — Say "create quiz on [topic]"
- 📋 **Summarize notes** — Paste your notes and say "summarize"
- 🎯 **Exam tips** — Ask for study strategies

What would you like help with today?`;
  }

  if (lower.includes('quiz') || lower.includes('mcq')) {
    return `🧠 I'd love to create a quiz for you!

Please specify the topic, e.g.:
- "Create quiz on Data Structures"
- "MCQ on Operating Systems"
- "Quiz me on Newton's Laws"

**Note:** The AI service is currently unavailable. Once it's back, I'll generate custom MCQs! For now, try checking the **Materials** section for practice papers.`;
  }

  if (lower.includes('summarize') || lower.includes('summary')) {
    return `📋 I can summarize your notes!

Please paste the text you'd like me to summarize, and I'll:
- Highlight **key points**
- Create a **short summary**
- Generate possible **exam questions**

**Note:** The AI service is temporarily unavailable. Please try again later!`;
  }

  if (lower.includes('important question') || lower.includes('exam question')) {
    return `🎯 I can generate exam-style questions!

Tell me the subject and topic, e.g.:
- "Important questions on DBMS normalization"
- "Exam questions for Computer Networks Unit 3"

**Note:** The AI service is currently unavailable. Check the **Materials** section for question papers in the meantime.`;
  }

  return `📚 I'm the Spot4Notes AI Study Assistant. I'm experiencing high demand right now.

**Your question:** "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"

Please try again in a moment — the AI will respond once the rate limit resets (usually within 60 seconds).

In the meantime, you can:
- 📖 Browse the **Materials** section for study resources
- 🔍 Search for notes on your topic
- 📝 Try the **Summarize** tab to process your notes

💡 **Tip:** If this keeps happening, the daily quota may be exhausted — try again tomorrow!`;
}

// ─── All chatbot routes require auth ───
router.use(auth);

// ─── POST /api/chatbot/chat — Send a message ───
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, department, subject, difficulty } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const activeSession = sessionId || uuidv4();

    // Save user message to DB
    await db.query(
      `INSERT INTO chat_messages (user_id, session_id, role, content, department, subject) VALUES ($1, $2, 'user', $3, $4, $5)`,
      [userId, activeSession, message.trim(), department || null, subject || null]
    );

    let reply;

    // Build difficulty instruction
    const difficultyMap = {
      easy: 'Respond at a beginner-friendly level. Use simple language, analogies, and avoid jargon.',
      medium: 'Respond at an intermediate level. Assume basic understanding and include some technical terms with brief explanations.',
      advanced: 'Respond at an advanced academic level. Use precise technical terminology, include proofs/derivations where relevant, and reference deeper concepts.',
    };
    const difficultyInstruction = difficultyMap[(difficulty || '').toLowerCase()] || '';

    if (groqClient || genAI) {
      try {
        // Fetch recent conversation history for context
        const history = await db.query(
          `SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10`,
          [activeSession]
        );

        const conversationContext = history.rows.reverse().map(m =>
          `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`
        ).join('\n\n');

        const contextInfo = [];
        if (department) contextInfo.push(`Department: ${department}`);
        if (subject) contextInfo.push(`Subject: ${subject}`);
        if (difficultyInstruction) contextInfo.push(`Difficulty Level: ${difficulty}`);
        const contextStr = contextInfo.length > 0 ? `\nStudent Context: ${contextInfo.join(', ')}` : '';

        const prompt = `${difficultyInstruction ? `\n[Difficulty Instruction: ${difficultyInstruction}]\n` : ''}${contextStr}\n\nConversation so far:\n${conversationContext}\n\nStudent: ${message.trim()}`;

        const aiReply = await generateAIResponse(prompt);
        reply = aiReply || getFallbackResponse(message);
      } catch (aiError) {
        console.error('AI error:', aiError.message);
        reply = getFallbackResponse(message);
      }
    } else {
      reply = getFallbackResponse(message);
    }

    // Save assistant reply to DB
    await db.query(
      `INSERT INTO chat_messages (user_id, session_id, role, content, department, subject) VALUES ($1, $2, 'assistant', $3, $4, $5)`,
      [userId, activeSession, reply, department || null, subject || null]
    );

    res.json({
      reply,
      sessionId: activeSession,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// ─── GET /api/chatbot/history — Get user's chat sessions ───
router.get('/history', async (req, res) => {
  try {
    const sessions = await db.query(
      `SELECT session_id, 
              MIN(created_at) as started_at,
              MAX(created_at) as last_message_at,
              COUNT(*) as message_count,
              MAX(department) as department,
              MAX(subject) as subject,
              (SELECT content FROM chat_messages cm2 WHERE cm2.session_id = cm.session_id AND cm2.role = 'user' ORDER BY cm2.created_at ASC LIMIT 1) as first_message
       FROM chat_messages cm
       WHERE user_id = $1
       GROUP BY session_id
       ORDER BY MAX(created_at) DESC
       LIMIT 30`,
      [req.user.id]
    );

    res.json({ sessions: sessions.rows });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── GET /api/chatbot/session/:sessionId — Get messages for a session ───
router.get('/session/:sessionId', async (req, res) => {
  try {
    const messages = await db.query(
      `SELECT id, role, content, department, subject, created_at
       FROM chat_messages
       WHERE session_id = $1 AND user_id = $2
       ORDER BY created_at ASC`,
      [req.params.sessionId, req.user.id]
    );

    res.json({ messages: messages.rows });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// ─── POST /api/chatbot/quiz — Generate quiz on a topic ───
router.post('/quiz', async (req, res) => {
  try {
    const { topic, department, count = 5 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    if (!groqClient && !genAI) {
      return res.json({
        quiz: null,
        message: 'AI service unavailable. Try browsing question papers in the Materials section.',
      });
    }

    const quizPrompt = `Generate exactly ${count} multiple choice questions on the topic: "${topic}"${department ? ` (Department: ${department})` : ''}.

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "topic": "${topic}",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct": "A",
      "explanation": "Brief explanation why A is correct."
    }
  ]
}`;

    const rawText = await generateAIResponse(quizPrompt);
    if (!rawText) {
      return res.json({ quiz: null, message: 'AI quota exceeded. Please try again in a minute.' });
    }
    const text = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let quiz;
    try {
      quiz = JSON.parse(text);
    } catch {
      quiz = null;
    }

    res.json({ quiz, raw: quiz ? undefined : text });
  } catch (error) {
    console.error('Quiz error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// ─── POST /api/chatbot/summarize — Summarize notes ───
router.post('/summarize', async (req, res) => {
  try {
    const { text, department } = req.body;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Please provide at least 50 characters of text to summarize' });
    }

    if (!groqClient && !genAI) {
      return res.json({
        summary: null,
        message: 'AI service unavailable. Please try again later.',
      });
    }

    const sumPrompt = `The student has shared the following notes${department ? ` (Department: ${department})` : ''}. Please:
1. Provide a **concise summary** (3-5 paragraphs)
2. List **key points** as bullet points
3. Generate **5 possible exam questions** (mix of 2-mark, 5-mark, and 10-mark)

Here are the notes:
---
${text.trim().substring(0, 8000)}
---`;

    const aiSummary = await generateAIResponse(sumPrompt);
    if (!aiSummary) {
      return res.json({ summary: null, message: 'AI quota exceeded. Please try again in a minute.' });
    }
    const summary = aiSummary;

    res.json({ summary });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize' });
  }
});

// ─── POST /api/chatbot/viva — Viva preparation mode ───
router.post('/viva', async (req, res) => {
  try {
    const { topic, department, subject, difficulty = 'medium', count = 10 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    if (!groqClient && !genAI) {
      return res.json({
        viva: null,
        message: 'AI service unavailable. Please try again later.',
      });
    }

    const difficultyMap = {
      easy: 'basic/beginner-level',
      medium: 'intermediate-level',
      advanced: 'advanced/deep-level',
    };
    const level = difficultyMap[difficulty.toLowerCase()] || 'intermediate-level';

    const vivaPrompt = `You are a college professor conducting a viva voce (oral exam). Generate exactly ${count} viva questions on the topic: "${topic}"${department ? ` (Department: ${department})` : ''}${subject ? ` (Subject: ${subject})` : ''}.

Difficulty: ${level}

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Viva question text?",
      "expected_answer": "Concise model answer that a student should give.",
      "follow_up": "A possible follow-up question the examiner might ask.",
      "tip": "Brief tip on how to answer this confidently."
    }
  ]
}`;

    const rawText = await generateAIResponse(vivaPrompt);
    if (!rawText) {
      return res.json({ viva: null, message: 'AI quota exceeded. Please try again in a minute.' });
    }
    const text = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let viva;
    try {
      viva = JSON.parse(text);
    } catch {
      viva = null;
    }

    res.json({ viva, raw: viva ? undefined : text });
  } catch (error) {
    console.error('Viva error:', error);
    res.status(500).json({ error: 'Failed to generate viva questions' });
  }
});

module.exports = router;
