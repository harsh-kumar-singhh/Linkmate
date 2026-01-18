import { getPrisma } from "./prisma";

export async function publishToLinkedIn(userId: string, content: string) {
  const prisma = getPrisma();

  try {
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

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        // ✅ THIS IS THE KEY FIX
        "LinkedIn-Version": "202308",
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
      console.error("LinkedIn API error:", {
        status: response.status,
        data,
      });
      throw new Error(
        data.message || `LinkedIn API error ${response.status}`
      );
    }

    const linkedinPostUrn = response.headers.get("x-restli-id");

    return {
      success: true,
      linkedinPostId: linkedinPostUrn,
    };
  } catch (err) {
    console.error("publishToLinkedIn failed:", err);
    throw err;
  }
}