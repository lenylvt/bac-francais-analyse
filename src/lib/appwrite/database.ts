import { databases, appwriteConfig } from "./config";
import { ID, Query } from "appwrite";

export interface SavedAnalysisDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  poemId: string;
  poemTitle: string;
  stanzaId: number;
  selectedWords: string[];
  analysis: string;
  score?: number;
  feedback?: string;
  completed: boolean;
}

export interface CreateAnalysisData {
  userId: string;
  poemId: string;
  poemTitle: string;
  stanzaId: number;
  selectedWords: string[];
  analysis: string;
  completed?: boolean;
}

export interface UpdateAnalysisData {
  selectedWords?: string[];
  analysis?: string;
  score?: number;
  feedback?: string;
  completed?: boolean;
}

/**
 * Create a new analysis
 */
export async function createAnalysis(
  data: CreateAnalysisData,
): Promise<SavedAnalysisDocument> {
  try {
    console.log("📝 Creating analysis with data:", {
      userId: data.userId,
      poemId: data.poemId,
      poemTitle: data.poemTitle,
      stanzaId: data.stanzaId,
      selectedWordsCount: data.selectedWords.length,
      analysisLength: data.analysis.length,
    });
    console.log("🔧 Using config:", {
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.analysesCollectionId,
    });

    const document = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.analysesCollectionId,
      ID.unique(),
      {
        userId: data.userId,
        poemId: data.poemId,
        poemTitle: data.poemTitle,
        stanzaId: data.stanzaId,
        selectedWords: data.selectedWords,
        analysis: data.analysis,
        completed: data.completed || false,
      },
    );
    console.log("✅ Analysis created successfully:", document.$id);
    return document as SavedAnalysisDocument;
  } catch (error: any) {
    console.error("❌ Error creating analysis:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
      response: error.response,
    });
    throw new Error(
      `Erreur lors de la sauvegarde: ${error.message || "Erreur inconnue"}`,
    );
  }
}

/**
 * Update an existing analysis
 */
export async function updateAnalysis(
  analysisId: string,
  data: UpdateAnalysisData,
): Promise<SavedAnalysisDocument> {
  try {
    console.log("📝 Updating analysis:", analysisId, data);
    const document = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.analysesCollectionId,
      analysisId,
      data,
    );
    console.log("✅ Analysis updated successfully");
    return document as SavedAnalysisDocument;
  } catch (error: any) {
    console.error("❌ Error updating analysis:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
    throw new Error(
      `Erreur lors de la mise à jour: ${error.message || "Erreur inconnue"}`,
    );
  }
}

/**
 * Get user analyses for a specific poem
 */
export async function getUserAnalysesForPoem(
  userId: string,
  poemId: string,
): Promise<SavedAnalysisDocument[]> {
  try {
    console.log("📚 Loading analyses for:", { userId, poemId });
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.analysesCollectionId,
      [
        Query.equal("userId", userId),
        Query.equal("poemId", poemId),
        Query.orderDesc("$createdAt"),
      ],
    );
    console.log(`✅ Loaded ${response.documents.length} analyses`);
    return response.documents as SavedAnalysisDocument[];
  } catch (error: any) {
    console.error("❌ Error getting analyses:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
    throw new Error(
      `Erreur lors de la récupération: ${error.message || "Erreur inconnue"}`,
    );
  }
}

/**
 * Get all user analyses
 */
export async function getUserAnalyses(
  userId: string,
): Promise<SavedAnalysisDocument[]> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.analysesCollectionId,
      [Query.equal("userId", userId), Query.orderDesc("$createdAt")],
    );
    return response.documents as SavedAnalysisDocument[];
  } catch (error) {
    console.error("Error getting user analyses:", error);
    throw new Error("Erreur lors de la récupération des analyses.");
  }
}

/**
 * Delete an analysis
 */
export async function deleteAnalysis(analysisId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.analysesCollectionId,
      analysisId,
    );
  } catch (error) {
    console.error("Error deleting analysis:", error);
    throw new Error("Erreur lors de la suppression de l'analyse.");
  }
}

/**
 * Get all incomplete analyses for a poem (to resume)
 */
export async function getIncompleteAnalyses(
  userId: string,
  poemId: string,
): Promise<SavedAnalysisDocument[]> {
  try {
    console.log("🔍 Looking for incomplete analyses:", { userId, poemId });
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.analysesCollectionId,
      [
        Query.equal("userId", userId),
        Query.equal("poemId", poemId),
        Query.equal("completed", false),
        Query.orderAsc("$createdAt"),
      ],
    );

    console.log(`✅ Found ${response.documents.length} incomplete analyses`);
    return response.documents as SavedAnalysisDocument[];
  } catch (error: any) {
    console.error("❌ Error getting incomplete analyses:", error);
    return [];
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<{
  totalAnalyses: number;
  completedAnalyses: number;
  averageScore: number;
}> {
  try {
    const analyses = await getUserAnalyses(userId);
    const completed = analyses.filter((a) => a.completed);
    const scoresSum = completed.reduce((sum, a) => sum + (a.score || 0), 0);
    const averageScore =
      completed.length > 0 ? scoresSum / completed.length : 0;

    return {
      totalAnalyses: analyses.length,
      completedAnalyses: completed.length,
      averageScore: Math.round(averageScore * 10) / 10,
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    return {
      totalAnalyses: 0,
      completedAnalyses: 0,
      averageScore: 0,
    };
  }
}
