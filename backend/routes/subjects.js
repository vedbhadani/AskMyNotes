const express = require("express");
const Subject = require("../models/Subject");
const File = require("../models/File");
const auth = require("../utils/authMiddleware");

const router = express.Router();

// @route   GET /api/subjects
// @desc    Get all subjects for the authenticated user
router.get("/", auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const subjects = await Subject.find({ userId }).sort({ createdAt: -1 });

        // Enhance subjects with their file list metadata
        const enhancedSubjects = await Promise.all(subjects.map(async (s) => {
            const files = await File.find({ subjectId: s.subjectId, userId }).select("fileName uploadedAt");
            return {
                ...s.toObject(),
                id: s.subjectId, // frontend expects id
                files: files.map(f => ({ name: f.fileName, uploadedAt: f.uploadedAt }))
            };
        }));

        res.json(enhancedSubjects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   DELETE /api/subjects/:subjectId
// @desc    Delete a subject and all its files
router.delete("/:subjectId", auth, async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user._id;

        // Delete files first
        await File.deleteMany({ subjectId, userId });

        // Delete subject
        const result = await Subject.findOneAndDelete({ subjectId, userId });

        if (!result) {
            return res.status(404).json({ message: "Subject not found" });
        }

        res.json({ message: "Subject and associated files deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   DELETE /api/subjects/:subjectId/files/:fileName
// @desc    Delete a specific file from a subject
router.delete("/:subjectId/files/:fileName", auth, async (req, res) => {
    try {
        const { subjectId, fileName } = req.params;
        const userId = req.user._id;

        const result = await File.findOneAndDelete({ subjectId, fileName, userId });

        if (!result) {
            return res.status(404).json({ message: "File not found" });
        }

        res.json({ message: "File deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/subjects/:subjectId/files/:fileName/content
// @desc    Get the full extracted text of a specific file
router.get("/:subjectId/files/:fileName/content", auth, async (req, res) => {
    try {
        const { subjectId, fileName } = req.params;
        const userId = req.user._id;

        const file = await File.findOne({ subjectId, fileName, userId });

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        res.json({ text: file.extractedText });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
