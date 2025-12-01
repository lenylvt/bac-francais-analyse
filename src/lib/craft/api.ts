/**
 * Craft Multi-Document API integration (Collections)
 * Base URL: https://connect.craft.do/links/2xPCLTui75d/api/v1
 */

const CRAFT_API_BASE = "https://connect.craft.do/links/2xPCLTui75d/api/v1";

interface CraftCollection {
  id: string;
  name: string;
  itemCount: number;
  documentId: string;
}

interface CraftCollectionItem {
  id?: string;
  title?: string;
  name?: string;
  properties: {
    name?: string;
    author?: string;
    analyse?: string | { title?: string; warning?: string; blockId?: string; spaceId?: string };
    published?: boolean;
  };
  content?: CraftBlock[];
}

interface CraftBlock {
  id: string;
  type: string;
  markdown?: string;
  content?: CraftBlock[];
}

interface CraftCollectionsResponse {
  items: CraftCollection[];
}

interface CraftCollectionItemsResponse {
  items: CraftCollectionItem[];
}

/**
 * Fetch wrapper with error handling
 */
async function craftFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${CRAFT_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Craft API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all collections from Craft
 */
export async function getCraftCollections(): Promise<CraftCollection[]> {
  const response = await craftFetch<CraftCollectionsResponse>("/collections");
  return response.items;
}

/**
 * Get block content by ID (for linked blocks/documents)
 */
export async function getCraftBlock(blockId: string): Promise<CraftBlock | null> {
  try {
    const response = await craftFetch<CraftBlock>(`/blocks?id=${blockId}`);
    return response;
  } catch (error) {
    console.error(`Error fetching block ${blockId}:`, error);
    return null;
  }
}

/**
 * Get all items from a collection
 * @param collectionId The ID of the collection
 * @param maxDepth The depth of nested content to fetch (-1 for all)
 */
export async function getCraftCollectionItems(
  collectionId: string,
  maxDepth: number = -1
): Promise<CraftCollectionItem[]> {
  const response = await craftFetch<CraftCollectionItemsResponse>(
    `/collections/${collectionId}/items?maxDepth=${maxDepth}`
  );
  return response.items;
}

/**
 * Get a single collection item with its content
 */
export async function getCraftCollectionItem(
  collectionId: string,
  itemId: string
): Promise<CraftCollectionItem | null> {
  try {
    const items = await getCraftCollectionItems(collectionId, -1);
    return items.find((item) => item.id === itemId) || null;
  } catch (error) {
    console.error("Error fetching collection item:", error);
    return null;
  }
}

/**
 * Add new items to a collection
 */
export async function addCraftCollectionItems(
  collectionId: string,
  items: Omit<CraftCollectionItem, "id">[]
): Promise<CraftCollectionItem[]> {
  const response = await craftFetch<CraftCollectionItemsResponse>(
    `/collections/${collectionId}/items`,
    {
      method: "POST",
      body: JSON.stringify({ items }),
    }
  );
  return response.items;
}

/**
 * Update existing items in a collection
 */
export async function updateCraftCollectionItems(
  collectionId: string,
  items: CraftCollectionItem[]
): Promise<CraftCollectionItem[]> {
  const response = await craftFetch<CraftCollectionItemsResponse>(
    `/collections/${collectionId}/items`,
    {
      method: "PUT",
      body: JSON.stringify({
        itemsToUpdate: items,
      }),
    }
  );
  return response.items;
}

/**
 * Delete items from a collection
 */
export async function deleteCraftCollectionItems(
  collectionId: string,
  itemIds: string[]
): Promise<void> {
  await craftFetch(`/collections/${collectionId}/items`, {
    method: "DELETE",
    body: JSON.stringify({
      idsToDelete: itemIds,
    }),
  });
}

/**
 * Clean Craft-specific tags from markdown
 */
function cleanCraftMarkdown(markdown: string): string {
  return markdown
    // Remove Craft-specific tags like <callout>, <page>, <content>, etc.
    .replace(/<\/?callout[^>]*>/gi, "")
    .replace(/<\/?page[^>]*>/gi, "")
    .replace(/<\/?pageTitle[^>]*>/gi, "")
    .replace(/<\/?content[^>]*>/gi, "")
    .replace(/<\/?card[^>]*>/gi, "")
    .replace(/<\/?quote[^>]*>/gi, "")
    .trim();
}

/**
 * Extract markdown text from Craft blocks recursively
 * Empty markdown blocks ("") are treated as stanza separators
 */
function extractMarkdownFromBlocks(blocks?: CraftBlock[]): string {
  if (!blocks || blocks.length === 0) return "";

  let text = "";
  for (const block of blocks) {
    if (block.markdown !== undefined) {
      if (block.markdown === "") {
        // Empty block = stanza separator
        text += "\n";
      } else {
        // Clean Craft-specific tags before adding
        text += cleanCraftMarkdown(block.markdown) + "\n";
      }
    }
    if (block.content && block.content.length > 0) {
      text += extractMarkdownFromBlocks(block.content);
    }
  }
  return text.trim();
}

/**
 * Extract poem data from Craft collection item
 * This is an async function now because it may need to fetch linked analyses
 */
export async function parsePoemFromCollectionItem(
  item: CraftCollectionItem
): Promise<{
  title: string;
  author: string;
  fullText: string;
  analyses?: string;
  published: boolean;
} | null> {
  try {
    const title = item.properties.name || item.name || item.title || "";
    const author = item.properties.author || "";

    // Handle analyse - it can be a string or an object with title/warning
    let analyses: string | undefined;
    if (item.properties.analyse) {
      if (typeof item.properties.analyse === "string") {
        analyses = item.properties.analyse;
      } else if (typeof item.properties.analyse === "object") {
        // If it's an object with a title, it's a link to another doc
        const linkInfo = item.properties.analyse as any;
        console.log("Analyse is a link, full object:", linkInfo);

        // Try to extract block ID from the link object
        // The structure might vary, check common properties
        let blockId: string | undefined;

        // Check for reference.blockId first (most common)
        if (linkInfo.reference && linkInfo.reference.blockId) {
          blockId = linkInfo.reference.blockId;
        } else if (linkInfo.blockId) {
          blockId = linkInfo.blockId;
        } else if (linkInfo.id) {
          blockId = linkInfo.id;
        }

        if (!blockId && linkInfo.title) {
          console.log("No blockId found, only title:", linkInfo.title);
        }

        // If we found a block ID, try to fetch it
        if (blockId) {
          console.log("Fetching linked analysis block:", blockId);
          const linkedBlock = await getCraftBlock(blockId);
          if (linkedBlock) {
            analyses = extractMarkdownFromBlocks([linkedBlock]);
            console.log("Successfully fetched linked analysis");
          } else {
            analyses = `📎 Analyse : ${linkInfo.title}\n\n⚠️ Impossible de récupérer l'analyse liée automatiquement.\n\nVeuillez copier le contenu dans le champ "analyse".`;
          }
        } else {
          // No block ID found, provide a helpful message
          analyses = `📎 Analyse : ${linkInfo.title}\n\n⚠️ L'analyse se trouve dans un document Craft lié.\n\nPour l'afficher, veuillez copier le texte de l'analyse directement dans le champ "analyse" au lieu d'utiliser un lien.`;
        }
      }
    }

    // Only consider as published if explicitly set to true
    const published = item.properties.published === true;

    // Extract full text from the item's content blocks
    const fullText = extractMarkdownFromBlocks(item.content);

    if (!title || !author || !fullText) {
      console.warn("Missing required fields:", { title, author, fullText });
      return null;
    }

    return {
      title,
      author,
      fullText,
      analyses,
      published,
    };
  } catch (error) {
    console.error("Error parsing poem from collection item:", error);
    return null;
  }
}

/**
 * Format poem data as Craft collection item
 */
export function formatPoemAsCollectionItem(poem: {
  title: string;
  author: string;
  fullText: string;
  analyses?: string;
  published?: boolean;
}): Omit<CraftCollectionItem, "id"> {
  return {
    title: poem.title,
    properties: {
      name: poem.title,
      author: poem.author,
      analyse: poem.analyses,
      published: poem.published ?? true,
    },
  };
}

/**
 * Get the poems collection by name "Analyse"
 */
export async function getPoemsCollection(): Promise<CraftCollection | null> {
  try {
    const collections = await getCraftCollections();
    // Find the collection named "Analyse"
    const poemsCollection = collections.find(
      (col) => col.name === "Analyse"
    );

    if (!poemsCollection) {
      console.error("Collection 'Analyse' not found. Available collections:",
        collections.map(c => c.name).join(", "));
      return null;
    }

    console.log("Found collection 'Analyse' with id:", poemsCollection.id);
    return poemsCollection;
  } catch (error) {
    console.error("Error fetching poems collection:", error);
    return null;
  }
}
