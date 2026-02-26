import { useState, useRef, useEffect } from 'react';
import mascotImg from '../assets/Screenshot 2026-02-26 at 18.28.04.png';
import { useApp } from '../context/AppContext';
import { askQuestion } from '../utils/mockApi';
import api from '../utils/api';
import { marked } from 'marked';
import {
    Send, Bot, User, MessageSquare, ShieldCheck,
    Link, FileText, AlertCircle, ChevronRight, SearchX,
    Mic, MicOff, Upload, Volume2, VolumeX
} from 'lucide-react';

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

function AnswerMessage({ msg, onSpeak }) {
    const data = msg.data;

    if (data?.notFound) {
        return (
            <div className="message ai">
                <div className="avatar ai"><SearchX size={16} /></div>
                <div className="message-content">
                    <div className="message-bubble">
                        <div className="not-found-block" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <SearchX size={20} color="var(--accent-red)" style={{ marginTop: 2, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>NOT FOUND IN YOUR NOTES FOR "{data.subjectName}"</div>
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
            <div className="avatar ai"><Bot size={16} /></div>
            <div className="message-content">
                <div className="message-bubble">
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(data?.answer || '') }} />

                    <div className="answer-meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className={`confidence-badge ${data?.confidence?.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ShieldCheck size={12} /> {data?.confidence}
                            </span>
                            {data?.answer && (
                                <button
                                    className="voice-action-btn"
                                    onClick={() => onSpeak(data.answer)}
                                    title="Speak this answer"
                                >
                                    <Volume2 size={14} /> Speak
                                </button>
                            )}
                        </div>

                        {data?.evidence?.length > 0 && (
                            <div className="evidence-block">
                                <div className="evidence-label">SUPPORTING EVIDENCE</div>
                                {data.evidence.map((e, i) => (
                                    <div key={i} className="evidence-snippet">"{e}"</div>
                                ))}
                            </div>
                        )}

                        {data?.citations?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>SOURCES:</span>
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

    // Voice input state
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioInputRef = useRef(null);

    // TTS state
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeSubject?.chatHistory, isTyping]);

    // ── Text-to-Speech ──────────────────────────────────────
    const speakText = (text) => {
        // Strip markdown for cleaner speech
        const plainText = text
            .replace(/[#*_`~>\-\[\]()!]/g, '')
            .replace(/\n+/g, '. ')
            .trim();

        if (!plainText) return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.rate = 1;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Samantha'))
            || voices.find(v => v.name.includes('Google'))
            || voices.find(v => v.lang.startsWith('en'));
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // ── Transcribe audio blob → text ────────────────────────
    const transcribeAudio = async (blob) => {
        setIsTranscribing(true);
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');

            const response = await api.post('/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data.text;
        } catch (err) {
            console.error('Transcription error:', err);
            return null;
        } finally {
            setIsTranscribing(false);
        }
    };

    // ── Send question (text) → API → speak response ─────────
    const handleSend = async (overrideText) => {
        const text = (overrideText || inputText).trim();
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

            // Auto-speak the response if it came from voice input
            if (overrideText && response.answer && !response.notFound) {
                speakText(response.answer);
            }
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

    // ── Mic Recording ───────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                clearInterval(timerRef.current);
                setRecordingTime(0);

                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const text = await transcribeAudio(blob);

                if (text) {
                    // Auto-send the transcribed text
                    await handleSend(text);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            alert('Microphone access denied. Please allow microphone permissions.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        clearInterval(timerRef.current);
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // ── Upload Audio File ───────────────────────────────────
    const handleAudioUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const text = await transcribeAudio(file);
        if (text) {
            await handleSend(text);
        }

        // Reset file input
        e.target.value = '';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const formatTime = (seconds) => {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    if (!isSetupComplete) {
        return (
            <div className="chat-layout">
                <div className="empty-state">
                    <AlertCircle size={48} color="var(--accent-red)" style={{ marginBottom: 20 }} />
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
                                <FileText size={14} style={{ marginRight: 6, opacity: 0.7 }} />
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
                        <img src={mascotImg} alt="Mascot" style={{ width: 140, height: 140, borderRadius: '50%', marginBottom: 24, border: '2px solid var(--accent-neon)', boxShadow: 'var(--glow)', opacity: 0.9 }} />
                        <h3>Ask anything about {activeSubject?.name}</h3>
                        <p>
                            Answers are sourced strictly from your uploaded notes.
                            {activeSubject?.files.length === 0 &&
                                <span style={{ display: 'block', marginTop: 6, color: 'var(--accent-red)' }}>No files uploaded yet.</span>
                            }
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['Summarize key concepts', 'What are the main topics?'].map(q => (
                                <button key={q} className="btn btn-secondary btn-sm" onClick={() => { setInputText(q); textareaRef.current?.focus(); }}>
                                    {q}
                                </button>
                            ))}
                        </div>
                        <div className="voice-hint" style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            💡 You can also use the <strong>mic button</strong> to ask questions by voice
                        </div>
                    </div>
                )}

                {activeSubject?.chatHistory.map((msg, i) => {
                    if (msg.role === 'user') {
                        return (
                            <div key={i} className="message user">
                                <div className="avatar user"><User size={16} /></div>
                                <div className="message-content">
                                    <div className="message-bubble">{msg.text}</div>
                                    <div className="message-time">{msg.time}</div>
                                </div>
                            </div>
                        );
                    }
                    return <AnswerMessage key={i} msg={msg} onSpeak={speakText} />;
                })}

                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {/* Transcribing indicator */}
            {isTranscribing && (
                <div className="transcribing-bar">
                    <div className="transcribing-spinner" />
                    <span>Converting speech to text…</span>
                </div>
            )}

            <div className="chat-input-area">
                <div className="chat-input-row">
                    {/* Mic button */}
                    <button
                        className={`voice-btn ${isRecording ? 'recording' : ''}`}
                        onClick={toggleRecording}
                        disabled={isTyping || isTranscribing}
                        title={isRecording ? 'Stop recording' : 'Record voice'}
                    >
                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    {/* Upload audio button */}
                    <button
                        className="voice-btn upload"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={isTyping || isRecording || isTranscribing}
                        title="Upload audio file"
                    >
                        <Upload size={16} />
                    </button>
                    <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={handleAudioUpload}
                    />

                    {/* Recording timer */}
                    {isRecording && (
                        <div className="recording-timer">
                            <div className="recording-dot" />
                            {formatTime(recordingTime)}
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder={`Ask about ${activeSubject?.name}...`}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isTyping || isRecording || isTranscribing}
                    />

                    <button className="send-btn" onClick={() => handleSend()} disabled={!inputText.trim() || isTyping}>
                        <Send size={18} />
                    </button>

                    {/* Stop speaking button */}
                    {isSpeaking && (
                        <button
                            className="voice-btn stop-speak"
                            onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); }}
                            title="Stop speaking"
                        >
                            <VolumeX size={18} />
                        </button>
                    )}
                </div>
                <div className="chat-hint">
                    Enter to send · Shift+Enter for new line · 🎤 Record or upload audio · Answers scoped to {activeSubject?.name}
                </div>
            </div>
        </div>
    );
}
