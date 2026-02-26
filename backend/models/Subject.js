const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
    subjectId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        default: "📘",
    },
    color: {
        type: String,
        default: "s0",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Subject", subjectSchema);
