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
    for (const post of futurePosts) {
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

    if (user.autopilotWritingStyleId === "default" || style.includes("Write Like Me")) {
        const styles = (user.writingStyles as any[]) || [];
        if (styles.length > 0) {
            if (user.autopilotWritingStyleId === "default") {
                userWritingSample = styles[0].sample;
            } else {
                const parts = style.split(/[\u2014\u2013-]/);
                const styleName = parts.length > 1 ? parts[parts.length - 1].trim().toLowerCase() : "";
                const matchedStyle = styles.find(s => s.name?.trim().toLowerCase() === styleName);
                if (matchedStyle?.sample) {
                    userWritingSample = matchedStyle.sample;
                }
            }
        }
    }

    const { generatePost } = require("@/lib/gemini");

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
            continue;
        }

        // Generate new post
        try {
            const topic = topics[Math.floor(Math.random() * topics.length)];
            console.log(`[Autopilot] Generating for slot: ${slot.toISOString()} (Topic: ${topic})`);
            
            const content = await generatePost({
                topic,
                style: user.autopilotWritingStyleId ? "Write Like Me" : style,
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

