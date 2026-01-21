"use server";

import { getRemixesContainer } from "@/lib/cosmos";
import { AzureOpenAI } from "openai";

// Initialize Azure OpenAI client
const createOpenAIClient = () => {
  const baseUrl = process.env.OPENAI_BASE_URL || "";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const deployment = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Missing OpenAI configuration: OPENAI_BASE_URL or OPENAI_API_KEY"
    );
  }

  return new AzureOpenAI({
    apiKey,
    apiVersion: "2024-08-01-preview",
    baseURL: baseUrl.endsWith("/") 
      ? `${baseUrl}openai/deployments/${deployment}` 
      : `${baseUrl}/openai/deployments/${deployment}`,
  });
};

let openaiClient: AzureOpenAI | null = null;

const getOpenAIClient = () => {
  if (!openaiClient) {
    openaiClient = createOpenAIClient();
  }
  return openaiClient;
};

export interface RemixVariation {
  id: string;
  platform: "linkedin" | "twitter" | "instagram";
  angle: "narrative" | "educational" | "question" | "practical" | "story";
  content: string;
  hashtags?: string[];
  characterCount: number;
  status?: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduledFor?: string;
  publishedAt?: string;
}

export interface RemixRecord {
  id: string;
  userId: string;
  sourceContent: string;
  variations: RemixVariation[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  createdAt: string;
  publishedAt?: string;
  publishedVariationIds?: string[];
}

const MAX_EMOJI_COUNT = 3;

const stripMarkdown = (text: string) => {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+$/g, "")
    .trim();
};

const limitEmojis = (text: string, maxCount: number) => {
  const emojiMatches = text.match(/\p{Extended_Pictographic}/gu);
  if (!emojiMatches || emojiMatches.length <= maxCount) {
    return text;
  }

  let remaining = maxCount;
  return text.replace(/\p{Extended_Pictographic}/gu, (match) => {
    if (remaining > 0) {
      remaining -= 1;
      return match;
    }
    return "";
  });
};

const normalizePostContent = (text: string) => {
  const withoutMarkdown = stripMarkdown(text);
  return limitEmojis(withoutMarkdown, MAX_EMOJI_COUNT);
};

const resolveRemixStatus = (variations: RemixVariation[]) => {
  if (variations.some((variation) => variation.status === "PUBLISHED")) {
    return "PUBLISHED";
  }
  if (variations.some((variation) => variation.status === "SCHEDULED")) {
    return "SCHEDULED";
  }
  return "DRAFT";
};

/**
 * Generate multiple platform-specific variations using Azure OpenAI
 * @param sourceContent The transcript/notes to repurpose
 * @param userId The user's ID for partitioning
 * @returns The generated remix record with multiple variations
 */
export async function generateRemix(
  sourceContent: string,
  userId: string
): Promise<RemixRecord> {
  try {
    // Validate inputs
    if (!sourceContent?.trim()) {
      throw new Error("Source content is required");
    }
    if (!userId?.trim()) {
      throw new Error("User ID is required");
    }

    console.log("[generateRemix] Starting multi-variation generation for userId:", userId);

    const client = getOpenAIClient();

    // Define variation generation prompts for different angles and platforms
    const generationTasks = [
      {
        angle: "narrative" as const,
        platform: "linkedin" as const,
        prompt: `You are a ghostwriter for a tech thought leader. Write a narrative-driven LinkedIn post with a human voice. Focus on storytelling, personal insights, and a clear takeaway. Use very few emojis (0-3 max). Avoid markdown and avoid bullet lists. Make the opening line distinct from other variations. Target: 800-1200 characters. Write ONLY the post content, no explanations.\n\nHumanization rules:\nYou are a strict editor removing AI-isms. Rewrite the text to be natural, neutral, and human. Strict Constraints:\nBANNED WORDS: 'delve', 'tapestry', 'testament', 'underscores', 'pivotal', 'landscape', 'nuanced', 'multifaceted'.\nSTRUCTURE: Avoid 'Not only... but also'. No lists of 3 unless necessary.\nTONE: Remove puffery/exaggeration. If mundane, keep it mundane. No 'In conclusion'.\nHEADERS: Use Sentence case, NOT Title Case.\n\nSource:\n${sourceContent}`,
      },
      {
        angle: "educational" as const,
        platform: "linkedin" as const,
        prompt: `You are a ghostwriter for a tech thought leader. Write an educational LinkedIn post that teaches key concepts with clear, simple structure. Use short paragraphs, no markdown, and no bullet lists. Use very few emojis (0-3 max). Make the structure and tone clearly different from the other variations. Target: 800-1200 characters. Write ONLY the post content, no explanations.\n\nHumanization rules:\nYou are a strict editor removing AI-isms. Rewrite the text to be natural, neutral, and human. Strict Constraints:\nBANNED WORDS: 'delve', 'tapestry', 'testament', 'underscores', 'pivotal', 'landscape', 'nuanced', 'multifaceted'.\nSTRUCTURE: Avoid 'Not only... but also'. No lists of 3 unless necessary.\nTONE: Remove puffery/exaggeration. If mundane, keep it mundane. No 'In conclusion'.\nHEADERS: Use Sentence case, NOT Title Case.\n\nSource:\n${sourceContent}`,
      },
      {
        angle: "question" as const,
        platform: "linkedin" as const,
        prompt: `You are a ghostwriter for a tech thought leader. Write a thought-provoking LinkedIn post that opens with a strong question or challenges a common assumption. Encourage discussion with a natural, conversational voice. Use very few emojis (0-3 max). Avoid markdown and avoid bullet lists. Make this feel clearly distinct from the other variations. Target: 800-1200 characters. Write ONLY the post content, no explanations.\n\nHumanization rules:\nYou are a strict editor removing AI-isms. Rewrite the text to be natural, neutral, and human. Strict Constraints:\nBANNED WORDS: 'delve', 'tapestry', 'testament', 'underscores', 'pivotal', 'landscape', 'nuanced', 'multifaceted'.\nSTRUCTURE: Avoid 'Not only... but also'. No lists of 3 unless necessary.\nTONE: Remove puffery/exaggeration. If mundane, keep it mundane. No 'In conclusion'.\nHEADERS: Use Sentence case, NOT Title Case.\n\nSource:\n${sourceContent}`,
      },
      {
        angle: "practical" as const,
        platform: "linkedin" as const,
        prompt: `You are a ghostwriter for a tech thought leader. Write a practical, actionable LinkedIn post with concrete steps readers can apply. Use short paragraphs with line breaks only (no bullets, no markdown). Use very few emojis (0-3 max). Ensure this feels different in tone and structure from the other variations. Target: 800-1200 characters. Write ONLY the post content, no explanations.\n\nHumanization rules:\nYou are a strict editor removing AI-isms. Rewrite the text to be natural, neutral, and human. Strict Constraints:\nBANNED WORDS: 'delve', 'tapestry', 'testament', 'underscores', 'pivotal', 'landscape', 'nuanced', 'multifaceted'.\nSTRUCTURE: Avoid 'Not only... but also'. No lists of 3 unless necessary.\nTONE: Remove puffery/exaggeration. If mundane, keep it mundane. No 'In conclusion'.\nHEADERS: Use Sentence case, NOT Title Case.\n\nSource:\n${sourceContent}`,
      },
      {
        angle: "narrative" as const,
        platform: "twitter" as const,
        prompt: `You are a ghostwriter for a tech thought leader. Create a punchy, engaging tweet (max 140 characters) based on this source material. Include 1-2 relevant hashtags. Avoid markdown. Use very few emojis (0-2 max). Write ONLY the tweet, no explanations.\n\nHumanization rules:\nYou are a strict editor removing AI-isms. Rewrite the text to be natural, neutral, and human. Strict Constraints:\nBANNED WORDS: 'delve', 'tapestry', 'testament', 'underscores', 'pivotal', 'landscape', 'nuanced', 'multifaceted'.\nSTRUCTURE: Avoid 'Not only... but also'. No lists of 3 unless necessary.\nTONE: Remove puffery/exaggeration. If mundane, keep it mundane. No 'In conclusion'.\nHEADERS: Use Sentence case, NOT Title Case.\n\nSource:\n${sourceContent}`,
      },
    ];

    console.log("[generateRemix] Generating", generationTasks.length, "variations in parallel...");

    // Make all API calls in parallel
    const variationPromises = generationTasks.map(async (task) => {
      try {
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert ghostwriter and content creator specializing in professional tech thought leadership.",
            },
            {
              role: "user",
              content: task.prompt,
            },
          ],
          max_tokens: task.platform === "twitter" ? 300 : 1500,
          temperature: 0.8,
        });

        const rawContent = response.choices[0]?.message?.content || "";
        const content = normalizePostContent(rawContent);
        
        // Extract hashtags for Twitter posts
        const hashtags = task.platform === "twitter" 
          ? content.match(/#\w+/g) || [] 
          : undefined;

        const variation: RemixVariation = {
          id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          platform: task.platform,
          angle: task.angle,
          content,
          hashtags: hashtags && hashtags.length > 0 ? hashtags : undefined,
          characterCount: content.length,
          status: "DRAFT",
        };

        console.log(`[generateRemix] Generated ${task.platform} (${task.angle}): ${content.substring(0, 50)}...`);
        return variation;
      } catch (error) {
        console.error(`[generateRemix] Error generating ${task.platform} variation:`, error);
        throw error;
      }
    });

    const variations = await Promise.all(variationPromises);

    console.log("[generateRemix] All variations generated successfully");

    // Create remix record with multiple variations
    const remixRecord: RemixRecord = {
      id: `remix_${Date.now()}`,
      userId,
      sourceContent,
      variations,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };

    // Save to Cosmos DB
    console.log("[generateRemix] Saving to Cosmos DB...");
    const container = await getRemixesContainer();
    
    try {
      const response = await container.items.upsert(remixRecord);
      console.log("[generateRemix] Remix with", variations.length, "variations saved successfully (Status:", response.statusCode + ")");
    } catch (dbError) {
      console.error("[generateRemix] Cosmos DB save error:", dbError);
      throw new Error(`Failed to save remix to Cosmos DB: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }
    
    return remixRecord;
  } catch (error) {
    console.error("[generateRemix] Error:", error);
    throw error;
  }
}

/**
 * Publish a specific variation to LinkedIn
 * @param remixId The ID of the remix
 * @param userId The user's ID for partition key
 * @param variationId The ID of the specific variation to publish
 * @param accessToken LinkedIn access token from session
 * @returns Updated remix record
 */
export async function publishToLinkedIn(
  remixId: string,
  userId: string,
  variationId: string,
  accessToken: string
): Promise<RemixRecord> {
  try {
    // Fetch the remix from Cosmos DB
    const container = await getRemixesContainer();
    const { resource: remixRecord } = await container
      .item(remixId, userId)
      .read<RemixRecord>();

    if (!remixRecord) {
      throw new Error("Remix not found");
    }

    // Find the specific variation
    const variation = remixRecord.variations.find(v => v.id === variationId);
    if (!variation) {
      throw new Error("Variation not found");
    }

    // Only LinkedIn variations can be published via this function
    if (variation.platform !== "linkedin") {
      throw new Error("Only LinkedIn variations can be published via this function");
    }

    const normalizeMemberId = (value: string) => {
      if (value.startsWith("urn:li:member:")) {
        return value.replace("urn:li:member:", "");
      }
      if (value.startsWith("urn:li:person:")) {
        return value.replace("urn:li:person:", "");
      }
      return value;
    };

    const toAuthorUrn = (value: string) => {
      if (value.startsWith("urn:li:person:") || value.startsWith("urn:li:organization:")) {
        return value;
      }
      return `urn:li:person:${normalizeMemberId(value)}`;
    };

    // Resolve the member ID for the authenticated user.
    // Prefer OIDC /userinfo; fall back to /me for legacy scope setups.
    let memberId: string | undefined;
    let authorUrn: string | undefined;

    const userinfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (userinfoResponse.ok) {
      const userinfo = await userinfoResponse.json();
      if (userinfo?.sub) {
        const subValue = String(userinfo.sub);
        memberId = normalizeMemberId(subValue);
        authorUrn = toAuthorUrn(subValue);
      }
    } else {
      let errorData: unknown = null;
      try {
        errorData = await userinfoResponse.json();
      } catch {
        // Ignore JSON parse failures from userinfo error responses.
      }
      console.error("LinkedIn /userinfo error:", errorData);
    }

    if (!memberId) {
      const meResponse = await fetch("https://api.linkedin.com/v2/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "202401",
        },
      });

      if (!meResponse.ok) {
        const errorData = await meResponse.json();
        console.error("LinkedIn /me error:", errorData);
        throw new Error(`LinkedIn /me error: ${meResponse.statusText}`);
      }

      const meData = await meResponse.json();
      if (meData?.id) {
        const idValue = String(meData.id);
        memberId = normalizeMemberId(idValue);
        authorUrn = toAuthorUrn(idValue);
      }
    }

    if (!memberId) {
      throw new Error("Unable to resolve LinkedIn member id");
    }
    if (!authorUrn) {
      authorUrn = toAuthorUrn(memberId);
    }

    // Call LinkedIn API to publish the post
    const linkedinResponse = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202401",
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: variation.content,
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

    if (!linkedinResponse.ok) {
      const errorData = await linkedinResponse.json();
      console.error("LinkedIn API error:", errorData);
      throw new Error(`LinkedIn API error: ${linkedinResponse.statusText}`);
    }

    const publishedAt = new Date().toISOString();
    const updatedVariations = remixRecord.variations.map((item) => {
      if (item.id !== variationId) {
        return item;
      }
      return {
        ...item,
        status: "PUBLISHED" as const,
        publishedAt,
        scheduledFor: undefined,
      };
    });

    // Update the remix record - add variation ID to published list
    const updatedRecord: RemixRecord = {
      ...remixRecord,
      variations: updatedVariations,
      status: resolveRemixStatus(updatedVariations),
      publishedAt,
      publishedVariationIds: [...(remixRecord.publishedVariationIds || []), variationId],
    };

    await container.item(remixId, userId).replace(updatedRecord);

    console.log("[publishToLinkedIn] Successfully published variation:", variationId);
    return updatedRecord;
  } catch (error) {
    console.error("Error publishing to LinkedIn:", error);
    throw new Error("Failed to publish to LinkedIn");
  }
}

/**
 * Update the content of a specific variation
 */
export async function updateVariationContent(
  remixId: string,
  userId: string,
  variationId: string,
  content: string
): Promise<RemixRecord> {
  try {
    const container = await getRemixesContainer();
    const { resource: remixRecord } = await container
      .item(remixId, userId)
      .read<RemixRecord>();

    if (!remixRecord) {
      throw new Error("Remix not found");
    }

    const normalizedContent = normalizePostContent(content);
    const updatedVariations = remixRecord.variations.map((variation) => {
      if (variation.id !== variationId) {
        return variation;
      }

      const hashtags =
        variation.platform === "twitter"
          ? normalizedContent.match(/#\w+/g) || []
          : undefined;

      return {
        ...variation,
        content: normalizedContent,
        hashtags: hashtags && hashtags.length > 0 ? hashtags : undefined,
        characterCount: normalizedContent.length,
      };
    });

    const updatedRecord: RemixRecord = {
      ...remixRecord,
      variations: updatedVariations,
      status: resolveRemixStatus(updatedVariations),
    };

    await container.item(remixId, userId).replace(updatedRecord);
    return updatedRecord;
  } catch (error) {
    console.error("Error updating variation content:", error);
    throw new Error("Failed to update variation");
  }
}

/**
 * Delete a specific variation
 */
export async function deleteVariation(
  remixId: string,
  userId: string,
  variationId: string
): Promise<RemixRecord> {
  try {
    const container = await getRemixesContainer();
    const { resource: remixRecord } = await container
      .item(remixId, userId)
      .read<RemixRecord>();

    if (!remixRecord) {
      throw new Error("Remix not found");
    }

    const remainingVariations = remixRecord.variations.filter(
      (variation) => variation.id !== variationId
    );

    if (remainingVariations.length === remixRecord.variations.length) {
      throw new Error("Variation not found");
    }

    const updatedRecord: RemixRecord = {
      ...remixRecord,
      variations: remainingVariations,
      status: resolveRemixStatus(remainingVariations),
      publishedVariationIds: (remixRecord.publishedVariationIds || []).filter(
        (id) => id !== variationId
      ),
    };

    await container.item(remixId, userId).replace(updatedRecord);
    return updatedRecord;
  } catch (error) {
    console.error("Error deleting variation:", error);
    throw new Error("Failed to delete variation");
  }
}

/**
 * Schedule a variation for publishing
 */
export async function scheduleVariation(
  remixId: string,
  userId: string,
  variationId: string,
  scheduledFor: string
): Promise<RemixRecord> {
  try {
    const scheduledDate = new Date(scheduledFor);
    if (Number.isNaN(scheduledDate.getTime())) {
      throw new Error("Invalid schedule time");
    }

    const container = await getRemixesContainer();
    const { resource: remixRecord } = await container
      .item(remixId, userId)
      .read<RemixRecord>();

    if (!remixRecord) {
      throw new Error("Remix not found");
    }

    const updatedVariations = remixRecord.variations.map((variation) => {
      if (variation.id !== variationId) {
        return variation;
      }

      return {
        ...variation,
        status: "SCHEDULED" as const,
        scheduledFor: scheduledDate.toISOString(),
      };
    });

    const updatedRecord: RemixRecord = {
      ...remixRecord,
      variations: updatedVariations,
      status: resolveRemixStatus(updatedVariations),
    };

    await container.item(remixId, userId).replace(updatedRecord);
    return updatedRecord;
  } catch (error) {
    console.error("Error scheduling variation:", error);
    throw new Error("Failed to schedule variation");
  }
}

/**
 * Fetch all remixes for a user
 * @param userId The user's ID
 * @returns Array of remix records
 */
export async function getUserRemixes(userId: string): Promise<RemixRecord[]> {
  try {
    if (!userId?.trim()) {
      console.warn("[getUserRemixes] Empty userId provided");
      return [];
    }
    
    console.log("[getUserRemixes] Fetching remixes for userId:", userId);
    const container = await getRemixesContainer();
    
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@userId", value: userId }]
    };
    
    const iterator = container.items.query<RemixRecord>(querySpec);
    const { resources } = await iterator.fetchAll();

    console.log("[getUserRemixes] Query returned", resources?.length || 0, "remixes");
    return resources || [];
  } catch (error) {
    console.error("[getUserRemixes] Error:", error);
    throw error;
  }
}

/**
 * Delete a remix (only if in DRAFT status)
 * @param remixId The ID of the remix to delete
 * @param userId The user's ID for partition key
 */
export async function deleteRemix(
  remixId: string,
  userId: string
): Promise<void> {
  try {
    const container = await getRemixesContainer();
    const { resource: remixRecord } = await container
      .item(remixId, userId)
      .read<RemixRecord>();

    if (!remixRecord) {
      throw new Error("Remix not found");
    }

    if (remixRecord.status === "PUBLISHED") {
      throw new Error("Cannot delete a published remix");
    }

    await container.item(remixId, userId).delete();
  } catch (error) {
    console.error("Error deleting remix:", error);
    throw new Error("Failed to delete remix");
  }
}
