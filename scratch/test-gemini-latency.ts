import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";

const testModels = [
  "google/gemini-3.5-flash",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "meta-llama/llama-3.1-8b-instruct"
];

async function testModel(modelId: string) {
  console.log(`\nTesting latency for model: ${modelId}`);
  const messages = [
    { role: "user", content: "Write a short, engaging LinkedIn post about AI and productivity in 100 words." }
  ];

  const start = performance.now();
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: 0.7,
        max_tokens: 300
      })
    });

    const data = await response.json();
    const end = performance.now();
    const elapsed = ((end - start) / 1000).toFixed(2);

    if (response.ok) {
      const content = data.choices?.[0]?.message?.content;
      console.log(`✅ Success in ${elapsed}s! Content preview: ${content?.substring(0, 80).replace(/\n/g, " ")}...`);
      return parseFloat(elapsed);
    } else {
      console.error(`❌ Failed in ${elapsed}s:`, data?.error?.message || "Unknown error");
    }
  } catch (error: any) {
    const end = performance.now();
    const elapsed = ((end - start) / 1000).toFixed(2);
    console.error(`❌ Error in ${elapsed}s:`, error.message);
  }
  return null;
}

async function main() {
  for (const model of testModels) {
    await testModel(model);
  }
}

main().catch(console.error);
