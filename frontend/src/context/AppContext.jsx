import { createContext, useContext, useState, useEffect } from 'react';
import { fetchSubjects, deleteSubject as apiDeleteSubject, deleteFile as apiDeleteFile } from '../utils/mockApi';

const SUBJECT_COLORS = ['s0', 's1', 's2'];
const SUBJECT_ICONS = ['📘', '🧪', '📐'];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [currentPage, setCurrentPage] = useState('setup');
  const [loading, setLoading] = useState(true);

  const loadSubjects = async () => {
    try {
      const data = await fetchSubjects();
      if (data.length > 0) {
        setSubjects(data.map(s => ({
          ...s,
          chatHistory: s.chatHistory || [],
          uploaded: s.files?.length > 0,
          contentCache: s.contentCache || {}
        })));
        setActiveSubjectId(data[0].id);
      } else {
        // Default initial subject if none exist
        setSubjects([{ id: 0, name: '', description: '', files: [], color: 's0', icon: '📘', chatHistory: [], uploaded: false, contentCache: {} }]);
        setActiveSubjectId(0);
      }
    } catch (err) {
      console.error("Failed to load subjects:", err);
      // Fallback
      setSubjects([{ id: 0, name: '', description: '', files: [], color: 's1', icon: '📐', chatHistory: [], uploaded: false, contentCache: {} }]);
      setActiveSubjectId(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const updateSubject = (id, fields) =>
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, ...fields } : s)));

  const addFiles = (id, newFiles) =>
    setSubjects(prev =>
      prev.map(s => (s.id === id ? { ...s, files: [...s.files, ...newFiles], uploaded: false, contentCache: {} } : s))
    );

  const removeFile = async (subjectId, fileIdx) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject && subject.files[fileIdx]) {
      const fileName = subject.files[fileIdx].name;
      if (subject.uploaded) {
        try {
          await apiDeleteFile(subjectId, fileName);
        } catch (err) {
          console.error("Failed to delete file from backend:", err);
        }
      }
    }
    setSubjects(prev =>
      prev.map(s =>
        s.id === subjectId ? { ...s, files: s.files.filter((_, i) => i !== fileIdx), uploaded: false, contentCache: {} } : s
      )
    );
  };

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

  const addSubject = () => {
    if (subjects.length >= 3) return;
    const existingIds = subjects.map(s => Number(s.id)).filter(n => !isNaN(n));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0;
    const idx = subjects.length;
    setSubjects(prev => [
      ...prev,
      { id: nextId, name: '', description: '', files: [], color: SUBJECT_COLORS[idx] || 's0', icon: SUBJECT_ICONS[idx] || '📘', chatHistory: [], uploaded: false, contentCache: {} },
    ]);
  };

  const removeSubject = async (id) => {
    if (subjects.length <= 1) return;

    const subject = subjects.find(s => s.id === id);
    if (subject && subject.uploaded) {
      try {
        await apiDeleteSubject(id);
      } catch (err) {
        console.error("Failed to delete subject from backend:", err);
      }
    }

    setSubjects(prev => prev.filter(s => s.id !== id));
    if (activeSubjectId === id) {
      const remaining = subjects.filter(s => s.id !== id);
      setActiveSubjectId(remaining[0]?.id ?? 0);
    }
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const configuredSubjects = subjects.filter(s => s.name?.trim() !== '');
  const isSetupComplete = configuredSubjects.length > 0;
  const checkSetupComplete = () => isSetupComplete;

  return (
    <AppContext.Provider
      value={{
        subjects,
        loading,
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
        refreshSubjects: loadSubjects,
        SUBJECT_ICONS,
        SUBJECT_COLORS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
