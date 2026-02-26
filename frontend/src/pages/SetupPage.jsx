import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { uploadSubjectFiles, clearSubjectFiles } from '../utils/mockApi';

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function SubjectCard({ subject, index, canRemove }) {
    const { updateSubject, addFiles, removeFile, removeSubject } = useApp();
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFiles = (fileList) => {
        const accepted = Array.from(fileList).filter(f =>
            f.type === 'application/pdf' || f.type === 'text/plain'
        );
        if (accepted.length > 0) addFiles(subject.id, accepted);
    };

    return (
        <div className="subject-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="subject-card-num">Subject {index + 1}</div>
                {canRemove && (
                    <button
                        className="remove-btn"
                        onClick={() => removeSubject(subject.id)}
                        title="Remove this subject"
                        style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 6px' }}
                    >
                        ✕ Remove
                    </button>
                )}
            </div>
            <input
                type="text"
                placeholder="Enter subject name..."
                value={subject.name}
                onChange={e => updateSubject(subject.id, { name: e.target.value })}
                maxLength={40}
            />

            <div
                className={`file-upload-zone ${dragOver ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            >
                <p>Drop files or <span>browse</span></p>
                <p style={{ marginTop: 2, fontSize: '0.67rem' }}>PDF, TXT · Multiple files allowed</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt"
                    onChange={e => handleFiles(e.target.files)}
                />
            </div>

            {subject.files.length > 0 && (
                <div className="file-list">
                    {subject.files.map((f, i) => (
                        <div key={i} className="file-item">
                            <span title={f.name}>{f.name}</span>
                            <span className="file-size">{formatFileSize(f.size)}</span>
                            <button className="remove-btn" onClick={() => removeFile(subject.id, i)}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            {subject.uploaded && subject.files.length > 0 && (
                <div style={{
                    marginTop: 6, fontSize: '0.7rem', color: 'var(--accent-green)',
                    display: 'flex', alignItems: 'center', gap: 4
                }}>
                    ✓ Files processed by AI
                </div>
            )}
        </div>
    );
}

export default function SetupPage() {
    const { subjects, checkSetupComplete, setCurrentPage, markUploaded, addSubject } = useApp();
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const totalFiles = subjects.reduce((acc, s) => acc + s.files.length, 0);
    const namedCount = subjects.filter(s => s.name.trim()).length;
    const canAddMore = subjects.length < 3;

    const handleProceed = async () => {
        if (!checkSetupComplete()) return;
        setUploading(true);
        setUploadError('');

        try {
            // Only upload for named subjects that have files
            const namedSubjects = subjects.filter(s => s.name.trim());

            for (const subject of namedSubjects) {
                if (subject.files.length > 0 && !subject.uploaded) {
                    await clearSubjectFiles(subject.id);
                    await uploadSubjectFiles(subject.id, subject.name, subject.files);
                    markUploaded(subject.id);
                } else if (subject.files.length === 0) {
                    await clearSubjectFiles(subject.id);
                }
            }

            setCurrentPage('study');
        } catch (err) {
            console.error('Upload error:', err);
            setUploadError(err.message || 'Failed to upload files. Make sure the backend server is running.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="page-content">
            <div className="welcome-banner">
                <h2>Set up your subjects</h2>
                <p>
                    Name at least one subject and upload your notes. You can add up to 3 subjects.
                    Once ready, you can ask questions and get answers grounded strictly in your uploaded material.
                </p>
            </div>

            <div className="stat-row">
                <div className="stat-mini">
                    <div className="val">{namedCount}<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/{subjects.length}</span></div>
                    <div className="lbl">Subjects named</div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${namedCount > 0 ? (namedCount / subjects.length) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="stat-mini">
                    <div className="val">{totalFiles}</div>
                    <div className="lbl">Files uploaded</div>
                </div>
                <div className="stat-mini">
                    <div className="val">{subjects.filter(s => s.files.length > 0).length}<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/{subjects.length}</span></div>
                    <div className="lbl">Subjects with notes</div>
                </div>
            </div>

            <div className="subjects-grid" style={{ gridTemplateColumns: `repeat(${Math.min(subjects.length, 3)}, 1fr)` }}>
                {subjects.map((s, i) => (
                    <SubjectCard key={s.id} subject={s} index={i} canRemove={subjects.length > 1} />
                ))}
            </div>

            {canAddMore && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <button className="btn btn-secondary" onClick={addSubject}>
                        + Add Subject ({subjects.length}/3)
                    </button>
                </div>
            )}

            <div className="setup-action-bar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {subjects.map((s, i) => (
                        <div key={s.id} className="setup-status">
                            <span className={`setup-dot ${s.name ? 'done' : 'pending'}`} />
                            <span style={{ color: s.name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {s.name ? `"${s.name}"` : `Subject ${i + 1} — not named`}
                            </span>
                            {s.files.length > 0 && (
                                <span className="tag" style={{ marginLeft: 6 }}>
                                    {s.files.length} file{s.files.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleProceed}
                    disabled={namedCount < 1 || uploading}
                >
                    {uploading ? 'Processing Files...' : 'Start Asking'}
                </button>
            </div>

            {uploadError && (
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-red)', marginTop: 10, padding: '8px 14px', background: 'var(--accent-red-light)', borderRadius: 6 }}>
                    ⚠️ {uploadError}
                </p>
            )}

            {namedCount < 1 && (
                <p style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 10 }}>
                    Name at least 1 subject to continue
                </p>
            )}
        </div>
    );
}
