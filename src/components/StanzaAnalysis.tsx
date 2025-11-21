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
} from "lucide-react";
import type { Poem, UserAnswer } from "@/types";
import {
  createAnalysis,
  updateAnalysis,
  getUserAnalysesForPoem,
  getIncompleteAnalysis,
  type SavedAnalysisDocument,
} from "@/lib/appwrite/database";

interface StanzaAnalysisProps {
  poem: Poem;
  stanzaIndex: number;
  totalStanzas: number;
  mode: "complete" | "quick";
  userId: string;
  onSubmit: (answer: UserAnswer) => void;
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
  timestamp: number;
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
  const [incompleteAnalysis, setIncompleteAnalysis] =
    useState<SavedAnalysisDocument | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(
    null,
  );
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const isComplete = mode === "complete";

  // Load existing analyses from DB
  const loadAnalyses = useCallback(async () => {
    try {
      const analyses = await getUserAnalysesForPoem(userId, poem.id);
      setDbAnalyses(analyses);
    } catch (error) {
      console.error("Error loading analyses:", error);
    }
  }, [userId, poem.id]);

  // Load incomplete analysis on mount
  useEffect(() => {
    const loadIncompleteAnalysis = async () => {
      if (hasLoadedIncomplete) return;

      try {
        const incomplete = await getIncompleteAnalysis(userId, poem.id);
        if (incomplete) {
          console.log("📋 Analyse incomplète trouvée:", incomplete);
          setIncompleteAnalysis(incomplete);
          setShowResumeDialog(true);
          setHasLoadedIncomplete(true);
        }
      } catch (error) {
        console.error("Error loading incomplete analysis:", error);
      }
    };

    loadIncompleteAnalysis();
  }, [userId, poem.id, hasLoadedIncomplete]);

  // Handle resume choice
  const handleResumeAnalysis = () => {
    if (incompleteAnalysis) {
      console.log("✅ Reprise de l'analyse");

      // Map selected words back to uniqueIds
      const wordIds = new Set<string>();
      incompleteAnalysis.selectedWords.forEach((cleanWord) => {
        const wordData = allWords.find((w) => w.cleanWord === cleanWord);
        if (wordData) {
          wordIds.add(wordData.uniqueId);
        }
      });

      setSelectedWordIds(wordIds);
      setAnalysis(incompleteAnalysis.analysis);
      setCurrentAnalysisId(incompleteAnalysis.$id);
      setShowResumeDialog(false);
      setHasLoadedIncomplete(true);
    }
  };

  const handleStartNew = async () => {
    console.log("🆕 Nouvelle analyse");

    // Mark the incomplete analysis as completed or delete it
    if (incompleteAnalysis) {
      try {
        await updateAnalysis(incompleteAnalysis.$id, { completed: true });
      } catch (error) {
        console.error("Error marking analysis as completed:", error);
      }
    }

    setShowResumeDialog(false);
    setIncompleteAnalysis(null);
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

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

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
      const selectedWords = Array.from(selectedWordIds).map((id) => {
        const wordData = allWords.find((w) => w.uniqueId === id);
        return wordData?.cleanWord || "";
      });

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
    setEditingIndex(index);

    // Reconstruct word IDs from selected words
    const wordIds = new Set<string>();
    saved.selectedWords.forEach((cleanWord) => {
      const wordData = allWords.find((w) => w.cleanWord === cleanWord);
      if (wordData) {
        wordIds.add(wordData.uniqueId);
      }
    });

    setSelectedWordIds(wordIds);
    setAnalysis(saved.analysis);
    setShowReviewDialog(false);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;

    setIsSaving(true);
    try {
      const selectedWords = Array.from(selectedWordIds).map((id) => {
        const wordData = allWords.find((w) => w.uniqueId === id);
        return wordData?.cleanWord || "";
      });

      // Update in DB if exists
      const dbAnalysis = dbAnalyses[editingIndex];
      if (dbAnalysis) {
        await updateAnalysis(dbAnalysis.$id, {
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
  };

  const handleSubmitToAI = async () => {
    try {
      // Combine all saved analyses
      const combinedWords = savedAnalyses.flatMap((a) => a.selectedWords);
      const combinedAnalysis = savedAnalyses
        .map((a) => a.analysis)
        .join("\n\n");

      const answer: UserAnswer = {
        stanzaId: stanza.id,
        selectedWords: combinedWords,
        analysis: combinedAnalysis,
      };

      // Mark all as completed in DB
      for (const dbAnalysis of dbAnalyses) {
        await updateAnalysis(dbAnalysis.$id, {
          completed: true,
        });
      }

      onSubmit(answer);
    } catch (error) {
      console.error("Error submitting to AI:", error);
      alert("Erreur lors de la soumission");
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
                        ? "bg-black text-white scale-[1.02]"
                        : "hover:bg-gray-100"
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

  const canSave = selectedWordIds.size > 0 && analysis.trim().length > 0;
  const selectedWordsData = Array.from(selectedWordIds).map((id) => {
    return allWords.find((w) => w.uniqueId === id);
  });

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur">
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
                    <div className="text-base leading-relaxed">
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
              className="flex flex-col bg-muted/20"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="flex-1 flex flex-col p-6 gap-4 min-h-0">
                {/* Selection badge */}
                {selectedWordIds.size > 0 && (
                  <div className="bg-background rounded-lg border p-4 flex-shrink-0">
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
                            className="text-xs bg-black text-white hover:bg-black/90 pr-1"
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
                <div className="bg-background rounded-lg border p-4 flex-1 flex flex-col min-h-0">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block flex-shrink-0">
                    Votre analyse
                  </label>
                  <textarea
                    value={analysis}
                    onChange={(e) => setAnalysis(e.target.value)}
                    placeholder="Expliquez le sens et l'effet des mots sélectionnés..."
                    className="w-full flex-1 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-black min-h-0"
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
                        className="w-full bg-black hover:bg-black/90 gap-2"
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
                      className="w-full bg-black hover:bg-black/90 gap-2"
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

                  {/* Submit to AI */}
                  {savedAnalyses.length > 0 && (
                    <Button
                      onClick={handleSubmitToAI}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-gray-700 gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Évaluation en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Soumettre à l'IA
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
                <div className="text-base leading-relaxed mb-6">
                  {stanzasToShow.map((s, idx) => renderStanza(s, idx + 1))}
                </div>

                {/* Selection */}
                {selectedWordIds.size > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
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
                            className="text-xs bg-black text-white pr-1"
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
                    Votre analyse
                  </label>
                  <textarea
                    value={analysis}
                    onChange={(e) => setAnalysis(e.target.value)}
                    placeholder="Expliquez le sens et l'effet des mots sélectionnés..."
                    className="w-full h-40 px-3 py-2 text-sm border rounded-md resize-none"
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
                    className="w-full bg-black hover:bg-black/90"
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
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-black to-gray-800"
                      >
                        {isLoading ? (
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

          {incompleteAnalysis && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-2">Aperçu :</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {incompleteAnalysis.selectedWords
                    .slice(0, 5)
                    .map((word, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                  {incompleteAnalysis.selectedWords.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{incompleteAnalysis.selectedWords.length - 5}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {incompleteAnalysis.analysis}
                </p>
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
            <Button
              onClick={handleResumeAnalysis}
              className="w-full sm:w-auto bg-black hover:bg-black/90"
            >
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

          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-4">
              {savedAnalyses.map((saved, index) => (
                <div key={index} className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2">
                        Analyse {index + 1}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {saved.selectedWords.map((word, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {word}
                          </Badge>
                        ))}
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
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
