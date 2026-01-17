import { getPrisma } from "./prisma";

export async function publishToLinkedIn(userId: string, content: string) {
  const prisma = getPrisma();
  try {
    // 1. Fetch LinkedIn account for the user
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "linkedin",
      },
    });

    if (!account || !account.access_token || !account.providerAccountId) {
      throw new Error("LinkedIn account not connected or missing required permissions.");
    }

    const authorUrn = `urn:li:person:${account.providerAccountId}`;
    console.log(`Attempting to publish to LinkedIn for user ${userId} with URN: ${authorUrn}`);

    // 2. Prepare the LinkedIn API request
    // Recent LinkedIn API requires a version header and uses /rest/posts
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401", // Use a confirmed stable 2024 version to avoid "not active" errors
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

    let data;
    const responseText = await response.text();
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      data = { text: responseText };
    }

    if (!response.ok) {
      console.error("LinkedIn API error details:", {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(data.message || `LinkedIn API error: ${response.status} ${response.statusText}`);
    }

    // 3. Return the LinkedIn post ID
    // Header x-restli-id contains the URN of the created post
    const linkedinId = response.headers.get("x-restli-id");

    return {
      success: true,
      linkedinPostId: linkedinId || data.id || "published",
    };
  } catch (error) {
    console.error("Error in publishToLinkedIn:", error);
    throw error;
  }
}
