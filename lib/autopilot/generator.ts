import { getPrisma } from "@/lib/prisma";
import { addDays, format, startOfDay, parse, isAfter, setHours, setMinutes } from "date-fns";

const prisma = getPrisma();

export async function generateAutopilotPosts(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            autopilotEnabled: true,
            autopilotTopics: true,
            autopilotDays: true,
            autopilotTime: true,
            autopilotFrequency: true,
            autopilotAboutYou: true,
            autopilotCurrentFocus: true,
            autopilotWritingStyleId: true,
            plan: true,
            defaultTone: true,
            writingStyles: true,
        },
    });

    if (!user || user.plan?.toUpperCase() !== "PRO") {
        console.log(`[Autopilot] User ${userId} not eligible for autopilot generation.`);
        return;
    }

    const topics = (user.autopilotTopics as string[]) || [];
    const daysEnabled = (user.autopilotDays as string[]) || [];
    const timeStr = user.autopilotTime || "10:00"; // UTC HH:mm
    
    if (topics.length === 0 || daysEnabled.length === 0) {
        console.log(`[Autopilot] User ${userId} has incomplete configuration.`);
        return;
    }

    console.log(`[Autopilot] Starting smart generation pipeline for user ${userId}`);

    const now = new Date();
    
    // 1. Fetch all future autopilot posts
    const futurePosts = await prisma.post.findMany({
        where: {
            userId,
            source: "autopilot",
            scheduledFor: { gt: now }
        }
    });

    // 2. Define valid slots for the next 7 days
    const validSlots: Date[] = [];
    const [utcHours, utcMinutes] = timeStr.split(":").map(Number);

    for (let i = 0; i < 7; i++) {
        const targetDate = addDays(now, i);
        const dayName = format(targetDate, "EEEE");

        if (daysEnabled.includes(dayName)) {
            // Calculate scheduledFor in UTC
            let scheduledFor = new Date(Date.UTC(
                targetDate.getUTCFullYear(),
                targetDate.getUTCMonth(),
                targetDate.getUTCDate(),
                utcHours,
                utcMinutes,
                0,
                0
            ));

            if (isAfter(scheduledFor, now)) {
                validSlots.push(scheduledFor);
            }
        }
    }

    // 3. Diffing: Identify posts to delete
    // - Posts with topics no longer in the list
    // - Posts not matching one of the new valid slots
    for (const postObj of futurePosts) {
        const post = postObj as any;
        const isTopicValid = post.topic && topics.includes(post.topic);
        const isSlotValid = post.scheduledFor && validSlots.some(slot => 
            Math.abs(slot.getTime() - post.scheduledFor!.getTime()) < 60000 // Within 1 minute
        );

        if (post.userModified) {
            console.log(`[Autopilot] Skipping user-modified post: ID=${post.id}`);
            continue;
        }

        if (!isTopicValid || !isSlotValid) {

            console.log(`[Autopilot] Deleting obsolete post: ID=${post.id}, Reason=${!isTopicValid ? "Topic Outdated" : "Slot Outdated"}`);
            await prisma.post.delete({ where: { id: post.id } });
        }
    }

    // 4. Generate missing slots
    const generatedPosts = [];
    const userContext = [
        user.autopilotAboutYou ? `About Me: ${user.autopilotAboutYou}` : "",
        user.autopilotCurrentFocus ? `Current Focus: ${user.autopilotCurrentFocus}` : ""
    ].filter(Boolean).join("\n\n");

    const style = user.defaultTone || "Professional";
    let userWritingSample = undefined;

    // Correct writing style selection logic
    const styles = (user.writingStyles as any[]) || [];
    if (user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default") {
        const matchedStyle = styles.find(s => s.id === user.autopilotWritingStyleId);
        if (matchedStyle?.sample) {
            userWritingSample = matchedStyle.sample;
        }
    } else if (style.includes("Write Like Me") && styles.length > 0) {
        // Fallback for global "Write Like Me" setting
        userWritingSample = styles[0].sample;
    }

    const { generatePost } = require("@/lib/gemini");

    // Fetch existing autopilot posts to determine topic usage for rotation
    const historicalPosts = await prisma.post.findMany({
        where: { userId, source: "autopilot" },
        orderBy: { scheduledFor: "desc" },
        take: 20
    });

    // Count topic occurrences
    const topicUsage: Record<string, number> = {};
    topics.forEach(t => topicUsage[t] = 0);
    historicalPosts.forEach(p => {
        if (p.topic && topicUsage[p.topic] !== undefined) {
            topicUsage[p.topic]++;
        }
    });

    for (const slot of validSlots) {
        // Check if we already have a post for this slot (after cleaning)
        const alreadyHasPost = await prisma.post.findFirst({
            where: {
                userId,
                source: "autopilot",
                scheduledFor: {
                    gte: new Date(slot.getTime() - 30000),
                    lte: new Date(slot.getTime() + 30000)
                }
            }
        });

        if (alreadyHasPost) {
            console.log(`[Autopilot] Slot already filled: ${slot.toISOString()}`);
            // Still count this topic's usage if it already exists
            if (alreadyHasPost.topic && topicUsage[alreadyHasPost.topic] !== undefined) {
                topicUsage[alreadyHasPost.topic]++;
            }
            continue;
        }

        // SMART TOPIC ROTATION: Pick the least used topic
        const sortedTopics = [...topics].sort((a, b) => topicUsage[a] - topicUsage[b]);
        const topic = sortedTopics[0];

        // Update local usage for next slots in this run
        topicUsage[topic]++;

        // Generate new post
        try {
            console.log(`[Autopilot] Generating for slot: ${slot.toISOString()} (Topic: ${topic})`);
            
            const content = await generatePost({
                topic,
                style: user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default" ? "Write Like Me" : style,
                userWritingSample,
                context: userContext || undefined,
                targetLength: 800,
            });

            const status = user.autopilotEnabled ? "SCHEDULED" : "PAUSED";

            const post = await prisma.post.create({
                data: {
                    userId,
                    content,
                    status,
                    scheduledFor: slot,
                    source: "autopilot",
                    topic
                },
            });

            generatedPosts.push(post);
        } catch (error) {
            console.error(`[Autopilot] Failed to generate for slot ${slot.toISOString()}:`, error);
        }
    }

    console.log(`[Autopilot] Generation complete. New posts: ${generatedPosts.length}`);
    return generatedPosts;
}

