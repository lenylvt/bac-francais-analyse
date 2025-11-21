import { useState, useEffect, useMemo } from "react";
import Auth from "@/components/Auth";
import PoemSelector from "@/components/PoemSelector";
import ModeSelector from "@/components/ModeSelector";
import StanzaAnalysis from "@/components/StanzaAnalysis";
import ResultsView from "@/components/ResultsView";
import Progress from "@/components/Progress";
import type { Mode, UserAnswer, AIEvaluation } from "@/types";
import { evaluateAnswer } from "@/services/ai";
import { getCurrentUser, type AuthUser } from "@/lib/appwrite/auth";
import { getPoemById, type PoemDocument } from "@/lib/appwrite/poems";
import { createResult, type ResultDocument } from "@/lib/appwrite/results";
import { usePreloadAPI } from "@/hooks/usePreloadAPI";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

type Screen = "selector" | "mode" | "quiz" | "results" | "progress";

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
  const [viewingResult, setViewingResult] = useState<ResultDocument | null>(
    null,
  );

  useEffect(() => {
    checkAuth();
  }, []);

  // Preload API connection for faster responses
  usePreloadAPI();

  // Memoize poem conversion to avoid recalculation (must be before conditional returns)
  const poemForAnalysis = useMemo(() => {
    if (!selectedPoem) return null;

    const stanzas = selectedPoem.fullText
      .split("\n\n")
      .map((stanzaText, idx) => ({
        id: idx + 1,
        lines: stanzaText.split("\n").filter((line) => line.trim()),
      }));

    return {
      id: selectedPoem.$id,
      title: selectedPoem.title,
      author: selectedPoem.author,
      collection: "",
      year: 0,
      fullText: selectedPoem.fullText.split("\n"),
      stanzas: stanzas,
      linearAnalysis: selectedPoem.linearAnalysis || [],
    };
  }, [selectedPoem]);

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

    // Optimistic UI: add answer immediately
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setIsEvaluating(true);

    try {
      // Convert PoemDocument to Poem format with proper stanzas
      const stanzas = selectedPoem.fullText
        .split("\n\n")
        .map((stanzaText, idx) => ({
          id: idx + 1,
          lines: stanzaText.split("\n").filter((line) => line.trim()),
        }));

      const poemForAI = {
        id: selectedPoem.$id,
        title: selectedPoem.title,
        author: selectedPoem.author,
        collection: "",
        year: 0,
        fullText: selectedPoem.fullText.split("\n"),
        stanzas: stanzas,
        linearAnalysis: selectedPoem.linearAnalysis || [],
      };

      const evaluation = await evaluateAnswer(poemForAI, answer);

      // Update evaluations
      const newEvaluations = [...evaluations, evaluation];
      setEvaluations(newEvaluations);

      // Calculate average and go to results
      const avgScore =
        newEvaluations.reduce((sum, e) => sum + e.score, 0) /
        newEvaluations.length;
      setAverageScore(avgScore);

      // Save result to database
      try {
        await createResult({
          userId: user.$id,
          poemId: selectedPoem.$id,
          poemTitle: selectedPoem.title,
          poemAuthor: selectedPoem.author,
          mode: mode,
          answers: newAnswers,
          evaluations: newEvaluations,
          averageScore: avgScore,
          totalStanzas: stanzas.length,
        });
      } catch (error) {
        console.error("Error saving result:", error);
      }

      setScreen("results");
    } catch (error) {
      // Rollback optimistic update on error
      setAnswers(answers);
      console.error("Erreur lors de l'évaluation:", error);
      alert("Erreur lors de l'évaluation. Vérifiez votre clé API OpenRouter.");
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
    setViewingResult(null);
  };

  const handleProgress = () => {
    setScreen("progress");
  };

  const handleViewResult = (result: ResultDocument) => {
    setViewingResult(result);
    setScreen("results");
  };

  const handleBackFromProgress = () => {
    setScreen("selector");
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  if (screen === "selector") {
    return (
      <PoemSelector onSelect={handlePoemSelect} onProgress={handleProgress} />
    );
  }

  if (screen === "progress" && user) {
    return (
      <Progress
        userId={user.$id}
        onBack={handleBackFromProgress}
        onViewResult={handleViewResult}
      />
    );
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

  if (screen === "quiz" && poemForAnalysis && user) {
    return (
      <>
        <StanzaAnalysis
          poem={poemForAnalysis}
          stanzaIndex={0}
          totalStanzas={poemForAnalysis.stanzas.length}
          mode={mode}
          userId={user.$id}
          onSubmit={handleAnswerSubmit}
          onBack={handleBackFromQuiz}
          isLoading={isEvaluating}
        />
        {isEvaluating && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="space-y-2 text-center">
                  <h3 className="font-semibold text-lg">
                    Évaluation en cours...
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    L'IA analyse votre réponse
                  </p>
                </div>
                <div className="w-full space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (screen === "results") {
    if (viewingResult) {
      // Viewing a saved result
      const resultPoem = {
        id: viewingResult.poemId,
        title: viewingResult.poemTitle,
        author: viewingResult.poemAuthor,
        collection: "",
        year: 0,
        fullText: [],
        stanzas: [],
        linearAnalysis: [],
      };

      return (
        <ResultsView
          poem={resultPoem}
          evaluations={viewingResult.evaluations}
          answers={viewingResult.answers}
          averageScore={viewingResult.averageScore}
          onRestart={handleRestart}
          onHome={handleHome}
        />
      );
    } else if (poemForAnalysis) {
      // Viewing current result
      return (
        <ResultsView
          poem={poemForAnalysis}
          evaluations={evaluations}
          answers={answers}
          averageScore={averageScore}
          onRestart={handleRestart}
          onHome={handleHome}
        />
      );
    }
  }

  return null;
}

export default App;
