import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import SetupPage from './pages/SetupPage';
import StudyPage from './pages/StudyPage';
import ChatPage from './pages/ChatPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import { RotateCcw, LogOut, User } from 'lucide-react';

function AppContent() {
  const { currentPage, activeSubject } = useApp();
  const { user, signOut } = useAuth();

  // Derive topbar title & subtitle based on current page
  const pageConfig = {
    setup: {
      title: 'Subject Setup',
      subtitle: 'Name your subjects and upload notes',
    },
    study: {
      title: activeSubject?.name || 'Subject Dashboard',
      subtitle: 'Review notes, quizzes, and ask questions',
    },
    chat: {
      title: activeSubject?.name ? `Chat — ${activeSubject.name}` : 'Chat with PDF',
      subtitle: 'Ask questions grounded strictly in your uploaded notes',
    },
  };

  const { title: pageTitle, subtitle: pageSubtitle } = pageConfig[currentPage] || pageConfig.setup;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <div>
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-subtitle">{pageSubtitle}</div>
          </div>
          <div className="topbar-actions">
            {(currentPage === 'study' || currentPage === 'chat') && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.location.reload()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCcw size={14} /> RESET SESSION
              </button>
            )}
            {user && (
              <div className="topbar-user">
                <div className="topbar-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={14} />
                </div>
                <span className="topbar-user-name">{user.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LogOut size={14} /> SIGN OUT
                </button>
              </div>
            )}
          </div>
        </header>

        {currentPage === 'setup' && <SetupPage />}
        {currentPage === 'study' && <StudyPage />}
        {currentPage === 'chat' && <ChatPage />}
      </div>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  const [authPage, setAuthPage] = useState('signin'); // 'signin' | 'signup'

  if (loading) return null;

  if (!user) {
    return authPage === 'signin'
      ? <SignInPage onGoSignUp={() => setAuthPage('signup')} />
      : <SignUpPage onGoSignIn={() => setAuthPage('signin')} />;
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
