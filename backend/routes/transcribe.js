const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const auth = require("../utils/authMiddleware");

const router = express.Router();

// ── Multer config ────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname || ".webm")),
});
const upload = multer({ storage });

// ── Lazy-load Whisper model ──────────────────────────────────
let transcriber = null;

async function getTranscriber() {
    if (transcriber) return transcriber;

    console.log("⏳  Loading Whisper model (first run downloads ~150 MB)…");
    const { pipeline, env } = await import("@huggingface/transformers");

    // Force local cache to avoid corrupted global files
    env.cacheDir = path.join(__dirname, "..", ".cache");

    transcriber = await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny.en",
        { dtype: "fp32" }
    );

    console.log("✅  Whisper model loaded and ready!");
    return transcriber;
}

// ── Helper: convert any audio → 16 kHz mono WAV via ffmpeg ──
function convertToWav(inputPath) {
    const wavPath = inputPath.replace(/\.[^.]+$/, ".wav");
    execSync(
        `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`,
        { stdio: "ignore" }
    );
    return wavPath;
}

// ── Helper: read 16-bit PCM WAV → Float32Array ──────────────
function readWavAsFloat32(filePath) {
    const buffer = fs.readFileSync(filePath);
    let offset = 12;
    while (offset < buffer.length - 8) {
        const chunkId = buffer.toString("ascii", offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        if (chunkId === "data") {
            offset += 8;
            const pcmData = buffer.subarray(offset, offset + chunkSize);
            const float32 = new Float32Array(pcmData.length / 2);
            for (let i = 0; i < float32.length; i++) {
                float32[i] = pcmData.readInt16LE(i * 2) / 32768.0;
            }
            return float32;
        }
        offset += 8 + chunkSize;
    }
    throw new Error("Could not find data chunk in WAV file");
}

// ── POST /api/transcribe ─────────────────────────────────────
router.post("/transcribe", auth, upload.single("audio"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
    }

    const uploadedPath = path.resolve(req.file.path);
    let wavPath = null;

    try {
        const asr = await getTranscriber();

        console.log(`🎙️  Transcribing: ${req.file.originalname || "recording"}`);
        wavPath = convertToWav(uploadedPath);

        const audioData = readWavAsFloat32(wavPath);
        const result = await asr(audioData);

        console.log("✅  Transcription complete");
        res.json({ text: result.text.trim() });
    } catch (err) {
        console.error("❌  Transcription error:", err);
        res.status(500).json({ error: "Transcription failed", details: err.message });
    } finally {
        try { fs.unlinkSync(uploadedPath); } catch (_) { }
        if (wavPath) try { fs.unlinkSync(wavPath); } catch (_) { }
    }
});

module.exports = router;
