const express = require("express");
const multer = require("multer");
const pdfPkg = require("pdf-parse");
const Groq = require("groq-sdk");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// pdf-parse v2 exports a class { PDFParse }, not a function.
// Instantiate it once and call .pdf(buffer) on it.
const PDFParser = pdfPkg.PDFParse;

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── In-Memory Subject Store ─────────────────────────────────────────────────
const subjectStore = {};

// ─── Multer config ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if ([".pdf", ".txt"].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file type. Allowed: PDF, TXT"), false);
        }
    },
});

// ─── Text Extraction ─────────────────────────────────────────────────────────
async function extractText(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase();

    try {
        if (ext === ".pdf") {
            // pdf-parse v2: pass the local file path as 'url', then call .getText()
            const parser = new PDFParser({ url: filePath });
            const data = await parser.getText();
            const text = data.text || "";
            console.log(`Extracted ${text.length} chars from ${originalName}`);
            return text;
        }

        if (ext === ".txt") {
            const text = fs.readFileSync(filePath, "utf-8");
            console.log(`Read ${text.length} chars from ${originalName}`);
            return text;
        }
    } catch (err) {
        console.error(`Extraction failed for ${originalName}:`, err);
        throw err;
    }

    throw new Error("Unsupported file type");
}

// ─── Helper: get combined text for a subject ─────────────────────────────────
function getSubjectText(subjectId) {
    const subject = subjectStore[subjectId];
    if (!subject || subject.texts.length === 0) return null;

    return subject.texts
        .map((t) => `--- Source: ${t.fileName} ---\n${t.content}`)
        .join("\n\n");
}

// ─── ROUTE: Upload files for a subject ───────────────────────────────────────
app.post(
    "/api/upload",
    upload.array("files", 20),
    async (req, res) => {
        try {
            const { subjectId, subjectName } = req.body;
            console.log(`Uploading for subject: ${subjectName} (${subjectId})`);

            if (!subjectId && subjectId !== "0" && subjectId !== 0) {
                return res.status(400).json({ error: "subjectId is required" });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: "No files uploaded" });
            }

            if (!subjectStore[subjectId]) {
                subjectStore[subjectId] = { name: subjectName || `Subject ${subjectId}`, texts: [] };
            } else if (subjectName) {
                subjectStore[subjectId].name = subjectName;
            }

            const results = [];
            for (const file of req.files) {
                try {
                    const text = await extractText(file.path, file.originalname);
                    subjectStore[subjectId].texts.push({
                        fileName: file.originalname,
                        content: text,
                    });
                    results.push({
                        fileName: file.originalname,
                        status: "success",
                        length: text.length
                    });
                } catch (err) {
                    results.push({ fileName: file.originalname, status: "error", error: err.message });
                } finally {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
            }

            res.json({ success: true, subjectId, files: results });
        } catch (err) {
            console.error("Upload route error:", err);
            res.status(500).json({ error: err.message });
        }
    }
);

// ─── ROUTE: Clear subject files ─────────────────────────────────────────────
app.post("/api/clear-subject", (req, res) => {
    const { subjectId } = req.body;
    if (subjectStore[subjectId]) subjectStore[subjectId].texts = [];
    res.json({ success: true });
});

// ─── ROUTE: Chat Q&A ────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
    try {
        const { subjectId, question, subjectName } = req.body;
        const subjectText = getSubjectText(subjectId);
        const name = subjectName || subjectStore[subjectId]?.name || "Subject";

        if (!subjectText) return res.json({ notFound: true, subjectName: name });

        const truncatedText = subjectText.substring(0, 30000);
        const prompt = `You are "AskMyNotes" AI. Answer strictly based on the notes below.
NOTES:
${truncatedText}

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

        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ROUTE: Study Mode (Dashboard Generation) ──────────────────────────────
app.post("/api/study-mode", async (req, res) => {
    try {
        const { subjectId, subjectName } = req.body;
        const subjectText = getSubjectText(subjectId);
        const name = subjectName || subjectStore[subjectId]?.name || "Subject";

        if (!subjectText) return res.status(400).json({ error: "No notes found." });

        console.log(`Generating dashboard for ${name}...`);
        const truncatedText = subjectText.substring(0, 30000);

        const prompt = `Produce a study dashboard for "${name}" based STRICTLY on these notes:
${truncatedText}

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
        // Ensure notes field exists
        if (!result.notes) result.notes = "No summary could be generated from the text provided.";

        res.json(result);
    } catch (err) {
        console.error("Dashboard generation error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── ROUTE: Health check ─────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", subjects: Object.keys(subjectStore).length, uptime: process.uptime() });
});

app.listen(PORT, () => console.log(`🚀 AskMyNotes backend running at http://localhost:${PORT}`));

