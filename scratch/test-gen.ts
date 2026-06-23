import { generatePost } from "../lib/gemini";

async function run() {
  const topics = [
    "Why software engineers should write more",
    "The importance of deep work",
    "How to hire a great designer",
    "Mistakes founders make with pricing"
  ];

  for (const topic of topics) {
    console.log(`\n\n--- Generating for topic: ${topic} ---`);
    const content = await generatePost({
      topic,
      style: "Professional",
      targetLength: 800
    });
    console.log("HOOK:", content.split('\n')[0]);
    console.log(content.substring(0, 300) + "...");
  }
}

run().catch(console.error);
