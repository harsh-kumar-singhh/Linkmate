import { generatePost } from "./lib/gemini";

async function test() {
  try {
    const res = await generatePost({
      topic: "Remote work tips",
      style: "Casual",
      targetLength: 700
    });
    console.log("RESULT:");
    console.log(res);
  } catch (e) {
    console.error("ERROR:");
    console.error(e);
  }
}
test();
