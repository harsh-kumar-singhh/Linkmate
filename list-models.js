const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env' });
const https = require('https');

async function listModels() {
    console.log("Listing models...");
    if (!process.env.GEMINI_API_KEY) {
        console.error("No API Key found in .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.models) {
                    console.log("Available models:");
                    json.models.forEach(m => {
                        console.log(`- ${m.name} (${m.displayName}) - Supported: ${m.supportedGenerationMethods}`);
                    });
                } else {
                    console.log("No models found or error:", json);
                }
            } catch (e) {
                console.error("Failed to parse response:", e);
                console.log("Raw response:", data);
            }
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

listModels();
