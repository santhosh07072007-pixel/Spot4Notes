import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSend, FiPlus, FiClock, FiTrash2, FiBookOpen, FiFileText, FiHelpCircle, FiChevronLeft, FiMic } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { chatbotAPI, departmentsAPI } from '../lib/api';

export default function Chatbot() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [activeTab, setActiveTab] = useState('chat'); // chat | quiz | summarize | viva
  const [quizTopic, setQuizTopic] = useState('');
  const [quizData, setQuizData] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [summarizeText, setSummarizeText] = useState('');
  const [summaryResult, setSummaryResult] = useState('');
  const [vivaTopic, setVivaTopic] = useState('');
  const [vivaData, setVivaData] = useState(null);
  const [vivaRevealed, setVivaRevealed] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments || data || [])),
      chatbotAPI.getHistory().then(({ data }) => setSessions(data.sessions || [])),
    ]).catch(() => {});
  }, []);

  // Pre-populate from URL params (when coming from MaterialDetail "Ask AI" link)
  useEffect(() => {
    const urlDept = searchParams.get('department');
    const urlSubject = searchParams.get('subject');
    const urlMaterialId = searchParams.get('materialId');
    if (urlDept) setSelectedDept(urlDept);
    if (urlSubject) setSubject(urlSubject);
    if (urlMaterialId) {
      // Auto-send intro message about the material
      setInput(`Help me understand material #${urlMaterialId}${urlSubject ? ` (${urlSubject})` : ''}`);
    }
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const loadSession = async (sid) => {
    try {
      const { data } = await chatbotAPI.getSession(sid);
      setMessages((data.messages || []).map(m => ({ role: m.role, content: m.content })));
      setSessionId(sid);
      setShowHistory(false);
    } catch {}
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const payload = { message: msg, sessionId };
      if (selectedDept) payload.department = selectedDept;
      if (subject) payload.subject = subject;
      if (difficulty) payload.difficulty = difficulty;
      const urlMaterialId = searchParams.get('materialId');
      if (urlMaterialId) payload.materialId = urlMaterialId;

      const { data } = await chatbotAPI.chat(payload);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.sessionId) setSessionId(data.sessionId);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process your request. Please try again." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const generateQuiz = async () => {
    if (!quizTopic.trim() || loading) return;
    setLoading(true);
    setQuizData(null);
    setQuizAnswers({});
    setQuizRevealed(false);

    try {
      const { data } = await chatbotAPI.generateQuiz({ topic: quizTopic, department: selectedDept });
      if (data.quiz) {
        setQuizData(data.quiz);
      } else {
        setQuizData({ error: data.message || 'Could not generate quiz' });
      }
    } catch {
      setQuizData({ error: 'Failed to generate quiz. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const summarizeNotes = async () => {
    if (summarizeText.trim().length < 50 || loading) return;
    setLoading(true);
    setSummaryResult('');

    try {
      const { data } = await chatbotAPI.summarize({ text: summarizeText, department: selectedDept });
      setSummaryResult(data.summary || data.message || 'Could not summarize.');
    } catch {
      setSummaryResult('Failed to summarize. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateViva = async () => {
    if (!vivaTopic.trim() || loading) return;
    setLoading(true);
    setVivaData(null);
    setVivaRevealed({});

    try {
      const { data } = await chatbotAPI.generateViva({
        topic: vivaTopic,
        department: selectedDept,
        subject,
        difficulty,
      });
      if (data.viva) {
        setVivaData(data.viva);
      } else {
        setVivaData({ error: data.message || 'Could not generate viva questions' });
      }
    } catch {
      setVivaData({ error: 'Failed to generate viva questions. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const welcomeMessage = {
    role: 'assistant',
    content: `Hello! 👋 I'm the **Spot4Notes AI Study Assistant**.

I'm here to help you ace your academics! Here's what I can do:

- 💡 **Explain concepts** — Ask me anything academic
- 📝 **Practice questions** — Say "give important questions on [topic]"
- 🧠 **Quiz me** — Use the Quiz tab to generate MCQs
- 📋 **Summarize notes** — Use the Summarize tab to condense your notes
- 🎯 **Exam tips** — Ask for study strategies

What would you like help with today?`,
  };

  const displayMessages = messages.length === 0 ? [welcomeMessage] : messages;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-4 h-[calc(100vh-10rem)]">
        {/* Sidebar — History */}
        <div className={`${showHistory ? 'flex' : 'hidden'} md:flex flex-col w-72 bg-white rounded-xl border border-gray-200 overflow-hidden flex-shrink-0`}>
          <div className="p-4 border-b border-gray-100">
            <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              <FiPlus size={16} /> New Chat
            </button>
          </div>

          {/* Context selectors */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="easy">Easy / Beginner</option>
              <option value="medium">Medium / Intermediate</option>
              <option value="advanced">Advanced / Expert</option>
            </select>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-2 mb-2">Recent Chats</p>
              {sessions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No chat history yet</p>
              )}
              {sessions.map((s) => (
                <button
                  key={s.session_id}
                  onClick={() => loadSession(s.session_id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-gray-50 ${
                    sessionId === s.session_id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`}
                >
                  <p className="truncate font-medium text-xs">{s.first_message || 'Chat session'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <FiClock size={10} />
                    {new Date(s.last_message_at).toLocaleDateString()}
                    {s.department && <span className="ml-1">• {s.department}</span>}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden min-w-0">
          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 bg-gray-50/50">
            <button className="md:hidden p-3 text-gray-500 hover:text-gray-700" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? <FiChevronLeft size={18} /> : <FiClock size={18} />}
            </button>
            {[
              { id: 'chat', label: 'Chat', icon: FiBookOpen },
              { id: 'quiz', label: 'Quiz', icon: FiHelpCircle },
              { id: 'viva', label: 'Viva Prep', icon: FiMic },
              { id: 'summarize', label: 'Summarize', icon: FiFileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── Chat Tab ─── */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
                {displayMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-md'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-3 prose-ul:my-1 prose-ol:my-1 prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-gray-900 prose-pre:text-gray-100">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts */}
              {messages.length === 0 && (
                <div className="px-4 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Explain OOP concepts',
                      'Important questions on DBMS',
                      'What is machine learning?',
                      'Study tips for exams',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                        className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-xs font-medium hover:bg-primary-100 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything academic..."
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiSend size={18} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── Quiz Tab ─── */}
          {activeTab === 'quiz' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">🧠 Quiz Generator</h2>
                <p className="text-sm text-gray-500">Enter a topic and I'll generate MCQs for you to practice</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="e.g., Data Structures, Thermodynamics, Marketing..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && generateQuiz()}
                />
                <button
                  onClick={generateQuiz}
                  disabled={!quizTopic.trim() || loading}
                  className="btn-primary !py-2.5 !rounded-xl"
                >
                  {loading ? 'Generating...' : 'Generate Quiz'}
                </button>
              </div>

              {quizData?.error && (
                <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-4 text-sm">{quizData.error}</div>
              )}

              {quizData?.questions && (
                <div className="space-y-5">
                  <h3 className="font-semibold text-gray-800">Quiz: {quizData.topic}</h3>
                  {quizData.questions.map((q, qi) => (
                    <div key={qi} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <p className="font-medium text-gray-900 mb-3">Q{qi + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const letter = opt.charAt(0);
                          const isSelected = quizAnswers[qi] === letter;
                          const isCorrect = letter === q.correct;
                          const showResult = quizRevealed;
                          return (
                            <button
                              key={oi}
                              onClick={() => !quizRevealed && setQuizAnswers(prev => ({ ...prev, [qi]: letter }))}
                              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-all ${
                                showResult && isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : showResult && isSelected && !isCorrect
                                    ? 'bg-red-50 border-red-300 text-red-800'
                                    : isSelected
                                      ? 'bg-primary-50 border-primary-300 text-primary-800'
                                      : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {quizRevealed && q.explanation && (
                        <p className="mt-3 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-4">
                    {!quizRevealed ? (
                      <button onClick={() => setQuizRevealed(true)} className="btn-primary">
                        Show Answers
                      </button>
                    ) : (
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-600">
                          Score:{' '}
                          <span className={`font-bold text-lg ${getScoreColor(
                            (Object.entries(quizAnswers).filter(([qi, a]) => a === quizData.questions[qi]?.correct).length / quizData.questions.length) * 100
                          )}`}>
                            {Object.entries(quizAnswers).filter(([qi, a]) => a === quizData.questions[qi]?.correct).length}/{quizData.questions.length}
                          </span>
                        </p>
                        <button onClick={() => { setQuizData(null); setQuizAnswers({}); setQuizRevealed(false); }} className="btn-secondary !py-2 text-sm">
                          Try Another Quiz
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!quizData && !loading && (
                <div className="text-center py-10 text-gray-400">
                  <FiHelpCircle size={40} className="mx-auto mb-3" />
                  <p className="text-sm">Enter a topic above to generate practice MCQs</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Viva Prep Tab ─── */}
          {activeTab === 'viva' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">🎤 Viva Preparation</h2>
                <p className="text-sm text-gray-500">Generate viva questions with model answers, follow-ups, and tips</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={vivaTopic}
                  onChange={(e) => setVivaTopic(e.target.value)}
                  placeholder="e.g., Operating Systems, Digital Electronics..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && generateViva()}
                />
                <button
                  onClick={generateViva}
                  disabled={!vivaTopic.trim() || loading}
                  className="btn-primary !py-2.5 !rounded-xl"
                >
                  {loading ? 'Generating...' : 'Generate Viva'}
                </button>
              </div>

              {vivaData?.questions && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Viva: {vivaData.topic} ({vivaData.difficulty})</h3>
                  {vivaData.questions.map((q, qi) => (
                    <div key={qi} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <p className="font-medium text-gray-900 mb-3">Q{qi + 1}. {q.question}</p>
                      <button
                        onClick={() => setVivaRevealed(prev => ({ ...prev, [qi]: !prev[qi] }))}
                        className="text-xs text-primary-600 font-medium hover:text-primary-700 mb-2"
                      >
                        {vivaRevealed[qi] ? 'Hide Answer' : 'Show Answer'}
                      </button>
                      {vivaRevealed[qi] && (
                        <div className="space-y-2 mt-2">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-emerald-700 mb-1">Expected Answer:</p>
                            <p className="text-sm text-emerald-800">{q.expected_answer}</p>
                          </div>
                          {q.follow_up && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                              <p className="text-xs font-semibold text-blue-700 mb-1">Follow-up Question:</p>
                              <p className="text-sm text-blue-800">{q.follow_up}</p>
                            </div>
                          )}
                          {q.tip && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                              <p className="text-xs font-semibold text-amber-700 mb-1">💡 Tip:</p>
                              <p className="text-sm text-amber-800">{q.tip}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => { setVivaData(null); setVivaRevealed({}); }} className="btn-secondary !py-2 text-sm">
                    Try Another Topic
                  </button>
                </div>
              )}

              {vivaData?.error && (
                <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-4 text-sm">{vivaData.error}</div>
              )}

              {!vivaData && !loading && (
                <div className="text-center py-10 text-gray-400">
                  <FiMic size={40} className="mx-auto mb-3" />
                  <p className="text-sm">Enter a topic above to generate viva practice questions</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Summarize Tab ─── */}
          {activeTab === 'summarize' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">📋 Notes Summarizer</h2>
                <p className="text-sm text-gray-500">Paste your notes below and I'll summarize them with key points and possible exam questions</p>
              </div>

              <textarea
                value={summarizeText}
                onChange={(e) => setSummarizeText(e.target.value)}
                placeholder="Paste your notes here..."
                className="w-full h-48 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={summarizeNotes}
                  disabled={summarizeText.trim().length === 0 || loading}
                  className="btn-primary"
                >
                  {loading ? 'Summarizing...' : 'Summarize Notes'}
                </button>

              </div>

              {summaryResult && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-6">
                  <div className="prose prose-sm max-w-none prose-headings:mb-2 prose-headings:mt-3 prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-code:text-xs">
                    <ReactMarkdown>{summaryResult}</ReactMarkdown>
                  </div>
                </div>
              )}

              {!summaryResult && !loading && (
                <div className="text-center py-10 text-gray-400">
                  <FiFileText size={40} className="mx-auto mb-3" />
                  <p className="text-sm">Paste your study notes above to get a summary</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
