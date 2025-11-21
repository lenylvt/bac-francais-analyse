import { databases, appwriteConfig } from "./config";
import { ID, Query } from "appwrite";

export interface PoemDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  author: string;
  fullText: string;
  analyses?: string;
}

export interface CreatePoemData {
  title: string;
  author: string;
  fullText: string;
  analyses?: string;
}

const poemsCollectionId = "poems";

/**
 * Get all poems from database
 */
export async function getAllPoems(): Promise<PoemDocument[]> {
  try {
    console.log("📚 Loading poems from database...");
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      poemsCollectionId,
      [Query.orderAsc("title"), Query.limit(100)],
    );
    console.log(`✅ Loaded ${response.documents.length} poems`);
    return response.documents as PoemDocument[];
  } catch (error: any) {
    console.error("❌ Error loading poems:", error);
    return [];
  }
}

/**
 * Get a single poem by ID
 */
export async function getPoemById(poemId: string): Promise<PoemDocument | null> {
  try {
    const document = await databases.getDocument(
      appwriteConfig.databaseId,
      poemsCollectionId,
      poemId,
    );
    return document as PoemDocument;
  } catch (error: any) {
    console.error("❌ Error getting poem:", error);
    return null;
  }
}

/**
 * Create a new poem
 */
export async function createPoem(data: CreatePoemData): Promise<PoemDocument> {
  try {
    console.log("📝 Creating poem:", data.title);
    const document = await databases.createDocument(
      appwriteConfig.databaseId,
      poemsCollectionId,
      ID.unique(),
      data,
    );
    console.log("✅ Poem created successfully");
    return document as PoemDocument;
  } catch (error: any) {
    console.error("❌ Error creating poem:", error);
    throw new Error(`Erreur lors de la création: ${error.message}`);
  }
}

/**
 * Update a poem
 */
export async function updatePoem(
  poemId: string,
  data: Partial<CreatePoemData>,
): Promise<PoemDocument> {
  try {
    console.log("📝 Updating poem:", poemId);
    const document = await databases.updateDocument(
      appwriteConfig.databaseId,
      poemsCollectionId,
      poemId,
      data,
    );
    console.log("✅ Poem updated successfully");
    return document as PoemDocument;
  } catch (error: any) {
    console.error("❌ Error updating poem:", error);
    throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
  }
}

/**
 * Delete a poem
 */
export async function deletePoem(poemId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      poemsCollectionId,
      poemId,
    );
    console.log("✅ Poem deleted successfully");
  } catch (error: any) {
    console.error("❌ Error deleting poem:", error);
    throw new Error(`Erreur lors de la suppression: ${error.message}`);
  }
}

/**
 * Search poems by title or author
 */
export async function searchPoems(query: string): Promise<PoemDocument[]> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      poemsCollectionId,
      [Query.search("title", query), Query.limit(50)],
    );
    return response.documents as PoemDocument[];
  } catch (error: any) {
    console.error("❌ Error searching poems:", error);
    return [];
  }
}
