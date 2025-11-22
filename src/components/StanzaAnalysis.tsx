import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  Loader2,
  X,
  Eye,
  Sparkles,
  AlertCircle,
  GripVertical,
  Moon,
  Sun,
} from "lucide-react";
import type { Poem } from "@/types";
import {
  createAnalysis,
  updateAnalysis,
  deleteAnalysis,
  getUserAnalysesForPoem,
  getIncompleteAnalyses,
  type SavedAnalysisDocument,
} from "@/lib/appwrite/database";
import { useTheme } from "@/hooks/useTheme";

interface StanzaAnalysisProps {
  poem: Poem;
  stanzaIndex: number;
  totalStanzas: number;
  mode: "complete" | "quick";
  userId: string;
  onSubmit: (
    analyses: Array<{ selectedWords: string[]; analysis: string }>,
  ) => void;
  onBack: () => void;
  isLoading?: boolean;
}

interface WordData {
  word: string;
  cleanWord: string;
  prefix: string;
  suffix: string;
  stanzaId: number;
  lineIndex: number;
  wordIndex: number;
  uniqueId: string;
}

interface SavedAnalysis {
  selectedWords: string[];
  analysis: string;
  timestamp: number | string;
}

export default function StanzaAnalysis({
  poem,
  stanzaIndex,
  totalStanzas,
  mode,
  userId,
  onSubmit,
  onBack,
  isLoading = false,
}: StanzaAnalysisProps) {
  const { theme, toggleTheme } = useTheme();
  const stanza = poem.stanzas[stanzaIndex];
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    new Set(),
  );
  const [analysis, setAnalysis] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const dragStartWordId = useRef<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dbAnalyses, setDbAnalyses] = useState<SavedAnalysisDocument[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedIncomplete, setHasLoadedIncomplete] = useState(false);
  const [incompleteAnalyses, setIncompleteAnalyses] = useState<
    SavedAnalysisDocument[]
  >([]);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(
    null,
  );
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [textSize, setTextSize] = useState<"small" | "medium" | "large">(
    "small",
  );

  const isComplete = mode === "complete";
  const isGeneralAnalysis = selectedWordIds.size === 0;

  // Load existing analyses from DB and clean completed ones
  const loadAnalyses = useCallback(async () => {
    try {
      const analyses = await getUserAnalysesForPoem(userId, poem.id);

      // Delete completed analyses (they should be in results now)
      const completedAnalyses = analyses.filter((a) => a.completed);
      for (const completed of completedAnalyses) {
        await deleteAnalysis(completed.$id);
      }

      // Keep only incomplete analyses
      const incompleteAnalyses = analyses.filter((a) => !a.completed);
      setDbAnalyses(incompleteAnalyses);
    } catch (error) {
      console.error("Error loading analyses:", error);
    }
  }, [userId, poem.id]);

  // Load incomplete analyses on mount
  useEffect(() => {
    const loadIncompleteAnalyses = async () => {
      if (hasLoadedIncomplete) return;

      try {
        const incompletes = await getIncompleteAnalyses(userId, poem.id);
        if (incompletes.length > 0) {
          console.log("📋 Analyses incomplètes trouvées:", incompletes.length);
          setIncompleteAnalyses(incompletes);
          setShowResumeDialog(true);
          setHasLoadedIncomplete(true);
        }
      } catch (error) {
        console.error("Error loading incomplete analyses:", error);
      }
    };

    loadIncompleteAnalyses();
  }, [userId, poem.id, hasLoadedIncomplete]);

  // Handle resume choice - restore all incomplete analyses
  const handleResumeAnalysis = () => {
    if (incompleteAnalyses.length > 0) {
      console.log("✅ Reprise des analyses:", incompleteAnalyses.length);

      // Restore all analyses to savedAnalyses state
      const restored = incompleteAnalyses.map((incomplete) => ({
        selectedWords: incomplete.selectedWords,
        analysis: incomplete.analysis,
        timestamp: new Date(incomplete.$createdAt).getTime(),
      }));

      setSavedAnalyses(restored);
      setDbAnalyses(incompleteAnalyses);
      setShowResumeDialog(false);
      setHasLoadedIncomplete(true);
    }
  };

  const handleStartNew = async () => {
    console.log("🆕 Nouvelle analyse");

    // Mark all incomplete analyses as completed
    if (incompleteAnalyses.length > 0) {
      try {
        for (const incomplete of incompleteAnalyses) {
          await updateAnalysis(incomplete.$id, { completed: true });
        }
      } catch (error) {
        console.error("Error marking analyses as completed:", error);
      }
    }

    setShowResumeDialog(false);
    setIncompleteAnalyses([]);
    setHasLoadedIncomplete(true);
  };

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  // Handle sidebar resize
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    },
    [isResizing],
  );

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleResizeMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleResizeMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleResizeMouseUp]);

  // Parse all words with unique IDs
  const allWords: WordData[] = [];
  const stanzasToShow = isComplete ? poem.stanzas : [stanza];

  stanzasToShow.forEach((s) => {
    s.lines.forEach((line, lineIndex) => {
      const words = line.split(/\s+/);
      words.forEach((word, wordIndex) => {
        if (!word.trim()) return;

        const match = word.match(/^([.,;:!?'«»—…]*)(.+?)([.,;:!?'«»—…]*)$/);
        if (match) {
          const [, prefix, cleanWord, suffix] = match;
          allWords.push({
            word,
            cleanWord,
            prefix,
            suffix,
            stanzaId: s.id,
            lineIndex,
            wordIndex,
            uniqueId: `${s.id}-${lineIndex}-${wordIndex}`,
          });
        } else {
          allWords.push({
            word,
            cleanWord: word,
            prefix: "",
            suffix: "",
            stanzaId: s.id,
            lineIndex,
            wordIndex,
            uniqueId: `${s.id}-${lineIndex}-${wordIndex}`,
          });
        }
      });
    });
  });

  const handleWordMouseDown = useCallback((uniqueId: string) => {
    setIsDragging(true);
    dragStartWordId.current = uniqueId;
    setSelectedWordIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uniqueId)) {
        newSet.delete(uniqueId);
      } else {
        newSet.add(uniqueId);
      }
      return newSet;
    });
  }, []);

  const handleWordMouseEnter = useCallback(
    (uniqueId: string) => {
      if (isDragging && dragStartWordId.current !== uniqueId) {
        setSelectedWordIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(uniqueId);
          return newSet;
        });
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartWordId.current = null;
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const removeWord = (uniqueId: string) => {
    setSelectedWordIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(uniqueId);
      return newSet;
    });
  };

  const clearAll = () => setSelectedWordIds(new Set());

  const handleSaveAnalysis = async () => {
    if (!analysis.trim()) return;

    setIsSaving(true);
    try {
      // Save uniqueIds directly (format: stanzaId-lineIndex-wordIndex)
      const selectedWords = Array.from(selectedWordIds);

      // Update existing or create new
      if (currentAnalysisId) {
        await updateAnalysis(currentAnalysisId, {
          selectedWords,
          analysis: analysis.trim(),
        });
      } else {
        const newAnalysis = await createAnalysis({
          userId,
          poemId: poem.id,
          poemTitle: poem.title,
          stanzaId: stanza.id,
          selectedWords,
          analysis: analysis.trim(),
          completed: false,
        });
        setCurrentAnalysisId(newAnalysis.$id);
      }

      // Add to local state
      setSavedAnalyses((prev) => [
        ...prev,
        {
          selectedWords,
          analysis: analysis.trim(),
          timestamp: Date.now(),
        },
      ]);

      // Reload from DB
      await loadAnalyses();

      // Reset form and ID for next analysis
      setSelectedWordIds(new Set());
      setAnalysis("");
      setCurrentAnalysisId(null);
    } catch (error) {
      console.error("Error saving analysis:", error);
      alert("Erreur lors de la sauvegarde de l'analyse");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAnalysis = (index: number) => {
    setSavedAnalyses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditAnalysis = (index: number) => {
    const saved = savedAnalyses[index];
    const dbAnalysis = dbAnalyses[index];

    setEditingIndex(index);

    // Restore uniqueIds directly
    const wordIds = new Set(saved.selectedWords);

    setSelectedWordIds(wordIds);
    setAnalysis(saved.analysis);
    setCurrentAnalysisId(dbAnalysis?.$id || null);
    setShowReviewDialog(false);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;

    setIsSaving(true);
    try {
      const selectedWords = Array.from(selectedWordIds);

      // Update in DB if exists
      if (currentAnalysisId) {
        await updateAnalysis(currentAnalysisId, {
          selectedWords,
          analysis: analysis.trim(),
        });
      }

      // Update local state
      setSavedAnalyses((prev) =>
        prev.map((item, i) =>
          i === editingIndex
            ? {
                selectedWords,
                analysis: analysis.trim(),
                timestamp: Date.now(),
              }
            : item,
        ),
      );

      // Reload from DB
      await loadAnalyses();

      setEditingIndex(null);
      setSelectedWordIds(new Set());
      setAnalysis("");
      setCurrentAnalysisId(null);
    } catch (error) {
      console.error("Error saving edit:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setSelectedWordIds(new Set());
    setAnalysis("");
    setCurrentAnalysisId(null);
  };

  // Submit all analyses in ONE request
  // Dans StanzaAnalysis.tsx, remplacer la fonction handleSubmitToAI par celle-ci :

  const handleSubmitToAI = async () => {
    try {
      // Valider qu'il y a des analyses à soumettre
      if (savedAnalyses.length === 0) {
        alert("Aucune analyse à soumettre");
        return;
      }

      setShowReviewDialog(false);

      // Marquer toutes les analyses comme complètes dans la DB
      for (const dbAnalysis of dbAnalyses) {
        await updateAnalysis(dbAnalysis.$id, {
          completed: true,
        });
      }

      // Préparer les analyses pour soumission (avec mots nettoyés)
      const analysesToSubmit = savedAnalyses.map((analysis) => ({
        selectedWords: analysis.selectedWords
          .map((uniqueId) => {
            const wordData = allWords.find((w) => w.uniqueId === uniqueId);
            return wordData?.cleanWord || uniqueId;
          })
          .filter(Boolean),
        analysis: analysis.analysis,
      }));

      // Appeler onSubmit qui gère l'évaluation multiple dans App.tsx
      onSubmit(analysesToSubmit);
    } catch (error) {
      console.error("Error submitting to AI:", error);
      alert("Erreur lors de la soumission à l'IA: " + (error as Error).message);
    }
  };

  const renderStanza = (s: typeof stanza, displayIndex: number) => {
    const stanzaWords = allWords.filter((w) => w.stanzaId === s.id);
    let wordCounter = 0;

    return (
      <div key={s.id} className="mb-8">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Strophe {displayIndex}
        </p>
        {s.lines.map((line, lineIndex) => {
          if (!line.trim()) {
            return <div key={`${s.id}-${lineIndex}`} className="h-4" />;
          }

          const words = line.split(/\s+/);
          const lineWords: WordData[] = [];

          words.forEach(() => {
            const wordData = stanzaWords[wordCounter];
            if (wordData) {
              lineWords.push(wordData);
              wordCounter++;
            }
          });

          const isSelected = (uniqueId: string) =>
            selectedWordIds.has(uniqueId);

          return (
            <div
              key={`${s.id}-${lineIndex}`}
              className="flex flex-wrap items-baseline gap-x-1 mb-1.5 leading-loose"
            >
              {lineWords.map((wordData) => (
                <button
                  key={wordData.uniqueId}
                  type="button"
                  onMouseDown={() => handleWordMouseDown(wordData.uniqueId)}
                  onMouseEnter={() => handleWordMouseEnter(wordData.uniqueId)}
                  className={`
                    inline-flex items-baseline px-0.5 -mx-0.5 rounded
                    transition-all duration-150 cursor-pointer select-none
                    ${
                      isSelected(wordData.uniqueId)
                        ? "bg-black dark:bg-white text-white dark:text-black scale-[1.02]"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  {wordData.prefix && (
                    <span className="opacity-60">{wordData.prefix}</span>
                  )}
                  <span>{wordData.cleanWord}</span>
                  {wordData.suffix && (
                    <span className="opacity-60">{wordData.suffix}</span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const canSave = analysis.trim().length > 0;
  const selectedWordsData = Array.from(selectedWordIds).map((id) => {
    return allWords.find((w) => w.uniqueId === id);
  });

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 md:px-12 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div>
              <h1 className="text-sm font-bold">{poem.title}</h1>
              <p className="text-[10px] text-muted-foreground">
                {isComplete
                  ? "Analyse complète"
                  : `Strophe ${stanzaIndex + 1}/${totalStanzas}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Text size selector */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTextSize("small")}
                className={`h-6 w-6 p-0 text-xs ${textSize === "small" ? "bg-muted" : ""}`}
                title="Petit"
              >
                A
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTextSize("medium")}
                className={`h-6 w-6 p-0 text-base ${textSize === "medium" ? "bg-muted" : ""}`}
                title="Moyen"
              >
                A
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTextSize("large")}
                className={`h-6 w-6 p-0 text-xl ${textSize === "large" ? "bg-muted" : ""}`}
                title="Grand"
              >
                A
              </Button>
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0"
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {/* Review button in header */}
            {savedAnalyses.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReviewDialog(true)}
                className="h-8 gap-2"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  Revoir ({savedAnalyses.length})
                </span>
                <span className="sm:hidden">{savedAnalyses.length}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto">
          {/* Desktop: 2 columns */}
          <div className="hidden md:flex h-full">
            {/* Left: Text (flexible) */}
            <div className="flex-1 border-r">
              <ScrollArea className="h-full">
                <div className="p-8">
                  <div className="max-w-3xl">
                    <div
                      className={`leading-relaxed ${
                        textSize === "small"
                          ? "text-base"
                          : textSize === "large"
                            ? "text-xl"
                            : "text-lg"
                      }`}
                    >
                      {stanzasToShow.map((s, idx) => renderStanza(s, idx + 1))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Resize handle */}
            <div
              className="w-1 bg-border hover:bg-primary cursor-col-resize relative group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Right: Sidebar (resizable) */}
            <div
              className="flex flex-col bg-muted/50 dark:bg-muted/20"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="flex-1 flex flex-col p-6 gap-4 min-h-0">
                {/* Selection badge */}
                {!isGeneralAnalysis && selectedWordIds.size > 0 && (
                  <div className="bg-card rounded-lg border p-4 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {selectedWordIds.size} mot
                        {selectedWordIds.size > 1 ? "s" : ""} sélectionné
                        {selectedWordIds.size > 1 ? "s" : ""}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="h-6 text-xs"
                      >
                        Effacer
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedWordsData.map((wordData) =>
                        wordData ? (
                          <Badge
                            key={wordData.uniqueId}
                            variant="secondary"
                            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 pr-1"
                          >
                            {wordData.cleanWord}
                            <button
                              onClick={() => removeWord(wordData.uniqueId)}
                              className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ) : null,
                      )}
                    </div>
                  </div>
                )}

                {/* Analysis textarea - flexible height */}
                <div className="bg-card rounded-lg border p-4 flex-1 flex flex-col min-h-0">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block flex-shrink-0">
                    {isGeneralAnalysis
                      ? "Votre analyse générale"
                      : "Votre analyse"}
                  </label>
                  <textarea
                    value={analysis}
                    onChange={(e) => setAnalysis(e.target.value)}
                    placeholder={
                      isGeneralAnalysis
                        ? "Faites une analyse générale du texte (thème, structure, style, figures de style, etc.)"
                        : "Expliquez le sens et l'effet des mots sélectionnés..."
                    }
                    className="w-full flex-1 px-3 py-2 text-sm bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-0"
                    disabled={isSaving}
                  />
                </div>

                {/* Buttons section - fixed at bottom */}
                <div className="flex-shrink-0 space-y-3">
                  {/* Save/Cancel buttons - side by side during edit */}
                  {editingIndex !== null ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="w-full"
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={!canSave || isSaving}
                        className="w-full gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden lg:inline">
                              Sauvegarde...
                            </span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="hidden lg:inline">
                              Sauvegarder
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleSaveAnalysis}
                      disabled={!canSave || isSaving}
                      className="w-full gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Enregistrer l'analyse
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: vertical layout */}
          <div className="md:hidden h-full flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6">
                <div
                  className={`leading-relaxed mb-6 ${
                    textSize === "small"
                      ? "text-base"
                      : textSize === "large"
                        ? "text-xl"
                        : "text-lg"
                  }`}
                >
                  {stanzasToShow.map((s, idx) => renderStanza(s, idx + 1))}
                </div>

                {/* Selection */}
                {!isGeneralAnalysis && selectedWordIds.size > 0 && (
                  <div className="bg-card rounded-lg border p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium">
                        {selectedWordIds.size} mot
                        {selectedWordIds.size > 1 ? "s" : ""}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="h-6 text-xs"
                      >
                        Effacer
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedWordsData.map((wordData) =>
                        wordData ? (
                          <Badge
                            key={wordData.uniqueId}
                            variant="secondary"
                            className="text-xs bg-primary text-primary-foreground pr-1"
                          >
                            {wordData.cleanWord}
                            <button
                              onClick={() => removeWord(wordData.uniqueId)}
                              className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ) : null,
                      )}
                    </div>
                  </div>
                )}

                {/* Analysis */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    {isGeneralAnalysis
                      ? "Votre analyse générale"
                      : "Votre analyse"}
                  </label>
                  <textarea
                    value={analysis}
                    onChange={(e) => setAnalysis(e.target.value)}
                    placeholder={
                      isGeneralAnalysis
                        ? "Faites une analyse générale du texte (thème, structure, style, figures de style, etc.)"
                        : "Expliquez le sens et l'effet des mots sélectionnés..."
                    }
                    className="w-full h-40 px-3 py-2 text-sm bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isSaving}
                  />
                </div>

                {/* Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={
                      editingIndex !== null
                        ? handleSaveEdit
                        : handleSaveAnalysis
                    }
                    disabled={!canSave || isSaving}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sauvegarde...
                      </>
                    ) : editingIndex !== null ? (
                      "Sauvegarder modification"
                    ) : (
                      "Enregistrer"
                    )}
                  </Button>

                  {editingIndex !== null && (
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      className="w-full"
                    >
                      Annuler
                    </Button>
                  )}

                  {savedAnalyses.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowReviewDialog(true)}
                        className="w-full"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Revoir ({savedAnalyses.length})
                      </Button>

                      <Button
                        onClick={handleSubmitToAI}
                        disabled={isLoading || isSaving}
                        className="w-full"
                      >
                        {isLoading || isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Évaluation...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Soumettre à l'IA
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Resume Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle>Analyse en cours détectée</DialogTitle>
                <DialogDescription className="mt-1">
                  Vous avez une analyse non terminée pour ce poème
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {incompleteAnalyses.length > 0 && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-2">
                  {incompleteAnalyses.length} analyse
                  {incompleteAnalyses.length > 1 ? "s" : ""} trouvée
                  {incompleteAnalyses.length > 1 ? "s" : ""} :
                </p>
                {incompleteAnalyses.slice(0, 2).map((incomplete, idx) => (
                  <div key={incomplete.$id} className="mb-3 last:mb-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Analyse {idx + 1}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {incomplete.analysis}
                    </p>
                  </div>
                ))}
                {incompleteAnalyses.length > 2 && (
                  <p className="text-xs text-muted-foreground italic">
                    +{incompleteAnalyses.length - 2} autre
                    {incompleteAnalyses.length - 2 > 1 ? "s" : ""}...
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleStartNew}
              className="w-full sm:w-auto"
            >
              Nouvelle analyse
            </Button>
            <Button onClick={handleResumeAnalysis} className="w-full sm:w-auto">
              Reprendre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Analyses enregistrées</DialogTitle>
            <DialogDescription>
              Vérifiez vos analyses avant de les soumettre à l'IA
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[500px] overflow-y-auto scrollbar-hide pr-4">
            <div className="space-y-4">
              {savedAnalyses.map((saved, index) => {
                const isGeneral = saved.selectedWords.length === 0;
                const displayWords = saved.selectedWords.map((uniqueId) => {
                  const wordData = allWords.find(
                    (w) => w.uniqueId === uniqueId,
                  );
                  return wordData?.cleanWord || uniqueId;
                });

                return (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-muted/20"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-2">
                          Analyse {index + 1}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {isGeneral ? (
                            <Badge
                              variant="default"
                              className="text-xs bg-purple-600 hover:bg-purple-700"
                            >
                              Analyse générale
                            </Badge>
                          ) : (
                            displayWords.map((word, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs"
                              >
                                {word}
                              </Badge>
                            ))
                          )}
                        </div>
                        <p className="text-sm">{saved.analysis}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAnalysis(index)}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAnalysis(index)}
                          className="h-7 w-7 p-0 text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
            >
              Fermer
            </Button>
            {savedAnalyses.length > 0 && (
              <Button
                onClick={handleSubmitToAI}
                disabled={isLoading || isSaving}
                className="gap-2"
              >
                {isLoading || isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Évaluation...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Soumettre à l'IA (
                    {savedAnalyses.length +
                      dbAnalyses.filter(
                        (db) =>
                          !savedAnalyses.some(
                            (s) => String(s.timestamp) === db.$createdAt,
                          ),
                      ).length}
                    )
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
