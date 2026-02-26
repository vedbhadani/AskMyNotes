import { useState, useRef } from 'react';
import mascotImg from '../assets/Screenshot 2026-02-26 at 18.28.04.png';
import { useApp } from '../context/AppContext';
import { uploadSubjectFiles, clearSubjectFiles } from '../utils/mockApi';
import { X, UploadCloud, FileText, Plus, ChevronRight, CheckCircle2, Circle, BookOpen, Layers } from 'lucide-react';

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function SubjectCard({ subject, index, canRemove, onStartAsking, isProcessing }) {
    const { updateSubject, addFiles, removeFile, removeSubject } = useApp();
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFiles = (fileList) => {
        const accepted = Array.from(fileList).filter(f =>
            f.type === 'application/pdf' || f.type === 'text/plain'
        );
        if (accepted.length > 0) addFiles(subject.id, accepted);
    };

    const canStart = subject.name.trim() && subject.files.length > 0;

    return (
        <div className="subject-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="subject-card-num">Subject {index + 1}</div>
                {canRemove && (
                    <button
                        className="remove-btn"
                        onClick={() => removeSubject(subject.id)}
                        title="Remove this subject"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 6px' }}
                    >
                        <X size={12} /> REMOVE
                    </button>
                )}
            </div>
            <input
                type="text"
                placeholder="Enter subject name..."
                value={subject.name}
                onChange={e => updateSubject(subject.id, { name: e.target.value })}
                maxLength={40}
                style={{ marginBottom: 16 }}
            />

            <div
                className={`file-upload-zone ${dragOver ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                style={{ marginBottom: 16 }}
            >
                <UploadCloud size={24} color="var(--accent-neon)" style={{ marginBottom: 12 }} />
                <p>Drop PDF/Text or <span>browse</span></p>
                <p style={{ marginTop: 4, fontSize: '0.67rem', opacity: 0.6 }}>Multiple files allowed</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt"
                    onChange={e => handleFiles(e.target.files)}
                />
            </div>

            {subject.files.length > 0 && (
                <div className="file-list" style={{ marginBottom: 16 }}>
                    {subject.files.map((f, i) => (
                        <div key={i} className="file-item">
                            <FileText size={14} style={{ opacity: 0.7 }} />
                            <span title={f.name}>{f.name}</span>
                            <span className="file-size">{formatFileSize(f.size)}</span>
                            <button className="remove-btn" onClick={() => removeFile(subject.id, i)}><X size={14} /></button>
                        </div>
                    ))}
                </div>
            )}

            <button
                className="btn btn-primary"
                onClick={() => onStartAsking(subject.id)}
                disabled={!canStart || isProcessing}
                style={{ width: '100%', marginTop: 'auto', gap: 8, height: 44 }}
            >
                {isProcessing ? 'PROCESSING...' : (
                    <>
                        START ASKING <ChevronRight size={16} />
                    </>
                )}
            </button>
        </div>
    );
}

export default function SetupPage() {
    const { subjects, setActiveSubjectId, setCurrentPage, markUploaded, addSubject } = useApp();
    const [uploadingId, setUploadingId] = useState(null);
    const [uploadError, setUploadError] = useState('');

    const totalFiles = subjects.reduce((acc, s) => acc + s.files.length, 0);
    const namedCount = subjects.filter(s => s.name.trim()).length;
    const canAddMore = subjects.length < 3;

    const handleStartAsking = async (subjectId) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject || !subject.name.trim() || subject.files.length === 0) return;

        setUploadingId(subjectId);
        setUploadError('');
        setActiveSubjectId(subjectId);

        try {
            if (!subject.uploaded) {
                await clearSubjectFiles(subject.id);
                await uploadSubjectFiles(subject.id, subject.name, subject.files);
                markUploaded(subject.id);
            }
            setCurrentPage('study');
        } catch (err) {
            console.error('Upload error:', err);
            setUploadError(err.message || 'Failed to upload files. Make sure the backend server is running.');
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className="page-content">
            <div className="welcome-banner glass" style={{ borderLeft: '4px solid var(--accent-neon)', display: 'flex', alignItems: 'center', gap: 24, padding: '24px 32px' }}>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: 'var(--accent-neon)', marginBottom: 12 }}>Welcome to AskMyNotes</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        Your AI-powered study companion. Upload your notes, and we'll generate customized dashboards,
                        MCQ quizzes, and provide answers grounded strictly in your material.
                    </p>
                </div>
                <img src={mascotImg} alt="Mascot" style={{ width: 120, height: 120, borderRadius: '50%', border: '2px solid var(--accent-neon)', boxShadow: 'var(--glow)', objectFit: 'cover' }} />
            </div>

            <div className="stat-row" style={{ display: 'flex', gap: 32, marginBottom: 48, marginTop: 40 }}>
                <div className="stat-mini" style={{ flex: 1, padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                    <Layers size={40} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.05 }} />
                    <div className="lbl" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BookOpen size={12} /> Subjects named
                    </div>
                    <div className="val" style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{namedCount}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/{subjects.length}</span></div>
                    <div style={{ height: 2, background: 'var(--border)', marginTop: 12 }}>
                        <div style={{ height: '100%', background: 'var(--accent-neon)', width: `${namedCount > 0 ? (namedCount / subjects.length) * 100 : 0}%`, transition: 'var(--transition)' }} />
                    </div>
                </div>
                <div className="stat-mini" style={{ flex: 1, padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                    <FileText size={40} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.05 }} />
                    <div className="lbl" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={12} /> Files uploaded
                    </div>
                    <div className="val" style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{totalFiles}</div>
                </div>
                <div className="stat-mini" style={{ flex: 1, padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                    <CheckCircle2 size={40} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.05 }} />
                    <div className="lbl" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={12} /> Subjects with notes
                    </div>
                    <div className="val" style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{subjects.filter(s => s.files.length > 0).length}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/{subjects.length}</span></div>
                </div>
            </div>

            <div className="subjects-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(300px, 1fr))` }}>
                {subjects.map((s, i) => (
                    <SubjectCard
                        key={s.id}
                        subject={s}
                        index={i}
                        canRemove={subjects.length > 1}
                        onStartAsking={handleStartAsking}
                        isProcessing={uploadingId === s.id}
                    />
                ))}

                {canAddMore && (
                    <div className="add-subject-card" onClick={addSubject}>
                        <div className="plus-icon">
                            <Plus size={24} />
                        </div>
                        <span>Add Subject ({subjects.length}/3)</span>
                    </div>
                )}
            </div>

            {uploadError && (
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-red)', marginTop: 24, padding: '12px', background: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: 6 }}>
                    ⚠️ {uploadError}
                </p>
            )}
        </div>
    );
}
