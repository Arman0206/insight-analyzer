const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// --- MongoDB Schema ---
const SummarySchema = new mongoose.Schema({
    link: { type: String, required: true, unique: true },
    result: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Summary = mongoose.model('Summary', SummarySchema);

// --- Core API Route ---
app.post('/analyze', async (req, res) => {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: "Link is required" });

    try {
        // 1. Check Database Cache
        const cachedSummary = await Summary.findOne({ link });
        if (cachedSummary) {
            console.log("🚀 Returning cached result from MongoDB!");
            return res.json({ result: cachedSummary.result });
        }

        console.log("⚙️ Spawning Python NLP Worker...");
        
        // 2. Execute Python Worker
        const scriptPath = path.join(__dirname, 'python_worker', 'run.py');
        const pythonProcess = spawn(process.env.PYTHON_EXECUTABLE || 'python', [scriptPath, link]);

        let rawData = '';

        pythonProcess.stdout.on('data', (data) => {
            rawData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.warn(`Python Warning/Log: ${data}`);
        });

        pythonProcess.on('close', async (code) => {
            try {
                const jsonMatch = rawData.match(/\{.*\}/s);
                if (!jsonMatch) throw new Error("Worker did not return valid JSON.");

                const parsedData = JSON.parse(jsonMatch[0]);

                if (parsedData.error) {
                    return res.status(400).json({ error: parsedData.error });
                }

                // 3. Cache the result in MongoDB
                const newSummary = new Summary({ link, result: parsedData.result });
                await newSummary.save();

                // 4. Return to Frontend
                return res.json(parsedData);

            } catch (err) {
                console.error("Worker Parsing Error:", err);
                return res.status(500).json({ error: "Failed to process NLP data." });
            }
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- Initialization ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ Connected to MongoDB");
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`🚀 Express Server running on port ${PORT}`));
    })
    .catch(err => console.error("❌ MongoDB connection error:", err));