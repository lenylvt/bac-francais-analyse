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
  linearAnalysis?: string;
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
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      poemsCollectionId,
      [Query.orderAsc("title"), Query.limit(100)],
    );
    const poems = response.documents as unknown as PoemDocument[];
    
    // Fork analyses → linearAnalysis pour compatibilité
    return poems.map(poem => {
      if (poem.analyses && !poem.linearAnalysis) {
        poem.linearAnalysis = poem.analyses;
      }
      return poem;
    });
  } catch (error: any) {
    return [];
  }
}

/**
 * Get a single poem by ID
 */
export async function getPoemById(
  poemId: string,
): Promise<PoemDocument | null> {
  try {
    const document = await databases.getDocument(
      appwriteConfig.databaseId,
      poemsCollectionId,
      poemId,
    );
    const poem = document as unknown as PoemDocument;
    
    // Fork analyses → linearAnalysis pour compatibilité
    if (poem.analyses && !poem.linearAnalysis) {
      poem.linearAnalysis = poem.analyses;
    }
    
    return poem;
  } catch (error: any) {
    return null;
  }
}

/**
 * Create a new poem
 */
export async function createPoem(data: CreatePoemData): Promise<PoemDocument> {
  try {
    const document = await databases.createDocument(
      appwriteConfig.databaseId,
      poemsCollectionId,
      ID.unique(),
      data,
    );
    return document as unknown as PoemDocument;
  } catch (error: any) {
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
    const document = await databases.updateDocument(
      appwriteConfig.databaseId,
      poemsCollectionId,
      poemId,
      data,
    );
    return document as unknown as PoemDocument;
  } catch (error: any) {
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
  } catch (error: any) {
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
    return response.documents as unknown as PoemDocument[];
  } catch (error: any) {
    return [];
  }
}
