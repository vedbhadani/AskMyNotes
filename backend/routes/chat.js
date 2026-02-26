const express = require("express");
const Groq = require("groq-sdk");
const getSubjectText = require("../utils/getSubjectText");
const Subject = require("../models/Subject");
const ChatHistory = require("../models/ChatHistory");

const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// ─── ROUTE: Chat Q&A ────────────────────────────────────────────────────────
router.post("/chat", async (req, res) => {
    try {
        const { subjectId, question, subjectName } = req.body;

        // Get combined text from MongoDB
        const subjectText = await getSubjectText(subjectId);

        // Resolve subject name
        let name = subjectName;
        if (!name) {
            const subject = await Subject.findOne({ subjectId: String(subjectId) });
            name = subject?.name || "Subject";
        }

        if (!subjectText) {
            return res.json({ notFound: true, subjectName: name });
        }

        const prompt = `You are "AskMyNotes" AI. Answer strictly based on the notes below.
NOTES:
${subjectText}

QUESTION: ${question}

Respond in JSON:
{
  "notFound": boolean,
  "answer": "markdown string",
  "confidence": "High"|"Medium"|"Low",
  "evidence": ["quotes"],
  "citations": ["filename"]
}`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
        });

        const response = JSON.parse(completion.choices[0].message.content);

        // Save to history (non-blocking, best-effort)
        ChatHistory.create({
            subjectId: String(subjectId),
            question,
            response,
        }).catch((err) => console.error("ChatHistory save failed:", err.message));

        res.json(response);
    } catch (err) {
        console.error("Chat route error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
