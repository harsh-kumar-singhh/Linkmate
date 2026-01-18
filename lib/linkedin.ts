import { getPrisma } from "./prisma";

const LINKEDIN_VERSIONS = [
  "2023-08-01",
  "2023-06-01",
  "2023-05-01",
  "2023-03-01",
];

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
    throw new Error("LinkedIn account not connected or missing permissions.");
  }

  const authorUrn = `urn:li:person:${account.providerAccountId}`;
  let lastError: any = null;

  // 2. Try versions one by one
  for (const version of LINKEDIN_VERSIONS) {
    try {
      console.log(`🔁 Trying LinkedIn publish with version ${version}`);

      const response = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": version,
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

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(
          `Version ${version} failed: ${response.status} ${JSON.stringify(data)}`
        );
      }

      const linkedinPostId =
        response.headers.get("x-restli-id") || data.id || "published";

      console.log(`✅ LinkedIn publish succeeded with version ${version}`);

      return {
        success: true,
        linkedinPostId,
        usedVersion: version,
      };
    } catch (err) {
      console.warn(`❌ LinkedIn version ${version} failed`);
      lastError = err;
    }
  }

  // 3. If all versions failed
  console.error("🚨 All LinkedIn versions failed");
  throw lastError || new Error("LinkedIn publish failed on all known versions.");
}