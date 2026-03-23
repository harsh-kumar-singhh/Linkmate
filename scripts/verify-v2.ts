import { PrismaClient } from "@prisma/client";
import { generateAutopilotPosts } from "../lib/autopilot/generator";

const prisma = new PrismaClient();

async function main() {
    console.log("--- AUTOPILOT V2 VERIFICATION ---");

    // 1. Find a Pro User
    const user = await prisma.user.findFirst({
        where: { plan: "PRO", autopilotEnabled: true },
        include: { schedule: true }
    });

    if (!user) {
        console.log("No PRO user with autopilot enabled found. Please enable it for a user first.");
        return;
    }

    const userId = user.id;
    const days = (user.autopilotDays as string[]) || [];

    console.log(`Testing with User: ${user.email} (${userId})`);
    console.log(`User Timezone: ${user.schedule?.timezone || "UTC"}`);
    console.log(`User Days: ${days.join(", ")}`);

    if (days.length === 0) {
        console.log("No autopilot days configured.");
        return;
    }

    // 2. Initial Generation (Simulated Time)
    const testNow = new Date("2026-03-23T08:00:00Z");
    console.log(`\nTEST 1: Initial Generation (Simulated: ${testNow.toISOString()})`);

    let results1Count = 0;

    for (const day of days) {
        const post = await generateAutopilotPosts(
            userId,
            day,          // ✅ REQUIRED
            undefined,    // afterDate
            testNow       // simulated time
        );

        if (post) results1Count++;
    }

    console.log(`Generated ${results1Count} posts.`);

    // 3. Duplicate Protection / Guard (Run again same time)
    console.log(`\nTEST 2: Re-run (Guard Check)`);

    let results2Count = 0;

    for (const day of days) {
        const post = await generateAutopilotPosts(
            userId,
            day,
            undefined,
            testNow
        );

        if (post) results2Count++;
    }

    console.log(`Generated ${results2Count} posts. (Expected 0)`);

    // 4. Delete 1 post & Regenerate
    console.log(`\nTEST 3: Deleting 1 post & Regenerating`);

    const posts = await prisma.post.findMany({
        where: { userId, source: "autopilot" },
        orderBy: { scheduledFor: "asc" },
        take: 1
    });

    if (posts.length > 0) {
        await prisma.post.delete({ where: { id: posts[0].id } });

        console.log(`Deleted post for ${posts[0].scheduledFor?.toISOString()}`);

        let results3Count = 0;

        for (const day of days) {
            const post = await generateAutopilotPosts(
                userId,
                day,
                undefined,
                testNow
            );

            if (post) results3Count++;
        }

        console.log(`Generated ${results3Count} posts. (Expected 1)`);
    }

    console.log("\n--- VERIFICATION COMPLETE ---");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });