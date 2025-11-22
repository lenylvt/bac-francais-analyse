// src/types/index.ts

export interface Keyword {
  word: string;
  explanation: string;
}

export interface StanzaAnalysis {
  stanzaId: number;
  analysis: string;
  keywords: Keyword[];
}

export interface Stanza {
  id: number;
  lines: string[];
}

export interface Poem {
  id: string;
  title: string;
  author: string;
  collection: string;
  year: number;
  fullText: string[];
  stanzas: Stanza[];
  linearAnalysis: StanzaAnalysis[];
  analyses?: string;
}

export interface UserAnswer {
  stanzaId: number;
  selectedWords: string[];
  analysis: string;
}

export interface AIEvaluation {
  score: number;
  feedback: string;
  missedPoints: string[];
  strengths: string[];
  analysis: string;
}

export type Mode = "complete" | "quick";

export interface AnalysisSubmission {
  analysisNumber: number;
  selectedWords: string[];
  userAnalysis: string;
}

export interface AnalysisEvaluation {
  analysisNumber: number;
  selectedWords: string[];
  userAnalysis: string;
  score: number;
  feedback: string;
  strengths: string[];
  missedPoints: string[];
}

export interface MultipleAnalysesResult {
  evaluations: AnalysisEvaluation[];
  averageScore: number;
  globalFeedback: string;
}
