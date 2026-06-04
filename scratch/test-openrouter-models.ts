import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("No OPENROUTER_API_KEY found.");
    return;
  }
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      "Authorization": `Bearer ${apiKey}`
    }
  });
  const data = await response.json();
  const models = data.data || [];
  console.log("Found models:");
  const geminiModels = models.filter((m: any) => m.id.toLowerCase().includes("gemini"));
  geminiModels.forEach((m: any) => {
    console.log(`- ${m.id} (${m.name})`);
  });
}

main().catch(console.error);
