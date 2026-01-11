const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to get client
        // Actually the SDK doesn't expose listModels directly on the main class easily in all versions, 
        // but usually it's on the client. 
        // Wait, the error says "Call ListModels". 
        // In newer SDKs:
        // const models = await genAI.listModels(); 
        // But SDK might not strictly follow that. 
        // Let's try to use the model we have but if it fails we want to know why.

        // Actually, let's just try to generate with 'gemini-pro' as a test in this script.
        console.log("Trying gemini-pro...");
        const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
        const resultPro = await modelPro.generateContent("Hello");
        console.log("gemini-pro worked:", resultPro.response.text());

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
