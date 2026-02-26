/**
 * Real API utilities — connects to the Express backend.
 * Backend runs on port 3001, Vite proxies /api/* to it.
 */

/**
 * Upload files for a subject to the backend.
 * Extracts text and stores it server-side.
 *
 * @param {number|string} subjectId
 * @param {string} subjectName
 * @param {File[]} files
 * @returns {Promise<{success: boolean, files: Array, totalTexts: number}>}
 */
export async function uploadSubjectFiles(subjectId, subjectName, files) {
    const formData = new FormData();
    formData.append("subjectId", String(subjectId));
    formData.append("subjectName", subjectName);

    files.forEach((file) => {
        formData.append("files", file);
    });

    const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
    }

    return response.json();
}

/**
 * Send a chat question scoped to a specific subject.
 *
 * @param {number|string} subjectId
 * @param {string} question
 * @param {string} subjectName
 * @returns {Promise<{answer?: string, confidence?: string, evidence?: string[], citations?: string[], notFound?: boolean, subjectName?: string}>}
 */
export async function askQuestion(subjectId, question, subjectName) {
    const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            subjectId: String(subjectId),
            question,
            subjectName,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Chat failed" }));
        throw new Error(err.error || "Chat request failed");
    }

    return response.json();
}

/**
 * Generate study content (MCQs + short answer) for a subject.
 *
 * @param {number|string} subjectId
 * @param {string} subjectName
 * @returns {Promise<{mcqs: Array, shortAnswer: Array}>}
 */
export async function generateStudyContent(subjectId, subjectName, fileName) {
    const response = await fetch("/api/study-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            subjectId: String(subjectId),
            subjectName,
            fileName,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Study mode failed" }));
        throw new Error(err.error || "Study mode failed");
    }

    return response.json();
}

/**
 * Clear stored texts for a subject (for re-upload).
 *
 * @param {number|string} subjectId
 */
export async function clearSubjectFiles(subjectId) {
    const response = await fetch("/api/clear-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: String(subjectId) }),
    });

    return response.json();
}
