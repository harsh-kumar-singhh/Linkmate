import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { prisma } from "../lib/prisma";
import { generateAutopilotPosts } from "../lib/autopilot/generator";
import { format } from "date-fns";

async function main() {
    // 1. Find a Pro user with Autopilot setup
    const user = await prisma.user.findFirst({
        where: {
            plan: {
                equals: "pro",
                mode: "insensitive"
            },
            autopilotEnabled: true
        },
        select: {
            id: true,
            email: true,
            autopilotDays: true
        }
    });

    if (!user) {
        console.log("No Pro user with Autopilot enabled found in database.");
        return;
    }

    console.log(`Verifying Autopilot for user: ${user.email} (${user.id})`);

    const days = (user.autopilotDays as string[]) || [];

    if (days.length === 0) {
        console.log("User has no autopilot days configured.");
        return;
    }

    // 2. Trigger Generation for ALL selected days
    console.log("\nTriggering generation...");

    let allPosts: any[] = [];

    for (const day of days) {
        console.log(`\n→ Generating for ${day}`);

        const post = await generateAutopilotPosts(
            user.id,
            day // ✅ REQUIRED param
        );

        if (post) {
            allPosts.push(post);
        }
    }

    // 3. Results
    if (allPosts.length > 0) {
        console.log(`\n✅ Success! Generated ${allPosts.length} posts.`);

        allPosts.forEach((p) => {
            console.log(
                `- [${format(p.scheduledFor!, "yyyy-MM-dd HH:mm")}] ${p.content.substring(0, 50)}...`
            );
        });
    } else {
        console.log("\nNo new posts were generated.");
    }
}

main()
    .catch((err) => {
        console.error("Verification failed:", err);
    })
    .finally(async () => {
        await prisma.$disconnect();
        process.exit();
    });
