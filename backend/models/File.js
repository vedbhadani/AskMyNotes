const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    subjectId: {
        type: String,
        required: true,
        index: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    cloudinaryUrl: {
        type: String,
        default: "",
    },
    cloudinaryPublicId: {
        type: String,
        default: "",
    },
    extractedText: {
        type: String,
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("File", fileSchema);
