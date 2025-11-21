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

export interface QuizState {
  poemId: string;
  mode: Mode;
  currentStanzaIndex: number;
  answers: UserAnswer[];
  score: number | null;
  evaluations: AIEvaluation[];
}
