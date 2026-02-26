import { AppProvider } from './context/AppContext';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import SetupPage from './pages/SetupPage';
import StudyPage from './pages/StudyPage';
import ChatPage from './pages/ChatPage';

function AppContent() {
  const { currentPage, activeSubject } = useApp();

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
              >
                Reset Session
              </button>
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

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
