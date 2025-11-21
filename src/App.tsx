import { useState, useEffect } from "react";
import Auth from "@/components/Auth";
import PoemSelector from "@/components/PoemSelector";
import ModeSelector from "@/components/ModeSelector";
import StanzaAnalysis from "@/components/StanzaAnalysis";
import ResultsView from "@/components/ResultsView";
import type { Poem, Mode, UserAnswer, AIEvaluation } from "@/types";
import poemsData from "@/data/poems.json";
import { evaluateAnswer } from "@/services/ai";
import { getCurrentUser, type AuthUser } from "@/lib/appwrite/auth";

type Screen = "selector" | "mode" | "quiz" | "results";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [screen, setScreen] = useState<Screen>("selector");
  const [poems] = useState<Poem[]>(poemsData as Poem[]);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
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

  const selectedPoem = poems.find((p) => p.id === selectedPoemId);

  const stanzasToAnalyze =
    selectedPoem && mode === "quick"
      ? getRandomStanzas(
          selectedPoem.stanzas.length,
          Math.ceil(selectedPoem.stanzas.length / 2),
        )
      : selectedPoem
        ? Array.from({ length: selectedPoem.stanzas.length }, (_, i) => i)
        : [];

  function getRandomStanzas(total: number, count: number): number[] {
    const indices = Array.from({ length: total }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).sort((a, b) => a - b);
  }

  const handlePoemSelect = (poemId: string) => {
    setSelectedPoemId(poemId);
    setScreen("mode");
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
      const evaluation = await evaluateAnswer(selectedPoem, answer);

      const newAnswers = [...answers, answer];
      const newEvaluations = [...evaluations, evaluation];

      setAnswers(newAnswers);
      setEvaluations(newEvaluations);

      if (currentStanzaIndex < stanzasToAnalyze.length - 1) {
        setCurrentStanzaIndex(currentStanzaIndex + 1);
      } else {
        const avgScore =
          newEvaluations.reduce((sum, e) => sum + e.score, 0) /
          newEvaluations.length;
        setAverageScore(avgScore);
        setScreen("results");
      }
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
    return <PoemSelector poems={poems} onSelect={handlePoemSelect} />;
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
    const actualStanzaIndex = stanzasToAnalyze[currentStanzaIndex];
    return (
      <StanzaAnalysis
        poem={selectedPoem}
        stanzaIndex={actualStanzaIndex}
        totalStanzas={stanzasToAnalyze.length}
        mode={mode}
        userId={user.$id}
        onSubmit={handleAnswerSubmit}
        onBack={handleBackFromQuiz}
        isLoading={isEvaluating}
      />
    );
  }

  if (screen === "results" && selectedPoem) {
    return (
      <ResultsView
        poem={selectedPoem}
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
