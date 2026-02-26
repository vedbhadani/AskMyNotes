const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const uploadRoutes = require("./routes/upload");
const chatRoutes = require("./routes/chat");
const studyRoutes = require("./routes/study");
const Subject = require("./models/Subject");
const File = require("./models/File");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));


app.use("/api", uploadRoutes);
app.use("/api", chatRoutes);
app.use("/api", studyRoutes);

app.get("/api/health", async (req, res) => {
    try {
        const subjectCount = await Subject.countDocuments();
        const fileCount = await File.countDocuments();
        res.json({
            status: "ok",
            subjects: subjectCount,
            files: fileCount,
            uptime: process.uptime(),
        });
    } catch (err) {
        res.json({ status: "ok", uptime: process.uptime() });
    }
});

async function start() {
    await connectDB();
    app.listen(PORT, () =>
        console.log(`AskMyNotes backend running at http://localhost:${PORT}`)
    );
}

start();
