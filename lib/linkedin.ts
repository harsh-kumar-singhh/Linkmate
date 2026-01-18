import { getPrisma } from "./prisma";

const LINKEDIN_VERSION = "2023-08"; // ✅ last known active REST version

export async function publishToLinkedIn(userId: string, content: string) {
  const prisma = getPrisma();

  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "linkedin",
    },
  });

  if (!account?.access_token || !account.providerAccountId) {
    throw new Error("LinkedIn account not connected");
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_VERSION,
    },
    body: JSON.stringify({
      author: `urn:li:person:${account.providerAccountId}`,
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

  const text = await response.text();
  let data: any = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    console.error("LinkedIn error:", data);
    throw new Error(data.message || "LinkedIn publish failed");
  }

  return {
    success: true,
    linkedinPostId: response.headers.get("x-restli-id"),
  };
}