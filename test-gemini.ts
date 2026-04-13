import { generatePost } from "./lib/gemini";

async function run() {
    try {
        console.log("Generating...");
        const res = await generatePost({
            topic: "Remote work",
            style: "Professional",
            targetLength: 500,
            context: ""
        });
        console.log("Result:", res);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
