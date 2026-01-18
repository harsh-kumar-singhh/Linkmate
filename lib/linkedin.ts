import { getPrisma } from "./prisma";

const LINKEDIN_API_URL = "https://api.linkedin.com/rest/posts";

/**
 * LinkedIn officially supported stable version for posting.
 * Do NOT change unless LinkedIn announces a new one.
 */
const LINKEDIN_VERSION = "2023-08";

export async function publishToLinkedIn(userId: string, content: string) {
  const prisma = getPrisma();

  // 1. Fetch LinkedIn account
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "linkedin",
    },
  });

  if (!account?.access_token || !account.providerAccountId) {
    throw new Error("LinkedIn account not connected.");
  }

  const authorUrn = `urn:li:person:${account.providerAccountId}`;

  console.log("[LinkedIn] Publishing post", {
    userId,
    authorUrn,
    version: LINKEDIN_VERSION,
  });

  // 2. Call LinkedIn API
  const response = await fetch(LINKEDIN_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",

      // REQUIRED HEADERS
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_VERSION,
    },
    body: JSON.stringify({
      author: authorUrn,
      commentary: content,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  const rawText = await response.text();
  let data: any;

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { raw: rawText };
  }

  if (!response.ok) {
    console.error("[LinkedIn] Publish failed", {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Explicit error mapping
    if (data?.message?.includes("VERSION")) {
      throw new Error(
        "LinkedIn API version rejected. App does not have access to this version."
      );
    }

    throw new Error(
      data?.message ||
        `LinkedIn API error ${response.status}: ${response.statusText}`
    );
  }

  const postUrn =
    response.headers.get("x-restli-id") || data?.id || "unknown";

  console.log("[LinkedIn] Post published successfully", postUrn);

  return {
    success: true,
    linkedinPostId: postUrn,
  };
}