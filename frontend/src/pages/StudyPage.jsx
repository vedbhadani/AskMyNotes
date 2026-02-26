import { useState, useEffect, useRef } from 'react';
import mascotImg from '../assets/Screenshot 2026-02-26 at 18.28.04.png';
import { useApp } from '../context/AppContext';
import { generateStudyContent, askQuestion, fetchFileContent } from '../utils/mockApi';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import {
    BookOpen, FileText, Zap, Sparkles, MessageSquare,
    RefreshCw, FileDown, Send, Bot, User,
    CheckCircle2, AlertCircle, Quote, Eye, EyeOff, SearchX, ShieldCheck, X
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


export default function StudyPage() {
    const { subjects, activeSubjectId, setActiveSubjectId, activeSubject, setCurrentPage, isSetupComplete, addMessage, updateSubject } = useApp();

    const [selectedFileName, setSelectedFileName] = useState(activeSubject?.files[0]?.name || 'default');
    const quizRef = useRef(null);
    const contentCache = activeSubject?.contentCache || {};

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const content = contentCache[selectedFileName] || null;



    // Removed auto-generate useEffect. Manual trigger only.
    const [previewContent, setPreviewContent] = useState(null);
    const [previewingFile, setPreviewingFile] = useState(null);

    // Reset selection when subject changes
    useEffect(() => {
        if (activeSubject?.files?.length > 0) {
            setSelectedFileName(activeSubject.files[0].name);
        }
    }, [activeSubjectId]);


    const [generatingMode, setGeneratingMode] = useState(null);

    const handleGenerate = async (fileName = selectedFileName, mode = 'summarize') => {
        // Switch view immediately to show correct loading text
        setSelectedFileName(fileName);
        setLoading(true);
        setGeneratingMode(mode);
        setError('');

        const fn = fileName === 'combined' ? undefined : fileName;
        try {
            const result = await generateStudyContent(activeSubjectId, activeSubject?.name, fn, mode);

            // Merge with existing cache for this file
            const currentCache = activeSubject?.contentCache || {};
            const existingFileContent = currentCache[fileName] || {};

            const merged = {
                // If mode is 'summarize', we definitely want the new notes. 
                // If mode is 'practice', we want to keep existing notes if the new ones are empty.
                notes: (mode === 'summarize' ? result.notes : (result.notes || existingFileContent.notes)) || "",

                // If mode is 'practice', we definitely want the new MCQs/ShortAns.
                // If mode is 'summarize', we keep existing ones only if the new ones are empty/null.
                mcqs: (mode === 'practice' ? result.mcqs : (result.mcqs?.length ? result.mcqs : existingFileContent.mcqs)) || [],
                shortAnswer: (mode === 'practice' ? result.shortAnswer : (result.shortAnswer?.length ? result.shortAnswer : existingFileContent.shortAnswer)) || []
            };

            updateSubject(activeSubjectId, {
                contentCache: {
                    ...currentCache,
                    [fileName]: merged
                }
            });

            // Scroll to quiz if in practice mode
            if (mode === 'practice') {
                setTimeout(() => {
                    quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        } catch (err) {
            console.error('Study mode error:', err);
            setError(err.message || 'Failed to generate study content.');
        } finally {
            setLoading(false);
            setGeneratingMode(null);
        }
    };

    const handlePreview = async (fileName) => {
        setLoading(true);
        try {
            const data = await fetchFileContent(activeSubjectId, fileName);
            setPreviewContent(data.text);
            setPreviewingFile(fileName);
        } catch (err) {
            setError('Failed to load preview.');
        } finally {
            setLoading(false);
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
                    <h3 style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-neon)', textTransform: 'uppercase' }}>
                        {generatingMode === 'practice' ? 'GENERATING PRACTICE SET...' : 'SUMMARIZING MATERIAL...'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {generatingMode === 'practice' ? 'Creating custom MCQs and flashcards for your notes.' : 'Extracting key concepts and building your dashboard.'}
                    </p>
                </div>
            )}

            {error && <div className="error-alert">{error}</div>}

            {/* Subject Files Cards */}
            {!content && activeSubject?.files.length > 0 && (
                <div className="study-container animate-fade-in" style={{ paddingBottom: 40 }}>
                    <div style={{ marginBottom: 32 }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>{activeSubject.name} Materials</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Review your notes or start the AI analysis below.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
                        {activeSubject.files.map((file, idx) => (
                            <div key={idx} className="card glass animate-fade-in" style={{ animationDelay: `${idx * 0.1}s`, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(57, 255, 20, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={20} color="var(--accent-neon)" />
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF Document</div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 8 }}>
                                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', width: '100%' }} onClick={() => handlePreview(file.name)}>
                                        PREVIEW FILE
                                    </button>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: '0.65rem', padding: '6px 4px' }} onClick={() => handleGenerate(file.name, 'summarize')}>
                                            SUMMARIZE
                                        </button>
                                        <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: '0.65rem', padding: '6px 4px', background: 'rgba(57, 255, 20, 0.1)', color: 'var(--accent-neon)' }} onClick={() => handleGenerate(file.name, 'practice')}>
                                            PRACTICE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            )}

            {/* Preview Modal - Premium Document Viewer */}
            {previewingFile && (
                <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                    <div className="animate-slide-up" style={{ maxWidth: 900, width: '95%', height: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

                        {/* Modal Header */}
                        <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px 24px 0 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid var(--accent-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(57, 255, 20, 0.05)' }}>
                                    <FileText size={22} color="var(--accent-neon)" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: 2 }}>{previewingFile}</h3>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-neon)', fontFamily: 'JetBrains Mono, monospace', opacity: 0.8 }}>SOURCE DOCUMENT PREVIEW</div>
                                </div>
                            </div>
                            <button
                                onClick={() => { setPreviewingFile(null); setPreviewContent(null); }}
                                className="close-preview-btn"
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Document Body */}
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', background: 'rgba(10,10,10,0.4)', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                maxWidth: '750px',
                                width: '100%',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                padding: '60px 50px',
                                borderRadius: 4,
                                minHeight: '100%',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                fontFamily: '"Inter", sans-serif',
                                color: '#e0e0e0',
                                lineHeight: '1.8',
                                fontSize: '1.05rem',
                                whiteSpace: 'pre-wrap',
                                letterSpacing: '0.01em'
                            }}>
                                {previewContent || (
                                    <div style={{ height: 'min-content', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, marginTop: 100 }}>
                                        <RefreshCw size={48} className="animate-spin" style={{ marginBottom: 20 }} />
                                        <p style={{ fontFamily: 'JetBrains Mono, monospace' }}>EXTRACTING TEXT...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '16px 32px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 0 24px 24px', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                END OF DOCUMENT
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setPreviewingFile(null); setPreviewContent(null); }} style={{ padding: '8px 24px' }}>
                                EXIT READER
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {content && (
                <>
                    <div className="study-container animate-fade-in">
                        <div className="card glass control-bar" style={{ padding: '20px 24px', marginBottom: 32, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                            {activeSubject?.files.length > 1 && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <FileText size={12} /> Generate For:
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--accent-neon)', fontFamily: 'JetBrains Mono, monospace', opacity: 0.7 }}>
                                            {selectedFileName.toUpperCase()}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                                        {activeSubject.files.map((file, idx) => (
                                            <button
                                                key={idx}
                                                className={`subject-tab ${selectedFileName === file.name ? 'active' : ''}`}
                                                onClick={() => setSelectedFileName(file.name)}
                                                style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: 8 }}
                                            >
                                                {file.name}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 20 }}></div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleGenerate(selectedFileName, 'summarize')} disabled={loading} style={{ padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <RefreshCw size={14} style={{ marginRight: 8 }} className={loading && generatingMode === 'summarize' ? "animate-spin" : ""} />
                                        RE-SUMMARIZE
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleGenerate(selectedFileName, 'practice')} disabled={loading} style={{ padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <Zap size={14} style={{ marginRight: 8, color: 'var(--accent-neon)' }} className={loading && generatingMode === 'practice' ? "animate-spin" : ""} />
                                        GENERATE PRACTICE
                                    </button>
                                </div>
                                <button className="btn btn-primary btn-sm" onClick={downloadPDF} style={{ padding: '8px 20px', boxShadow: 'var(--glow)' }}>
                                    <FileDown size={16} style={{ marginRight: 8 }} /> DOWNLOAD PDF
                                </button>
                            </div>
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
                        {content.mcqs && content.mcqs.length > 0 && (
                            <div className="study-section" style={{ marginTop: 32 }} ref={quizRef}>
                                <div className="questions-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Zap size={18} color="var(--accent-neon)" /> Practice Quiz (MCQs)
                                </div>
                                {content.mcqs.map((q, i) => <MCQCard key={i} q={q} index={i} />)}
                            </div>
                        )}

                        {/* --- Section 3: Short Answer --- */}
                        {content.shortAnswer && content.shortAnswer.length > 0 && (
                            <div className="study-section" style={{ marginTop: 32 }}>
                                <div className="questions-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Sparkles size={18} color="var(--accent-neon)" /> Key Flashcards
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                    {content.shortAnswer.map((q, i) => <ShortAnsCard key={i} q={q} index={i} />)}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* --- Chat CTA Section --- */}
            <div className="card glass animate-fade-in" style={{ marginTop: 40, padding: '32px 40px', background: 'linear-gradient(135deg, rgba(57, 255, 20, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(57, 255, 20, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <MessageSquare size={20} color="var(--accent-neon)" />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Need more assistance?</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                        Have a specific question not covered in the summary? Deep dive with our specialized AI assistant.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setCurrentPage('chat')}
                    style={{ whiteSpace: 'nowrap', padding: '12px 24px', boxShadow: 'var(--glow)' }}
                >
                    CHAT WITH AI <Sparkles size={16} style={{ marginLeft: 8 }} />
                </button>
            </div>

        </div>
    );
}
