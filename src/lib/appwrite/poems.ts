import {
  getPoemsCollection,
  getCraftCollectionItems,
  parsePoemFromCollectionItem,
  formatPoemAsCollectionItem,
  updateCraftCollectionItems,
  deleteCraftCollectionItems,
  addCraftCollectionItems,
} from "@/lib/craft/api";

export interface PoemDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  author: string;
  fullText: string;
  analyses?: string;
  linearAnalysis?: string;
}

export interface CreatePoemData {
  title: string;
  author: string;
  fullText: string;
  analyses?: string;
}

/**
 * Convert Craft collection item to PoemDocument format
 */
async function craftItemToPoemDocument(item: any): Promise<PoemDocument | null> {
  try {
    const poemData = await parsePoemFromCollectionItem(item);
    if (!poemData) return null;

    // Only return published poems
    if (!poemData.published) return null;

    return {
      $id: item.id || "",
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      title: poemData.title,
      author: poemData.author,
      fullText: poemData.fullText,
      analyses: poemData.analyses,
      linearAnalysis: poemData.analyses,
    };
  } catch (error) {
    console.error("Error converting Craft collection item:", error);
    return null;
  }
}

/**
 * Get all poems from Craft collection
 */
export async function getAllPoems(): Promise<PoemDocument[]> {
  try {
    const collection = await getPoemsCollection();
    if (!collection) {
      console.error("No poems collection found");
      return [];
    }

    const items = await getCraftCollectionItems(collection.id, -1);
    const poems: PoemDocument[] = [];

    for (const item of items) {
      try {
        const poem = await craftItemToPoemDocument(item);
        if (poem) {
          poems.push(poem);
        }
      } catch (error) {
        console.error(`Error converting item to poem:`, error);
      }
    }

    // Sort by title
    return poems.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error: any) {
    console.error("Error fetching poems from Craft:", error);
    return [];
  }
}

/**
 * Get all poems progressively with a callback for each poem loaded
 */
export async function getAllPoemsProgressive(
  onPoemLoaded: (poem: PoemDocument) => void
): Promise<PoemDocument[]> {
  try {
    const collection = await getPoemsCollection();
    if (!collection) {
      console.error("No poems collection found");
      return [];
    }

    const items = await getCraftCollectionItems(collection.id, -1);
    const poems: PoemDocument[] = [];

    for (const item of items) {
      try {
        const poem = await craftItemToPoemDocument(item);
        if (poem) {
          poems.push(poem);
          onPoemLoaded(poem); // Call callback immediately when poem is loaded
        }
      } catch (error) {
        console.error(`Error converting item to poem:`, error);
      }
    }

    // Sort by title
    return poems.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error: any) {
    console.error("Error fetching poems from Craft:", error);
    return [];
  }
}

/**
 * Get a single poem by ID from Craft collection
 */
export async function getPoemById(
  poemId: string
): Promise<PoemDocument | null> {
  try {
    const collection = await getPoemsCollection();
    if (!collection) {
      console.error("No poems collection found");
      return null;
    }

    const items = await getCraftCollectionItems(collection.id, -1);
    const item = items.find((i) => i.id === poemId);

    if (!item) {
      console.error(`Poem ${poemId} not found in collection`);
      return null;
    }

    return await craftItemToPoemDocument(item);
  } catch (error: any) {
    console.error(`Error fetching poem ${poemId}:`, error);
    return null;
  }
}

/**
 * Create a new poem in Craft collection
 */
export async function createPoem(data: CreatePoemData): Promise<PoemDocument> {
  try {
    const collection = await getPoemsCollection();
    if (!collection) {
      throw new Error("No poems collection found");
    }

    const collectionItem = formatPoemAsCollectionItem(data);
    const createdItems = await addCraftCollectionItems(collection.id, [
      collectionItem,
    ]);

    if (createdItems.length === 0) {
      throw new Error("Failed to create poem");
    }

    const poem = await craftItemToPoemDocument(createdItems[0]);
    if (!poem) {
      throw new Error("Failed to convert created poem");
    }

    return poem;
  } catch (error: any) {
    throw new Error(`Erreur lors de la création: ${error.message}`);
  }
}

/**
 * Update a poem in Craft collection
 */
export async function updatePoem(
  poemId: string,
  data: Partial<CreatePoemData>
): Promise<PoemDocument> {
  try {
    const collection = await getPoemsCollection();
    if (!collection) {
      throw new Error("No poems collection found");
    }

    // Fetch current poem
    const currentPoem = await getPoemById(poemId);
    if (!currentPoem) {
      throw new Error("Poem not found");
    }

    // Merge with updates
    const updatedData = {
      title: data.title || currentPoem.title,
      author: data.author || currentPoem.author,
      fullText: data.fullText || currentPoem.fullText,
      analyses: data.analyses || currentPoem.analyses,
    };

    // Format as collection item
    const collectionItem = formatPoemAsCollectionItem(updatedData);

    // Update in Craft
    await updateCraftCollectionItems(collection.id, [
      {
        id: poemId,
        ...collectionItem,
      },
    ]);

    // Return updated poem
    return {
      ...currentPoem,
      ...updatedData,
      linearAnalysis: updatedData.analyses,
      $updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
  }
}

/**
 * Delete a poem from Craft collection
 */
export async function deletePoem(poemId: string): Promise<void> {
  try {
    const collection = await getPoemsCollection();
    if (!collection) {
      throw new Error("No poems collection found");
    }

    await deleteCraftCollectionItems(collection.id, [poemId]);
  } catch (error: any) {
    throw new Error(`Erreur lors de la suppression: ${error.message}`);
  }
}

/**
 * Search poems by title or author in Craft collection
 */
export async function searchPoems(query: string): Promise<PoemDocument[]> {
  try {
    const allPoems = await getAllPoems();
    const lowerQuery = query.toLowerCase();

    return allPoems.filter(
      (poem) =>
        poem.title.toLowerCase().includes(lowerQuery) ||
        poem.author.toLowerCase().includes(lowerQuery) ||
        poem.fullText.toLowerCase().includes(lowerQuery)
    );
  } catch (error: any) {
    console.error("Error searching poems:", error);
    return [];
  }
}
