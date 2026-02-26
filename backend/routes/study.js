const express = require("express");
const Groq = require("groq-sdk");
const getSubjectText = require("../utils/getSubjectText");
const Subject = require("../models/Subject");

const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});


router.post("/study-mode", async (req, res) => {
    try {
        const { subjectId, subjectName, fileName } = req.body;

        // Get text (either specific file or combined subject text)
        const subjectText = await getSubjectText(subjectId, fileName);

        // Resolve subject name
        let name = subjectName;
        if (!name) {
            const subject = await Subject.findOne({ subjectId: String(subjectId) });
            name = subject?.name || "Subject";
        }

        if (!subjectText) {
            return res.status(400).json({ error: "No notes found." });
        }

        console.log(`Generating dashboard for ${name}...`);

        const prompt = `Produce a study dashboard for "${name}" based STRICTLY on these notes:
${subjectText}

REQUIREMENTS:
1. "notes": A beautiful, substantial Markdown summary with headers and bullets. MANDATORY.
2. "mcqs": 5 multiple choice questions with options and explanations.
3. "shortAnswer": 3 flashcard-style questions.

Respond ONLY in valid JSON:
{
  "notes": "Full Markdown summary here...",
  "mcqs": [{"question": "", "options": [], "correctKey": "", "explanation": "", "citation": ""}],
  "shortAnswer": [{"question": "", "answer": "", "citation": ""}]
}`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content);
        if (!result.notes) {
            result.notes = "No summary could be generated from the text provided.";
        }

        res.json(result);
    } catch (err) {
        console.error("Dashboard generation error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
