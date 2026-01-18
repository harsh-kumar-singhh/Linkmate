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
      throw new Error(
        "LinkedIn account not connected or missing required permissions."
      );
    }

    const authorUrn = `urn:li:person:${account.providerAccountId}`;
    console.log(
      `Attempting to publish to LinkedIn for user ${userId} with URN: ${authorUrn}`
    );

    // 2. LinkedIn API request
    // IMPORTANT:
    // LinkedIn now REQUIRES an explicit active version header.
    // 202312 is currently the last stable active version.
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202312",
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

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      console.error("LinkedIn API error details:", {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      });

      throw new Error(
        data.message ||
          `LinkedIn API error: ${response.status} ${response.statusText}`
      );
    }

    // LinkedIn returns created post URN in x-restli-id header
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