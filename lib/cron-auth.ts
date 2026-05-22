import { NextResponse } from "next/server";

export function verifyCronRequest(req: Request) {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error("[CRON] CRON_SECRET is not set.");
        return NextResponse.json({ error: "System Configuration Error" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    const xCronSecret = req.headers.get("x-cron-secret");
    const querySecret = new URL(req.url).searchParams.get("secret");

    const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        xCronSecret === cronSecret ||
        querySecret === cronSecret;

    if (!isAuthorized) {
        console.warn("[CRON] Unauthorized attempt blocked.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null;
}
