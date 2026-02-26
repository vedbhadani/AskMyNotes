const File = require("../models/File");

/**
 * Retrieve and concatenate all extracted text for a given subject.
 * Replaces the old in-memory getSubjectText() function.
 *
 * @param {string} subjectId — The frontend subject identifier
 * @returns {Promise<string|null>} — Combined text with source markers, or null
 */
async function getSubjectText(subjectId) {
    const files = await File.find({ subjectId }).sort({ uploadedAt: 1 });

    if (!files || files.length === 0) return null;

    const combined = files
        .map((f) => `--- Source: ${f.fileName} ---\n${f.extractedText}`)
        .join("\n\n");

    // Truncate to ~30k characters to fit LLM context window
    return combined.substring(0, 30000);
}

module.exports = getSubjectText;
