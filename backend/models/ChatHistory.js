const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema({
    subjectId: {
        type: String,
        required: true,
        index: true,
    },
    question: {
        type: String,
        required: true,
    },
    response: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
