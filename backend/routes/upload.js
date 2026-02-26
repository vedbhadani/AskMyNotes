const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfPkg = require("pdf-parse");
const cloudinary = require("../config/cloudinary");
const Subject = require("../models/Subject");
const File = require("../models/File");

const PDFParser = pdfPkg.PDFParse;

const router = express.Router();

// ─── Multer config (temp disk storage) ──────────────────────────────────────
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// ─── ROUTE: Upload files for a subject ───────────────────────────────────────
router.post("/upload", upload.array("files", 20), async (req, res) => {
    try {
        const { subjectId, subjectName } = req.body;
        console.log(`Uploading for subject: ${subjectName} (${subjectId})`);

        if (!subjectId && subjectId !== "0" && subjectId !== 0) {
            return res.status(400).json({ error: "subjectId is required" });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        // Upsert Subject document in MongoDB
        await Subject.findOneAndUpdate(
            { subjectId: String(subjectId) },
            { subjectId: String(subjectId), name: subjectName || `Subject ${subjectId}` },
            { upsert: true, new: true }
        );

        const results = [];
        for (const file of req.files) {
            try {
                // 1. Extract text from the file
                const text = await extractText(file.path, file.originalname);

                // 2. Upload raw file to Cloudinary
                let cloudinaryResult = { secure_url: "", public_id: "" };
                try {
                    cloudinaryResult = await cloudinary.uploader.upload(file.path, {
                        resource_type: "raw",
                        folder: `askmynotes/${subjectId}`,
                        public_id: `${Date.now()}-${file.originalname}`,
                    });
                } catch (cloudErr) {
                    console.error(`Cloudinary upload failed for ${file.originalname}:`, cloudErr.message);
                    // Non-fatal: we still have the extracted text
                }

                // 3. Save File document to MongoDB
                await File.create({
                    subjectId: String(subjectId),
                    fileName: file.originalname,
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    cloudinaryPublicId: cloudinaryResult.public_id,
                    extractedText: text,
                });

                results.push({
                    fileName: file.originalname,
                    status: "success",
                    length: text.length,
                });
            } catch (err) {
                results.push({
                    fileName: file.originalname,
                    status: "error",
                    error: err.message,
                });
            } finally {
                // 4. Always delete temp file
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            }
        }

        res.json({ success: true, subjectId, files: results });
    } catch (err) {
        console.error("Upload route error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── ROUTE: Clear subject files ──────────────────────────────────────────────
router.post("/clear-subject", async (req, res) => {
    try {
        const { subjectId } = req.body;

        // Find all files for this subject
        const files = await File.find({ subjectId: String(subjectId) });

        // Delete each from Cloudinary
        for (const file of files) {
            if (file.cloudinaryPublicId) {
                try {
                    await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
                        resource_type: "raw",
                    });
                } catch (cloudErr) {
                    console.error(`Cloudinary delete failed for ${file.fileName}:`, cloudErr.message);
                }
            }
        }

        // Delete all File documents from MongoDB
        await File.deleteMany({ subjectId: String(subjectId) });

        res.json({ success: true });
    } catch (err) {
        console.error("Clear subject error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
