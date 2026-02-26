import { createContext, useContext, useState } from 'react';

const SUBJECT_COLORS = ['s0', 's1', 's2'];
const SUBJECT_ICONS = ['📘', '🧪', '📐'];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Start with just 1 subject — user can add up to 3
  const [subjects, setSubjects] = useState([
    { id: 0, name: '', description: '', files: [], color: 's0', icon: '📘', chatHistory: [], uploaded: false },
  ]);
  const [activeSubjectId, setActiveSubjectId] = useState(0);
  const [currentPage, setCurrentPage] = useState('setup'); // 'setup' | 'chat' | 'study'

  const updateSubject = (id, fields) =>
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, ...fields } : s)));

  const addFiles = (id, newFiles) =>
    setSubjects(prev =>
      prev.map(s => (s.id === id ? { ...s, files: [...s.files, ...newFiles], uploaded: false } : s))
    );

  const removeFile = (subjectId, fileIdx) =>
    setSubjects(prev =>
      prev.map(s =>
        s.id === subjectId ? { ...s, files: s.files.filter((_, i) => i !== fileIdx), uploaded: false } : s
      )
    );

  const markUploaded = (subjectId) =>
    setSubjects(prev =>
      prev.map(s => (s.id === subjectId ? { ...s, uploaded: true } : s))
    );

  const addMessage = (subjectId, message) =>
    setSubjects(prev =>
      prev.map(s =>
        s.id === subjectId ? { ...s, chatHistory: [...s.chatHistory, message] } : s
      )
    );

  // Add a new subject (up to 3)
  const addSubject = () => {
    if (subjects.length >= 3) return;
    const nextId = Math.max(...subjects.map(s => s.id)) + 1;
    const idx = subjects.length;
    setSubjects(prev => [
      ...prev,
      { id: nextId, name: '', description: '', files: [], color: SUBJECT_COLORS[idx] || 's0', icon: SUBJECT_ICONS[idx] || '📘', chatHistory: [], uploaded: false },
    ]);
  };

  // Remove a subject
  const removeSubject = (id) => {
    if (subjects.length <= 1) return; // must keep at least 1
    setSubjects(prev => prev.filter(s => s.id !== id));
    if (activeSubjectId === id) {
      setActiveSubjectId(subjects.find(s => s.id !== id)?.id ?? 0);
    }
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  // Derived live — always accurate, no stale state
  const configuredSubjects = subjects.filter(s => s.name.trim() !== '');
  const isSetupComplete = configuredSubjects.length > 0;

  // Returns whether setup is complete (kept for backward compat with SetupPage)
  const checkSetupComplete = () => isSetupComplete;

  return (
    <AppContext.Provider
      value={{
        subjects,
        configuredSubjects,
        isSetupComplete,
        activeSubjectId,
        setActiveSubjectId,
        activeSubject,
        currentPage,
        setCurrentPage,
        updateSubject,
        addFiles,
        removeFile,
        addMessage,
        markUploaded,
        addSubject,
        removeSubject,
        checkSetupComplete,
        SUBJECT_ICONS,
        SUBJECT_COLORS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
