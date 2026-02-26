const File = require("../models/File");

/**
 * Retrieve and concatenate extracted text for a given subject or a specific file.
 *
 * @param {string} subjectId — The frontend subject identifier
 * @param {string} [fileName] — Optional specific file to fetch
 * @returns {Promise<string|null>} — Combined text or specific file text
 */
async function getSubjectText(subjectId, fileName) {
    const query = { subjectId };
    if (fileName) {
        query.fileName = fileName;
    }

    const files = await File.find(query).sort({ uploadedAt: 1 });

    if (!files || files.length === 0) return null;

    const combined = files
        .map((f) => `--- Source: ${f.fileName} ---\n${f.extractedText}`)
        .join("\n\n");

    return combined.substring(0, 30000);
}

module.exports = getSubjectText;
