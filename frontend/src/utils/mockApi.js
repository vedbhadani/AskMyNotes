/**
 * Real API utilities — connects to the Express backend.
 * Backend runs on port 3001, Vite proxies /api/* to it.
 */
import api from './api';

/**
 * Upload files for a subject to the backend.
 * Extracts text and stores it server-side.
 *
 * @param {number|string} subjectId
 * @param {string} subjectName
 * @param {File[]} files
 * @returns {Promise<{success: boolean, files: Array, totalTexts: number}>}
 */
export const uploadSubjectFiles = async (subjectId, subjectName, files) => {
    const formData = new FormData();
    formData.append("subjectId", subjectId);
    formData.append("subjectName", subjectName);
    files.forEach((file) => formData.append("files", file));

    const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
};

/**
 * Send a chat question scoped to a specific subject.
 *
 * @param {number|string} subjectId
 * @param {string} question
 * @param {string} subjectName
 * @returns {Promise<{answer?: string, confidence?: string, evidence?: string[], citations?: string[], notFound?: boolean, subjectName?: string}>}
 */
export const askQuestion = async (subjectId, question, subjectName) => {
    const response = await api.post("/chat", {
        subjectId,
        question,
        subjectName,
    });
    return response.data;
};

/**
 * Generate study content (MCQs + short answer) for a subject.
 *
 * @param {number|string} subjectId
 * @param {string} subjectName
 * @returns {Promise<{mcqs: Array, shortAnswer: Array}>}
 */
export const generateStudyContent = async (subjectId, subjectName, fileName, mode) => {
    const response = await api.post("/study-mode", {
        subjectId,
        subjectName,
        fileName,
        mode,
    });
    return response.data;
};

/**
 * Clear stored texts for a subject (for re-upload).
 *
 * @param {number|string} subjectId
 */
export const clearSubjectFiles = async (subjectId) => {
    const response = await api.post("/clear-subject", { subjectId });
    return response.data;
};

/**
 * Fetch all subjects for the current user.
 */
export const fetchSubjects = async () => {
    const response = await api.get("/subjects");
    return response.data;
};

/**
 * Delete an entire subject.
 */
export const deleteSubject = async (subjectId) => {
    const response = await api.delete(`/subjects/${subjectId}`);
    return response.data;
};

/**
 * Delete a specific file from a subject.
 */
export const deleteFile = async (subjectId, fileName) => {
    const response = await api.delete(`/subjects/${subjectId}/files/${fileName}`);
    return response.data;
};
/**
 * Fetch the full text content of a specific file.
 */
export const fetchFileContent = async (subjectId, fileName) => {
    const response = await api.get(`/subjects/${subjectId}/files/${fileName}/content`);
    return response.data;
};
