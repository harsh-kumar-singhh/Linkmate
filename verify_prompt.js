
const AI_CORE_CONFIG = {
    WRITE_LIKE_ME: {
        instruction: "You are a clone of the user's writing brain. Your ONLY goal is to replicate their exact sentence rhythm, formatting quirks, and tone intensity.",
        rules: [
            "STRICTLY mimic the user's line spacing (e.g., if they use single lines vs blocks).",
            "STRICTLY mimic the user's sentence structure (e.g., fragments vs full sentences).",
            "STRICTLY preserve their casing style (e.g., if they start lines with lowercase).",
            "Do NOT use bullet points, bold text, or emojis unless the user's sample uses them.",
            "Do NOT 'fix' their grammar or punctuation style; copy it.",
            "Do NOT add 'LinkedIn-style' dramatic spacing unless the sample has it."
        ]
    }
};

const userWritingSample = "i write in lowercase.\nno punctuation usually";
const context = "Make it about coding.";

let prompt = "Initial Prompt...";

if (userWritingSample) {
    prompt += `\n\nCRITICAL - WRITING STYLE REPLICATION (WRITE LIKE ME):
${AI_CORE_CONFIG.WRITE_LIKE_ME.instruction}
${AI_CORE_CONFIG.WRITE_LIKE_ME.rules.map(r => `- ${r}`).join('\n')}

REFERENCE SAMPLE (Everything below is the style truth):
"""
${userWritingSample}
"""

Usage Instructions:
1. Ignore standard grammar rules if the sample ignores them.
2. If the sample uses lowercase for line starts, YOU MUST TOO.
3. If the sample has no emojis, YOU MUST HAVE NONE.
4. Structure your response directly based on the visual rhythm of the sample.`;
}

if (context) {
    prompt += `\n\nSpecific Context to include:\n"${context}"`;
}

console.log("--- GENERATED PROMPT ---");
console.log(prompt);
console.log("------------------------");

if (prompt.includes("CRITICAL - WRITING STYLE REPLICATION") && prompt.includes("YOU MUST TOO")) {
    console.log("SUCCESS: Strict instructions found.");
} else {
    console.error("FAILURE: Instructions missing.");
}
