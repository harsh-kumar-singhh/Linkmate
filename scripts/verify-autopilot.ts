import { getPrisma } from "../lib/prisma";
import { generateAutopilotPosts } from "../lib/autopilot/generator";
import { format } from "date-fns";

async function main() {
    const prisma = getPrisma();
    
    // 1. Find a Pro user with Autopilot setup
    const user = await prisma.user.findFirst({
        where: {
            plan: {
                equals: "pro",
                mode: "insensitive"
            },
            autopilotEnabled: true
        }
    });

    if (!user) {
        console.log("No Pro user with Autopilot enabled found in database.");
        return;
    }

    console.log(`Verifying Autopilot for user: ${user.email} (${user.id})`);

    // 2. Trigger Generation
    console.log("\nTriggering generation...");
    const posts = await generateAutopilotPosts(user.id);

    if (posts && posts.length > 0) {
        console.log(`✅ Success! Generated ${posts.length} posts.`);
        posts.forEach(p => {
            console.log(`- [${format(p.scheduledFor!, "yyyy-MM-dd HH:mm")}] ${p.content.substring(0, 50)}...`);
        });
    } else {
        console.log("No new posts were generated.");
    }
}

main()
    .catch(err => {
        console.error("Verification failed:", err);
    })
    .finally(() => process.exit());
