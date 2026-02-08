
// Mock data and classes since we can't easily import TS in a simple node script without setup
class AIError extends Error {
    constructor(message, type, model_id) {
        super(message);
        this.name = 'AIError';
        this.type = type;
        this.model_id = model_id;
    }
}

const AI_MODELS = [
    { id: "model-1", priority: 1, role: "primary" },
    { id: "model-2", priority: 2, role: "fallback" }
];

function classifyError(status, message) {
    if (status === 429) {
        if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('credit')) {
            return 'QUOTA_EXHAUSTED';
        }
        return 'RATE_LIMIT';
    }
    return 'UNKNOWN_ERROR';
}

async function generateWithFallbackMock(messages, forceErrorOnce = false) {
    let lastError = null;
    const sortedModels = [...AI_MODELS].sort((a, b) => a.priority - b.priority);

    for (let i = 0; i < sortedModels.length; i++) {
        const model = sortedModels[i];
        const attempt = i + 1;

        try {
            console.log(`[TEST] Attempt ${attempt} with model: ${model.id}`);

            if (forceErrorOnce && i === 0) {
                throw new AIError("Simulated Quota Exhausted", "QUOTA_EXHAUSTED", model.id);
            }

            // Simulate successful response for the second model
            if (model.id === "model-2") {
                return "SUCCESS from model-2";
            }

            return "SUCCESS from model-1";

        } catch (error) {
            console.log(`[TEST] Model ${model.id} failed: ${error.type}. Falling back...`);
            lastError = error;
        }
    }
    throw lastError;
}

async function runTests() {
    console.log("--- Test 1: Primary Success ---");
    const res1 = await generateWithFallbackMock([{ role: 'user', content: 'hi' }]);
    console.log("Result:", res1);

    console.log("\n--- Test 2: Sequential Fallback ---");
    const res2 = await generateWithFallbackMock([{ role: 'user', content: 'hi' }], true);
    console.log("Result:", res2);
}

runTests().catch(console.error);
