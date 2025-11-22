import { databases, appwriteConfig } from "./config";
import { ID, Query } from "appwrite";
import type { AIEvaluation, UserAnswer } from "@/types";

export interface ResultDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  poemId: string;
  poemTitle: string;
  poemAuthor: string;
  mode: "complete" | "quick";
  answers: UserAnswer[];
  evaluations: AIEvaluation[];
  averageScore: number;
  totalStanzas: number;
}

export interface CreateResultData {
  userId: string;
  poemId: string;
  poemTitle: string;
  poemAuthor: string;
  mode: "complete" | "quick";
  answers: UserAnswer[];
  evaluations: AIEvaluation[];
  averageScore: number;
  totalStanzas: number;
}

/**
 * Create a new result
 */
export async function createResult(
  data: CreateResultData,
): Promise<ResultDocument> {
  try {
    const document = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.resultsCollectionId,
      ID.unique(),
      {
        userId: data.userId,
        poemId: data.poemId,
        poemTitle: data.poemTitle,
        poemAuthor: data.poemAuthor,
        mode: data.mode,
        answers: JSON.stringify(data.answers),
        evaluations: JSON.stringify(data.evaluations),
        averageScore: data.averageScore,
        totalStanzas: data.totalStanzas,
      },
    );

    return {
      ...document,
      answers: JSON.parse(document.answers as string),
      evaluations: JSON.parse(document.evaluations as string),
    } as unknown as ResultDocument;
  } catch (error: any) {
    console.error("Error creating result:", error);
    throw new Error(`Erreur lors de la sauvegarde: ${error.message}`);
  }
}

/**
 * Get all user results
 */
export async function getUserResults(
  userId: string,
): Promise<ResultDocument[]> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.resultsCollectionId,
      [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    );

    return response.documents.map((doc) => ({
      ...doc,
      answers: JSON.parse(doc.answers as string),
      evaluations: JSON.parse(doc.evaluations as string),
    })) as unknown as ResultDocument[];
  } catch (error) {
    console.error("Error getting results:", error);
    throw new Error("Erreur lors de la récupération des résultats");
  }
}

/**
 * Get result by ID
 */
export async function getResultById(resultId: string): Promise<ResultDocument> {
  try {
    const document = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.resultsCollectionId,
      resultId,
    );

    return {
      ...document,
      answers: JSON.parse(document.answers as string),
      evaluations: JSON.parse(document.evaluations as string),
    } as unknown as ResultDocument;
  } catch (error) {
    console.error("Error getting result:", error);
    throw new Error("Erreur lors de la récupération du résultat");
  }
}

/**
 * Delete a result
 */
export async function deleteResult(resultId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.resultsCollectionId,
      resultId,
    );
  } catch (error) {
    console.error("Error deleting result:", error);
    throw new Error("Erreur lors de la suppression");
  }
}

/**
 * Get user statistics from results
 */
export async function getUserResultsStats(userId: string): Promise<{
  totalTests: number;
  averageScore: number;
  bestScore: number;
  recentTests: number;
  poemsTested: number;
}> {
  try {
    const results = await getUserResults(userId);

    if (results.length === 0) {
      return {
        totalTests: 0,
        averageScore: 0,
        bestScore: 0,
        recentTests: 0,
        poemsTested: 0,
      };
    }

    const scores = results.map((r) => r.averageScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.max(...scores);

    // Tests in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentTests = results.filter(
      (r) => new Date(r.$createdAt) > weekAgo,
    ).length;

    const uniquePoems = new Set(results.map((r) => r.poemId));

    return {
      totalTests: results.length,
      averageScore: Math.round(averageScore * 10) / 10,
      bestScore: Math.round(bestScore * 10) / 10,
      recentTests,
      poemsTested: uniquePoems.size,
    };
  } catch (error) {
    console.error("Error getting stats:", error);
    return {
      totalTests: 0,
      averageScore: 0,
      bestScore: 0,
      recentTests: 0,
      poemsTested: 0,
    };
  }
}
