import { useState, useEffect, useRef } from 'react';
import mascotImg from '../assets/Screenshot 2026-02-26 at 18.28.04.png';
import { useApp } from '../context/AppContext';
import { generateStudyContent, askQuestion } from '../utils/mockApi';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import {
    BookOpen, FileText, Zap, Sparkles, MessageSquare,
    RefreshCw, FileDown, Send, Bot, User,
    CheckCircle2, AlertCircle, Quote, Eye, EyeOff, SearchX, ShieldCheck
} from 'lucide-react';

// --- MCQ Components ---
function MCQCard({ q, index }) {
    const [selected, setSelected] = useState(null);
    const [revealed, setRevealed] = useState(false);

    const handleOption = (key) => {
        if (selected) return;
        setSelected(key);
        setRevealed(true);
    };

    return (
        <div className="mcq-card animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="mcq-num">{index + 1}</div>
            <div className="mcq-question">{q.question}</div>
            <div className="mcq-options">
                {q.options.map((opt, i) => {
                    const key = String.fromCharCode(65 + i);
                    let cls = 'mcq-option';
                    if (revealed && key === q.correctKey) cls += ' correct';
                    else if (selected === key && key !== q.correctKey) cls += ' selected-wrong';

                    return (
                        <div key={key} className={cls} onClick={() => handleOption(key)}>
                            <div className="option-key">{key}</div>
                            <span>{opt}</span>
                        </div>
                    );
                })}
            </div>

            {revealed && (
                <div className="answer-reveal">
                    <div className="ans-label">Explanation</div>
                    <div className="ans-text">{q.explanation}</div>
                    {q.citation && <span className="citation" style={{ display: 'inline-flex', marginTop: 6 }}>{q.citation}</span>}
                </div>
            )}
        </div>
    );
}

function ShortAnsCard({ q, index }) {
    const [revealed, setRevealed] = useState(false);

    return (
        <div className="short-ans-card animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                <div className="mcq-num" style={{ background: '#ebfbee', color: 'var(--accent-green)' }}>{index + 1}</div>
            </div>
            <div className="short-ans-q">{q.question}</div>
            <button
                className={`btn btn-sm ${revealed ? 'btn-ghost' : 'btn-secondary'}`}
                onClick={() => setRevealed(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
                {revealed ? <><EyeOff size={14} /> Hide answer</> : <><Eye size={14} /> Show model answer</>}
            </button>
            <div className={`short-ans-answer ${revealed ? 'visible' : ''}`}>
                <div style={{ marginBottom: 6 }}>{q.answer}</div>
                {q.citation && <span className="citation">{q.citation}</span>}
            </div>
        </div>
    );
}

// --- Chat Components ---
function TypingIndicator() {
    return (
        <div className="message ai">
            <div className="avatar ai"><Bot size={16} /></div>
            <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
            </div>
        </div>
    );
}

function AnswerMessage({ msg }) {
    const data = msg.data;
    if (data?.notFound) {
        return (
            <div className="message-content">
                <div className="message-bubble">
                    <div className="not-found-block" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <SearchX size={20} color="var(--accent-red)" style={{ marginTop: 2 }} />
                        <div>
                            <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>NOT FOUND IN YOUR NOTES</div>
                            <div style={{ fontSize: '0.79rem', marginTop: 4, opacity: 0.85 }}>
                                The uploaded notes don't contain sufficient information to answer this question.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="message-content">
            <div className="message-bubble">
                <div dangerouslySetInnerHTML={{ __html: marked.parse(data?.answer || '') }} />
                <div className="answer-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={`confidence-badge ${data?.confidence?.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ShieldCheck size={12} /> {data?.confidence}
                        </span>
                    </div>
                    {data?.evidence?.length > 0 && (
                        <div className="evidence-block">
                            <div className="evidence-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Quote size={10} /> SUPPORTING EVIDENCE
                            </div>
                            {data.evidence.map((e, i) => (
                                <div key={i} className="evidence-snippet">"{e}"</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="message-time">{msg.time}</div>
        </div>
    );
}

export default function StudyPage() {
    const { subjects, activeSubjectId, setActiveSubjectId, activeSubject, setCurrentPage, isSetupComplete, addMessage } = useApp();

    // Per-file content cache: { [fileName]: content }
    // "combined" key is used for all files together
    const [contentCache, setContentCache] = useState({});
    const [selectedFileName, setSelectedFileName] = useState('combined');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const content = contentCache[selectedFileName] || null;


    // Chat state
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-generate content when subject or selected file changes
    useEffect(() => {
        setError('');
        if (activeSubject && activeSubject.name && activeSubject.files.length > 0) {
            // If we don't have content for the current selection, generate it
            if (!contentCache[selectedFileName]) {
                handleGenerate(selectedFileName);
            }
        }
    }, [activeSubjectId, selectedFileName]);

    // Reset selection when subject changes
    useEffect(() => {
        setSelectedFileName('combined');
        setContentCache({});
    }, [activeSubjectId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeSubject?.chatHistory, isTyping]);

    const handleGenerate = async (fileName = selectedFileName) => {
        setLoading(true);
        setError('');
        const fn = fileName === 'combined' ? undefined : fileName;
        try {
            const result = await generateStudyContent(activeSubjectId, activeSubject?.name, fn);
            setContentCache(prev => ({
                ...prev,
                [fileName]: result
            }));
        } catch (err) {
            console.error('Study mode error:', err);
            setError(err.message || 'Failed to generate study content.');
        } finally {
            setLoading(false);
        }
    };

    const handleChatSend = async () => {
        const text = inputText.trim();
        if (!text || isTyping) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        addMessage(activeSubjectId, { role: 'user', text, time });
        setInputText('');
        setIsTyping(true);

        try {
            const response = await askQuestion(activeSubjectId, text, activeSubject?.name);
            addMessage(activeSubjectId, {
                role: 'ai',
                text: response.answer || '',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                data: response,
            });
        } catch (err) {
            console.error('Chat error:', err);
            addMessage(activeSubjectId, {
                role: 'ai',
                text: `⚠️ Error: ${err.message}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                data: { answer: `Error: ${err.message}`, confidence: 'Low' }
            });
        } finally {
            setIsTyping(false);
        }
    };

    const downloadPDF = () => {
        if (!content) return;

        const doc = new jsPDF();
        let yPos = 20;

        // Title
        doc.setFontSize(22);
        doc.setTextColor(67, 97, 238);
        doc.text(`Study Notes: ${activeSubject?.name}`, 20, yPos);
        yPos += 15;

        // Body text helper
        const addSection = (title, text) => {
            if (yPos > 250) { doc.addPage(); yPos = 20; }
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text(title, 20, yPos);
            yPos += 10;

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            const splitText = doc.splitTextToSize(text.replace(/[#*]/g, ''), 170);
            doc.text(splitText, 20, yPos);
            yPos += (splitText.length * 6) + 10;
        };

        if (content.notes) {
            addSection("Key Concepts", content.notes);
        }

        if (content.mcqs && content.mcqs.length > 0) {
            let mcqText = content.mcqs.map((q, i) =>
                `${i + 1}. ${q.question}\nOptions: ${q.options.join(', ')}\nCorrect Answer: ${q.correctKey}\nExplanation: ${q.explanation}\n`
            ).join('\n');
            addSection("Multiple Choice Questions", mcqText);
        }

        doc.save(`${activeSubject?.name}_Study_Notes.pdf`);
    };

    if (!isSetupComplete) {
        return (
            <div className="page-content">
                <div className="empty-state" style={{ paddingTop: 80 }}>
                    <AlertCircle size={48} color="var(--accent-red)" style={{ marginBottom: 20 }} />
                    <h3>Setup not complete</h3>
                    <p>Name at least one subject before using Subject Dashboard.</p>
                    <button className="btn btn-primary" onClick={() => setCurrentPage('setup')}>Go to Setup</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="study-header">
                <div>
                    <div className="study-title">{activeSubject?.name || 'Subject Dashboard'}</div>
                    <div className="study-subtitle">Auto-generated notes, quizzes, and grounded Q&A</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {subjects.filter(s => s.name).map(s => (
                        <button
                            key={s.id}
                            className={`subject-tab ${activeSubjectId === s.id ? 'active' : ''}`}
                            onClick={() => setActiveSubjectId(s.id)}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>

            {loading && !content && (
                <div className="empty-state" style={{ paddingTop: '5vh' }}>
                    <div className="ai-loader" style={{ marginBottom: 32 }}>
                        <img src={mascotImg} alt="Mascot" style={{ width: 180, height: 180, borderRadius: '50%', border: '2px solid var(--accent-neon)', boxShadow: 'var(--glow)', objectFit: 'cover' }} />
                    </div>
                    <h3 style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-neon)', textTransform: 'uppercase' }}>ANALYZING MATERIAL...</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Generating subject dashboard and practice questions.</p>
                </div>
            )}

            {error && <div className="error-alert">{error}</div>}

            {activeSubject?.files.length === 0 && (
                <div className="empty-state">
                    <h3>No files uploaded for {activeSubject?.name}</h3>
                    <p>Upload your notes in the Setup tab to unlock the dashboard features.</p>
                    <button className="btn btn-secondary" onClick={() => setCurrentPage('setup')}>Go to Setup</button>
                </div>
            )}

            {content && (
                <div className="study-container animate-fade-in">
                    {activeSubject?.files.length > 1 && (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                                Generate for:
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    className={`subject-tab ${selectedFileName === 'combined' ? 'active' : ''}`}
                                    onClick={() => setSelectedFileName('combined')}
                                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                >
                                    All Files Combined
                                </button>
                                {activeSubject.files.map((file, idx) => (
                                    <button
                                        key={idx}
                                        className={`subject-tab ${selectedFileName === file.name ? 'active' : ''}`}
                                        onClick={() => setSelectedFileName(file.name)}
                                        style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                    >
                                        <FileText size={12} style={{ marginRight: 4, opacity: 0.7 }} />
                                        {file.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleGenerate(selectedFileName)} disabled={loading}>
                            {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            {loading ? 'REGENERATING...' : selectedFileName === 'combined' ? 'REGENERATE ALL' : `REGENERATE FOR ${selectedFileName.toUpperCase()}`}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={downloadPDF}>
                            <FileDown size={14} /> DOWNLOAD PDF
                        </button>
                    </div>

                    {/* --- Section 1: Auto-generated Short Notes --- */}
                    <div className="study-section">
                        <div className="questions-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={18} color="var(--accent-neon)" /> Subject Summary & Key Notes
                        </div>
                        <div className="notes-content card glass" style={{ borderLeft: '4px solid var(--accent-neon)' }}>
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(content.notes || '_The AI could not generate a summary for this specific material. Try uploading more detailed notes._') }} />
                        </div>
                    </div>

                    {/* --- Section 2: MCQs --- */}
                    <div className="study-section" style={{ marginTop: 32 }}>
                        <div className="questions-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Zap size={18} color="var(--accent-neon)" /> Practice Quiz (MCQs)
                        </div>
                        {(content.mcqs || []).map((q, i) => <MCQCard key={i} q={q} index={i} />)}
                    </div>

                    {/* --- Section 3: Short Answer --- */}
                    <div className="study-section" style={{ marginTop: 32 }}>
                        <div className="questions-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Sparkles size={18} color="var(--accent-neon)" /> Key Flashcards
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                            {(content.shortAnswer || []).map((q, i) => <ShortAnsCard key={i} q={q} index={i} />)}
                        </div>
                    </div>

                    {/* --- Section 4: Chat --- */}
                    <div className="study-section chat-integration" style={{ marginTop: 48, borderTop: '2px solid var(--border)', paddingTop: 32 }}>
                        <div className="questions-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <MessageSquare size={18} color="var(--accent-neon)" /> Ask My Notes — AI Q&A
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Got a specific question? Ask the AI, and it will answer strictly based on your uploaded notes.
                        </p>

                        <div className="integrated-chat-history card glass" style={{ height: '450px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 5px' }}>
                                {activeSubject?.chatHistory.length === 0 && !isTyping && (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                                        <img src={mascotImg} alt="Mascot" style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 16, border: '1px solid var(--border)', opacity: 0.8 }} />
                                        <p style={{ fontSize: '0.85rem', maxWidth: '240px' }}>Ask anything like "Explain the second chapter" or "What are the key topics?"</p>
                                    </div>
                                )}
                                {activeSubject?.chatHistory.map((msg, i) => (
                                    <div key={i} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`} style={{ marginBottom: 16 }}>
                                        <div className={`avatar ${msg.role}`}>{msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}</div>
                                        {msg.role === 'user' ? (
                                            <div className="message-content">
                                                <div className="message-bubble">{msg.text}</div>
                                                <div className="message-time">{msg.time}</div>
                                            </div>
                                        ) : (
                                            <AnswerMessage msg={msg} />
                                        )}
                                    </div>
                                ))}
                                {isTyping && <TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="chat-input-area" style={{ border: 'none', padding: '12px 0 0 0' }}>
                                <div className="chat-input-row">
                                    <textarea
                                        ref={textareaRef}
                                        rows={1}
                                        placeholder={`Ask about ${activeSubject?.name}...`}
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                                        disabled={isTyping}
                                    />
                                    <button className="send-btn" onClick={handleChatSend} disabled={!inputText.trim() || isTyping}>
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
