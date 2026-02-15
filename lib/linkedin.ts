import { getPrisma } from "./prisma";

export async function publishToLinkedIn(userId: string, content: string, imageUrl?: string | null, imageData?: string | null) {
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

  let mediaAsset = null;

  if (imageData || imageUrl) {
    try {
      console.log("[LinkedIn] Detected image, registering upload...");

      // 1. Register Upload
      const registerResponse = await fetch(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: `urn:li:person:${account.providerAccountId}`,
              serviceRelationships: [
                {
                  relationshipType: "OWNER",
                  identifier: "urn:li:userGeneratedContent",
                },
              ],
            },
          }),
        }
      );

      if (!registerResponse.ok) {
        const errData = await registerResponse.json();
        throw new Error(`Failed to register upload: ${JSON.stringify(errData)}`);
      }

      const registerData = await registerResponse.json();
      const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
      mediaAsset = registerData.value.asset;

      console.log("[LinkedIn] Upload registered. Asset:", mediaAsset);

      // 2. Prepare the image binary
      let imageBuffer: Buffer;

      if (imageData) {
        console.log("[LinkedIn] Using image data from database (base64)");
        imageBuffer = Buffer.from(imageData, "base64");
      } else if (imageUrl && imageUrl.startsWith("http")) {
        console.log("[LinkedIn] Fetching image from URL:", imageUrl);
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error(`Failed to fetch image from URL: ${imgRes.statusText}`);
        imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      } else {
        throw new Error("No valid image data or URL provided for LinkedIn upload.");
      }

      console.log("[LinkedIn] Uploading binary data to LinkedIn... Size:", imageBuffer.length);
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array(imageBuffer),
      });

      if (!uploadResponse.ok) {
        const errMsg = await uploadResponse.text();
        throw new Error(`Failed to upload binary: ${uploadResponse.status} ${errMsg}`);
      }

      console.log("[LinkedIn] Image upload successful.");
    } catch (error) {
      console.error("[LinkedIn] Image processing failed:", error);
      throw error; // Fail the whole process if image upload fails
    }
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
            shareMediaCategory: mediaAsset ? "IMAGE" : "NONE",
            media: mediaAsset ? [
              {
                status: "READY",
                description: {
                  text: "LinkMate Post Image"
                },
                media: mediaAsset,
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