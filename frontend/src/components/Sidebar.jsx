import { useApp } from '../context/AppContext';
import { Settings, LayoutDashboard, MessageSquare, Binary, ChevronRight, FileText, CheckCircle2, Circle } from 'lucide-react';

const NAV_ITEMS = [
    { id: 'setup', label: '1. Subject Setup', icon: Settings },
    { id: 'study', label: '2. Subject Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: '3. Chat with AI', icon: MessageSquare },
];

export default function Sidebar() {
    const { configuredSubjects, subjects, currentPage, setCurrentPage, activeSubjectId, setActiveSubjectId } = useApp();

    const displaySubjects = configuredSubjects.length > 0 ? configuredSubjects : subjects;

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark">
                    <Binary size={14} color="var(--bg-primary)" />
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
                        <item.icon size={16} style={{ marginRight: 8 }} />
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
                        <FileText size={14} style={{ opacity: 0.7 }} />
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
                            s.files.length > 0
                                ? <CheckCircle2 size={12} color="var(--accent-green)" />
                                : <Circle size={12} color="var(--text-muted)" />
                        )}
                    </button>
                ))}
            </div>

            <div style={{ padding: '24px 20px', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Hackathon Integration</div>
                Built with Groq & React
            </div>

            <style jsx>{`
                .active-subject {
                    color: var(--accent-neon) !important;
                    border-left: 2px solid var(--accent-neon);
                    background: var(--bg-hover) !important;
                }
                .sidebar-nav-btn span {
                    font-family: 'JetBrains Mono', monospace;
                    color: var(--accent-neon);
                }
            `}</style>
        </aside>
    );
}
