import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { askQuestion } from '../utils/mockApi';
import { marked } from 'marked';

function TypingIndicator() {
    return (
        <div className="message ai">
            <div className="avatar ai">AI</div>
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
            <div className="message ai">
                <div className="avatar ai">AI</div>
                <div className="message-content">
                    <div className="message-bubble">
                        <div className="not-found-block">
                            <div>
                                <div style={{ fontWeight: 600 }}>Not found in your notes for "{data.subjectName}"</div>
                                <div style={{ fontSize: '0.79rem', marginTop: 4, opacity: 0.85 }}>
                                    The uploaded notes don't contain sufficient information to answer this question.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="message-time">{msg.time}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="message ai">
            <div className="avatar ai">AI</div>
            <div className="message-content">
                <div className="message-bubble">
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(data?.answer || '') }} />

                    <div className="answer-meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`confidence-badge ${data?.confidence?.toLowerCase()}`}>
                                {data?.confidence} Confidence
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {data?.citations?.length || 0} source{(data?.citations?.length || 0) !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {data?.evidence?.length > 0 && (
                            <div className="evidence-block">
                                <div className="evidence-label">Supporting Evidence</div>
                                {data.evidence.map((e, i) => (
                                    <div key={i} className="evidence-snippet">{e}</div>
                                ))}
                            </div>
                        )}

                        {data?.citations?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sources:</span>
                                {data.citations.map((c, i) => (
                                    <span key={i} className="citation">{c}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="message-time">{msg.time}</div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    const { subjects, activeSubjectId, setActiveSubjectId, activeSubject, addMessage, setCurrentPage, isSetupComplete } = useApp();
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeSubject?.chatHistory, isTyping]);

    const handleSend = async () => {
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
                text: '',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                data: {
                    answer: `⚠️ Error: ${err.message}. Make sure the backend server is running.`,
                    confidence: 'Low',
                    evidence: [],
                    citations: [],
                },
            });
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    if (!isSetupComplete) {
        return (
            <div className="chat-layout">
                <div className="empty-state">
                    <h3>Setup not complete</h3>
                    <p>Name all 3 subjects in Setup before starting a chat session.</p>
                    <button className="btn btn-primary" onClick={() => setCurrentPage('setup')}>Go to Setup</button>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-layout">
            <div className="chat-header">
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select subject</div>
                    <div className="subject-selector">
                        {subjects.map(s => (
                            <button
                                key={s.id}
                                className={`subject-tab ${activeSubjectId === s.id ? 'active' : ''}`}
                                onClick={() => setActiveSubjectId(s.id)}
                            >
                                {s.name}
                                {s.files.length > 0 && <span className="badge">{s.files.length}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {activeSubject?.files.length || 0} notes · scoped to {activeSubject?.name}
                </div>
            </div>

            <div className="chat-messages">
                {activeSubject?.chatHistory.length === 0 && !isTyping && (
                    <div className="empty-state">
                        <h3>Ask anything about {activeSubject?.name}</h3>
                        <p>
                            Answers are sourced strictly from your uploaded notes.
                            {activeSubject?.files.length === 0 &&
                                <span style={{ display: 'block', marginTop: 6, color: 'var(--accent-orange)' }}>No files uploaded yet.</span>
                            }
                        </p>
                        <div style={{ display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['Summarize key concepts', 'What are the main topics?'].map(q => (
                                <button key={q} className="btn btn-secondary btn-sm" onClick={() => { setInputText(q); textareaRef.current?.focus(); }}>
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeSubject?.chatHistory.map((msg, i) => {
                    if (msg.role === 'user') {
                        return (
                            <div key={i} className="message user">
                                <div className="avatar user">U</div>
                                <div className="message-content">
                                    <div className="message-bubble">{msg.text}</div>
                                    <div className="message-time">{msg.time}</div>
                                </div>
                            </div>
                        );
                    }
                    return <AnswerMessage key={i} msg={msg} />;
                })}

                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <div className="chat-input-row">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder={`Ask about ${activeSubject?.name}...`}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isTyping}
                    />
                    <button className="send-btn" onClick={handleSend} disabled={!inputText.trim() || isTyping}>↑</button>
                </div>
                <div className="chat-hint">
                    Enter to send · Shift+Enter for new line · Answers scoped to {activeSubject?.name}
                </div>
            </div>
        </div>
    );
}
