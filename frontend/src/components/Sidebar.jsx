import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
    { id: 'setup', label: '1. Subject Setup', icon: '⚙️' },
    { id: 'study', label: '2. Subject Dashboard', icon: '📖' },
    { id: 'chat', label: '3. Chat with AI', icon: '💬' },
];

export default function Sidebar() {
    const { configuredSubjects, subjects, currentPage, setCurrentPage, activeSubjectId, setActiveSubjectId } = useApp();

    const displaySubjects = configuredSubjects.length > 0 ? configuredSubjects : subjects;

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                </div>
                <h1>AskMyNotes</h1>
            </div>

            <div className="sidebar-section">
                <div className="sidebar-section-label">Main Steps</div>
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-nav-btn ${currentPage === item.id ? 'active' : ''}`}
                        onClick={() => setCurrentPage(item.id)}
                    >
                        <span style={{ marginRight: 8 }}>{item.icon}</span>
                        {item.label}
                    </button>
                ))}

                <div className="divider" />

                <div className="sidebar-section-label">Your Subjects</div>
                {displaySubjects.map((s, i) => (
                    <button
                        key={s.id}
                        className={`sidebar-nav-btn ${activeSubjectId === s.id && (currentPage === 'study' || currentPage === 'chat') ? 'active-subject' : ''}`}
                        onClick={() => {
                            setActiveSubjectId(s.id);
                            if (s.name && currentPage === 'setup') setCurrentPage('study');
                        }}
                        disabled={!s.name && currentPage !== 'setup'}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: s.name ? 1 : 0.6 }}
                    >
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <div style={{
                                fontSize: '0.82rem', fontWeight: 500,
                                color: 'inherit',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {s.name || `(Empty Subject ${i + 1})`}
                            </div>
                            {s.name && (
                                <div style={{ fontSize: '0.67rem', opacity: 0.8 }}>
                                    {s.files.length} file{s.files.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>
                        {s.name && (
                            <span style={{
                                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                background: s.files.length > 0 ? 'var(--accent-green)' : 'var(--text-muted)'
                            }} />
                        )}
                    </button>
                ))}
            </div>

            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600 }}>Hackathon Integration</div>
                Built with Groq & React
            </div>

            <style jsx>{`
                .active-subject {
                    background: var(--accent-blue-light) !important;
                    color: var(--accent-blue) !important;
                    border-left: 3px solid var(--accent-blue);
                    border-radius: 0 4px 4px 0;
                }
            `}</style>
        </aside>
    );
}
