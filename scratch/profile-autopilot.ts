import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { prisma } from "../lib/prisma";
import { maintainAutopilotPipeline } from "../lib/autopilot/maintenance";

async function main() {
  console.log("=== Autopilot Profiling Script ===");

  // Find any user, or create one if none exist
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log("No user found in database. Creating a mock user...");
    user = await prisma.user.create({
      data: {
        email: "profile-test@example.com",
        name: "Profile Test User",
        plan: "PRO",
      }
    });
  }

  console.log(`Using User: ${user.email} (${user.id})`);

  // Update user to have a valid autopilot configuration and ensure schedule exists
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "PRO",
      autopilotEnabled: true,
      autopilotTopics: ["AI & Coding", "SaaS Startups", "Productivity Hacks"],
      autopilotDays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
      autopilotTime: "10:00",
      autopilotCurrentFocus: "Improving product performance and reducing AI generation time",
    }
  });

  // Ensure schedule timezone is set
  await prisma.schedule.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      preferredTime: "10:00",
      timezone: "Asia/Kolkata",
    },
    update: {
      timezone: "Asia/Kolkata",
    }
  });

  // Clear future posts to ensure we get a full generation run (3 missing posts)
  const now = new Date();
  const deleted = await prisma.post.deleteMany({
    where: {
      userId: user.id,
      source: "autopilot",
      scheduledFor: { gte: now }
    }
  });
  console.log(`Deleted ${deleted.count} future autopilot posts to reset pipeline.`);

  // Profile maintainAutopilotPipeline
  console.log("\nStarting maintainAutopilotPipeline profiling...");
  const start = performance.now();
  
  const posts = await maintainAutopilotPipeline(user.id, true);
  
  const end = performance.now();
  const elapsedSeconds = ((end - start) / 1000).toFixed(2);

  console.log(`\n=== Results ===`);
  console.log(`Generated ${posts.length} posts`);
  console.log(`Total Time taken: ${elapsedSeconds} seconds`);
  
  posts.forEach((p, idx) => {
    console.log(`Post ${idx + 1}: [${p.scheduledFor?.toISOString()}] Archetype: ${p.archetype} | Topic: ${p.topic}`);
  });
}

main()
  .catch((err) => {
    console.error("Profiling failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });
