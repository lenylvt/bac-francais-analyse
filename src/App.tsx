import { useState, useEffect, useMemo } from "react";
import Auth from "@/components/Auth";
import PoemSelector from "@/components/PoemSelector";
import ModeSelector from "@/components/ModeSelector";
import StanzaAnalysis from "@/components/StanzaAnalysis";
import ResultsView from "@/components/ResultsView";
import Progress from "@/components/Progress";
import type { Mode, UserAnswer, AIEvaluation } from "@/types";
import { evaluateMultipleAnalyses } from "@/services/ai";
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
  const [selectedPoem, setSelectedPoem] = useState<PoemDocument | null>(null);
  const [mode, setMode] = useState<Mode>("complete");
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

    const allStanzas = selectedPoem.fullText
      .split("\n\n")
      .map((stanzaText, idx) => ({
        id: idx + 1,
        lines: stanzaText.split("\n").filter((line) => line.trim()),
      }));

    // En mode rapide, sélectionner aléatoirement 3 strophes
    let stanzas = allStanzas;
    if (mode === "quick" && allStanzas.length > 3) {
      const shuffled = [...allStanzas].sort(() => Math.random() - 0.5);
      stanzas = shuffled.slice(0, 3).sort((a, b) => a.id - b.id);
    }

    return {
      id: selectedPoem.$id,
      title: selectedPoem.title,
      author: selectedPoem.author,
      collection: "",
      year: 0,
      fullText: selectedPoem.fullText.split("\n"),
      stanzas: stanzas,
      linearAnalysis: [],
    };
  }, [selectedPoem, mode]);

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
    setAnswers([]);
    setEvaluations([]);
    setScreen("quiz");
  };

  const handleMultipleAnalysesSubmit = async (
    analyses: Array<{ selectedWords: string[]; analysis: string }>,
  ) => {
    if (!selectedPoem) return;

    setIsEvaluating(true);

    try {
      // Convert PoemDocument to Poem format
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
        linearAnalysis: [],
        analyses: selectedPoem.analyses,
      };

      // Nouvelle évaluation multiple
      const result = await evaluateMultipleAnalyses(poemForAI, analyses);

      // Créer les UserAnswer
      const answers: UserAnswer[] = result.evaluations.map((evaluation) => ({
        stanzaId: stanzas[0].id,
        selectedWords: evaluation.selectedWords,
        analysis: evaluation.userAnalysis,
      }));

      // Créer les AIEvaluation
      const evaluations: AIEvaluation[] = result.evaluations.map(
        (evaluation) => ({
          score: evaluation.score,
          feedback: evaluation.feedback,
          missedPoints: evaluation.missedPoints,
          strengths: evaluation.strengths,
          analysis: result.globalFeedback,
        }),
      );

      // Sauvegarder dans la DB
      try {
        if (!user) {
          throw new Error("User not authenticated");
        }

        await createResult({
          userId: user.$id,
          poemId: selectedPoem.$id,
          poemTitle: selectedPoem.title,
          poemAuthor: selectedPoem.author,
          mode: mode,
          answers: answers,
          evaluations: evaluations,
          averageScore: result.averageScore,
          totalStanzas: stanzas.length,
        });
      } catch (error) {
        console.error("Error saving result:", error);
      }

      setAnswers(answers);
      setEvaluations(evaluations);
      setAverageScore(result.averageScore);

      setScreen("results");
    } catch (error) {
      console.error("Erreur lors de l'évaluation:", error);
      alert(
        "Erreur lors de l'évaluation: " +
          (error instanceof Error ? error.message : "Erreur inconnue"),
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleBackFromMode = () => {
    setScreen("selector");
    setSelectedPoem(null);
  };

  const handleBackFromQuiz = () => {
    setScreen("mode");
    setAnswers([]);
    setEvaluations([]);
  };

  const handleRestart = () => {
    setScreen("mode");
    setAnswers([]);
    setEvaluations([]);
  };

  const handleHome = () => {
    setScreen("selector");
    setSelectedPoem(null);
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
          onSubmit={handleMultipleAnalysesSubmit}
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
