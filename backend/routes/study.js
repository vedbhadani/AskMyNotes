const express = require("express");
const Groq = require("groq-sdk");
const getSubjectText = require("../utils/getSubjectText");
const Subject = require("../models/Subject");
const auth = require("../utils/authMiddleware");

const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});


router.post("/study-mode", auth, async (req, res) => {
    try {
        const { subjectId, subjectName, fileName, mode } = req.body;
        const userId = req.user._id;

        // Get text (either specific file or combined subject text)
        const subjectText = await getSubjectText(subjectId, fileName, userId);

        // Resolve subject name
        let name = subjectName;
        if (!name) {
            const subject = await Subject.findOne({ subjectId: String(subjectId), userId });
            name = subject?.name || "Subject";
        }

        if (!subjectText) {
            console.warn(`No text found for subjectId: ${subjectId}, userId: ${userId}`);
            return res.status(400).json({ error: "No notes found." });
        }

        let prompt = "";
        if (mode === 'practice') {
            prompt = `Generate a practice set for "${name}" based STRICTLY on these notes:
${subjectText}

REQUIREMENTS:
1. "mcqs": 5 multiple choice questions with options and explanations.
2. "shortAnswer": 3 flashcard-style questions.
3. Leave "notes" as an empty string "".

Respond ONLY in valid JSON:
{
  "notes": "",
  "mcqs": [{"question": "", "options": [], "correctKey": "", "explanation": "", "citation": ""}],
  "shortAnswer": [{"question": "", "answer": "", "citation": ""}]
}`;
        } else {
            // Default to summarize
            prompt = `Produce a beautiful study summary for "${name}" based STRICTLY on these notes:
${subjectText}

REQUIREMENTS:
1. "notes": A substantial Markdown summary with headers and bullets.
2. Leave "mcqs" and "shortAnswer" as empty arrays [].

Respond ONLY in valid JSON:
{
  "notes": "Full Markdown summary here...",
  "mcqs": [],
  "shortAnswer": []
}`;
        }

        console.log(`Sending to Groq (${mode}) for ${name}...`);
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" },
        });

        console.log(`Groq responded for ${name}.`);

        const result = JSON.parse(completion.choices[0].message.content);
        res.json(result);
    } catch (err) {
        console.error("Dashboard generation error:", err);
        if (err.status === 429) {
            return res.status(429).json({ error: "The AI is currently at its daily limit. Please try again in an hour or with a smaller document." });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
