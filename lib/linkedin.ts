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
  } catch {}

  if (!response.ok) {
    console.error("LinkedIn UGC error:", data);
    throw new Error(data.message || "LinkedIn publish failed");
  }

  return {
    success: true,
    linkedinPostId: data.id,
  };
}