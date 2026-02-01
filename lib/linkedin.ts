import { getPrisma } from "./prisma";

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
            shareMediaCategory: "NONE",
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