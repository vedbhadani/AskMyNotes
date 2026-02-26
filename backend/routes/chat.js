const express = require("express");
const Groq = require("groq-sdk");
const getSubjectText = require("../utils/getSubjectText");
const Subject = require("../models/Subject");
const ChatHistory = require("../models/ChatHistory");
const auth = require("../utils/authMiddleware");

const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});


router.post("/chat", auth, async (req, res) => {
    try {
        const { subjectId, question, subjectName } = req.body;
        const userId = req.user._id;

        const subjectText = await getSubjectText(subjectId, null, userId);


        let name = subjectName;
        if (!name) {
            const subject = await Subject.findOne({ subjectId: String(subjectId), userId });
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
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" },
        });

        const response = JSON.parse(completion.choices[0].message.content);

        ChatHistory.create({
            subjectId: String(subjectId),
            question,
            response,
        }).catch((err) => console.error("ChatHistory save failed:", err.message));

        res.json(response);
    } catch (err) {
        console.error("Chat route error:", err);
        if (err.status === 429) {
            return res.status(429).json({ error: "The AI is currently busy. Please wait a moment before asking another question." });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
