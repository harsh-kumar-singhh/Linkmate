const { AI_CORE_CONFIG } = require("../lib/ai/config");
const { getCoachErrorResponse, AIError } = require("../lib/openrouter");

async function testCoachErrors() {
    console.log("--- Testing AI Coach Error Mapping ---");

    const errors = [
        { type: 'QUOTA_EXCEEDED', expectedCode: 'QUOTA_EXCEEDED' },
        { type: 'AUTH_MISSING', expectedCode: 'AUTH_MISSING' },
        { type: 'MODEL_FAILURE', expectedCode: 'MODEL_FAILURE' },
        { type: 'TIMEOUT', expectedCode: 'TIMEOUT' },
        { type: 'UNKNOWN_INTERNAL', expectedCode: 'UNKNOWN_INTERNAL' }
    ];

    for (const errDef of errors) {
        const aiErr = new AIError("Test error", errDef.type);
        const response = getCoachErrorResponse(aiErr);

        console.log(`Input Type: ${errDef.type}`);
        console.log(`Result Code: ${response.code}`);
        console.log(`Result Error: ${response.error}`);

        if (response.code !== errDef.expectedCode) {
            console.error(`FAIL: Expected ${errDef.expectedCode}, got ${response.code}`);
        } else {
            console.log("PASS");
        }
        console.log("---");
    }
}

// Note: This script assumes commonjs for simplicity in execution if needed, 
// but since the project is TS, this is just for logical verification here.
testCoachErrors().catch(console.error);
