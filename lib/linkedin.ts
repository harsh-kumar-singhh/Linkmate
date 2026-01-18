import { getPrisma } from "./prisma";

const LINKEDIN_API_URL = "https://api.linkedin.com/rest/posts";

// REQUIRED for /rest/posts as of current LinkedIn enforcement
const LINKEDIN_VERSION = "2023-08.01";

export async function publishToLinkedIn(userId: string, content: string) {
  const prisma = getPrisma();

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

  console.log("[LinkedIn] Publishing", {
    userId,
    authorUrn,
    version: LINKEDIN_VERSION,
  });

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

  const raw = await response.text();
  let data: any;

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    console.error("[LinkedIn ERROR]", {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    });

    throw new Error(
      data?.message ||
        `LinkedIn publish failed (${response.status})`
    );
  }

  const postUrn =
    response.headers.get("x-restli-id") || data?.id;

  console.log("[LinkedIn] Published successfully:", postUrn);

  return {
    success: true,
    linkedinPostId: postUrn,
  };
}