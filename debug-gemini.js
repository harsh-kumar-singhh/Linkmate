const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env' });

async function debug() {
    console.log("Starting debug...");
    if (!process.env.GEMINI_API_KEY) {
        console.error("No API Key found in .env");
        return;
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

    for (const modelName of models) {
        console.log(`Testing ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            console.log(`SUCCESS: ${modelName}`);
            return;
        } catch (e) {
            console.log(`FAILED: ${modelName}`);
            // console.log(e); // Reduce noise
        }
    }
    console.log("All models failed.");
}
debug();
