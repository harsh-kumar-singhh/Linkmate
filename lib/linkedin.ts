import { getPrisma } from "./prisma";

export async function publishToLinkedIn(userId: string, content: string, imageUrl?: string | null) {
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

  console.log("[LinkedIn] Attempting to post with author URN:", `urn:li:person:${account.providerAccountId}`);

  const response = await fetch(
    "https://api.linkedin.com/v2/ugcPosts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${account.providerAccountId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
            media: imageUrl ? [
              {
                status: "READY",
                description: {
                  text: "Attached Image"
                },
                media: imageUrl,
                title: {
                  text: "Image"
                }
              }
            ] : undefined,
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    }
  );

  const text = await response.text();
  let data: any = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch { }

  if (!response.ok) {
    const errorLog = {
      status: response.status,
      statusText: response.statusText,
      error: data,
      message: data.message,
      serviceErrorCode: data.serviceErrorCode,
      userId
    };
    console.error(`[LinkedIn] Post failed for user ${userId}:`, JSON.stringify(errorLog));

    // Provide specific error messages for common issues
    if (response.status === 401) {
      throw new Error("LinkedIn authorization expired. Please reconnect your LinkedIn account in Settings.");
    } else if (response.status === 403) {
      throw new Error("LinkedIn posting permission denied. Please reconnect your LinkedIn account with posting permissions.");
    } else {
      throw new Error(data.message || `LinkedIn publish failed (${response.status})`);
    }
  }

  console.log(`[LinkedIn] Post published successfully by user ${userId}. LinkedIn ID: ${data.id}`);

  return {
    success: true,
    linkedinPostId: data.id,
  };
}

/**
 * Fetches recent LinkedIn activity even for posts created outside LinkMate.
 * Requires r_member_social scope.
 */
export async function syncLinkedInPosts(userId: string) {
  const prisma = getPrisma();
  const account = await prisma.account.findFirst({
    where: { userId, provider: "linkedin" }
  });

  if (!account?.access_token || !account.providerAccountId) {
    console.warn(`[LinkedIn Sync] No connected account found for user ${userId}`);
    return [];
  }

  try {
    const authorUrn = `urn:li:person:${account.providerAccountId}`;
    console.log(`[LinkedIn Sync] Fetching activity for ${authorUrn}...`);

    const response = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(authorUrn)})&count=50`,
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[LinkedIn Sync] LinkedIn API error: ${response.status}`, err);
      return [];
    }

    const data = await response.json();
    const elements = data.elements || [];

    // Map LinkedIn posts to a format LinkMate can use for stats and AI
    return elements.map((p: any) => ({
      id: p.id,
      content: p.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "",
      publishedAt: new Date(p.firstPublishedAt || Date.now()),
      isExternal: true,
      // For MVP, we default metrics to 0 or simulate based on whatever's available
      // Full metrics sync would require v2/socialActions or similar per post ID
      views: 0,
      likes: 0,
      comments: 0
    }));
  } catch (error) {
    console.error("[LinkedIn Sync] Unexpected error:", error);
    return [];
  }
}