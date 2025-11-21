import { useState, useEffect } from "react";
import Auth from "@/components/Auth";
import PoemSelector from "@/components/PoemSelector";
import ModeSelector from "@/components/ModeSelector";
import StanzaAnalysis from "@/components/StanzaAnalysis";
import ResultsView from "@/components/ResultsView";
import type { Mode, UserAnswer, AIEvaluation } from "@/types";
import { evaluateAnswer } from "@/services/ai";
import { getCurrentUser, type AuthUser } from "@/lib/appwrite/auth";
import { getPoemById, type PoemDocument } from "@/lib/appwrite/poems";

type Screen = "selector" | "mode" | "quiz" | "results";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [screen, setScreen] = useState<Screen>("selector");
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [selectedPoem, setSelectedPoem] = useState<PoemDocument | null>(null);
  const [mode, setMode] = useState<Mode>("complete");
  const [currentStanzaIndex, setCurrentStanzaIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [evaluations, setEvaluations] = useState<AIEvaluation[]>([]);
  const [averageScore, setAverageScore] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleAuthSuccess = () => {
    checkAuth();
  };

  const handlePoemSelect = async (poemId: string) => {
    try {
      const poem = await getPoemById(poemId);
      if (poem) {
        setSelectedPoemId(poemId);
        setSelectedPoem(poem);
        setScreen("mode");
      }
    } catch (error) {
      console.error("Error loading poem:", error);
      alert("Erreur lors du chargement du poème");
    }
  };

  const handleModeSelect = (selectedMode: Mode) => {
    setMode(selectedMode);
    setCurrentStanzaIndex(0);
    setAnswers([]);
    setEvaluations([]);
    setScreen("quiz");
  };

  const handleAnswerSubmit = async (answer: UserAnswer) => {
    if (!selectedPoem) return;

    setIsEvaluating(true);

    try {
      // Convert PoemDocument to Poem format for AI evaluation
      const poemForAI = {
        id: selectedPoem.$id,
        title: selectedPoem.title,
        author: selectedPoem.author,
        collection: "",
        year: 0,
        fullText: selectedPoem.fullText.split("\n"),
        stanzas: [], // Will be parsed from fullText if needed
      };

      const evaluation = await evaluateAnswer(poemForAI, answer);

      const newAnswers = [...answers, answer];
      const newEvaluations = [...evaluations, evaluation];

      setAnswers(newAnswers);
      setEvaluations(newEvaluations);

      // For now, go to results after first answer
      const avgScore =
        newEvaluations.reduce((sum, e) => sum + e.score, 0) /
        newEvaluations.length;
      setAverageScore(avgScore);
      setScreen("results");
    } catch (error) {
      console.error("Erreur lors de l'évaluation:", error);
      alert(
        "Une erreur est survenue lors de l'évaluation. Vérifiez votre clé API OpenRouter dans le fichier .env",
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleBackFromMode = () => {
    setScreen("selector");
    setSelectedPoemId(null);
    setSelectedPoem(null);
  };

  const handleBackFromQuiz = () => {
    setScreen("mode");
    setCurrentStanzaIndex(0);
    setAnswers([]);
    setEvaluations([]);
  };

  const handleRestart = () => {
    setScreen("mode");
    setCurrentStanzaIndex(0);
    setAnswers([]);
    setEvaluations([]);
  };

  const handleHome = () => {
    setScreen("selector");
    setSelectedPoemId(null);
    setSelectedPoem(null);
    setCurrentStanzaIndex(0);
    setAnswers([]);
    setEvaluations([]);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  if (screen === "selector") {
    return <PoemSelector onSelect={handlePoemSelect} />;
  }

  if (screen === "mode" && selectedPoem) {
    return (
      <ModeSelector
        poemTitle={selectedPoem.title}
        onSelect={handleModeSelect}
        onBack={handleBackFromMode}
      />
    );
  }

  if (screen === "quiz" && selectedPoem && user) {
    // Convert PoemDocument to Poem format for StanzaAnalysis
    const poemForAnalysis = {
      id: selectedPoem.$id,
      title: selectedPoem.title,
      author: selectedPoem.author,
      collection: "",
      year: 0,
      fullText: selectedPoem.fullText.split("\n"),
      stanzas: selectedPoem.fullText.split("\n\n").map((stanzaText, idx) => ({
        id: idx + 1,
        lines: stanzaText.split("\n").filter((line) => line.trim()),
      })),
    };

    return (
      <StanzaAnalysis
        poem={poemForAnalysis}
        stanzaIndex={0}
        totalStanzas={1}
        mode={mode}
        userId={user.$id}
        onSubmit={handleAnswerSubmit}
        onBack={handleBackFromQuiz}
        isLoading={isEvaluating}
      />
    );
  }

  if (screen === "results" && selectedPoem) {
    const poemForResults = {
      id: selectedPoem.$id,
      title: selectedPoem.title,
      author: selectedPoem.author,
      collection: "",
      year: 0,
      fullText: selectedPoem.fullText.split("\n"),
      stanzas: [],
    };

    return (
      <ResultsView
        poem={poemForResults}
        evaluations={evaluations}
        answers={answers}
        averageScore={averageScore}
        onRestart={handleRestart}
        onHome={handleHome}
      />
    );
  }

  return null;
}

export default App;
