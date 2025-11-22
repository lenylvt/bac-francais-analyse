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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
  FileEdit,
  AlertTriangle,
  Underline,
  Link2,
  Brush,
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

type AnnotationType = "draft" | "important" | "underline";

interface Annotation {
  wordId: string;
  type: AnnotationType;
  color?: string;
  note?: string;
  timestamp: number;
  groupId?: string;
}

interface AnnotationGroup {
  id: string;
  name: string;
  color: string;
  wordIds: string[];
  note?: string;
  timestamp: number;
}

interface AnnotationHistoryItem {
  action: "add" | "remove" | "edit";
  annotation: Annotation;
  timestamp: number;
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
  const [annotations, setAnnotations] = useState<Map<string, Annotation>>(
    new Map(),
  );
  const [annotationMode, setAnnotationMode] = useState<AnnotationType | null>(
    null,
  );
  const [annotationHistory, setAnnotationHistory] = useState<
    AnnotationHistoryItem[]
  >([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [brushMode, setBrushMode] = useState(false);
  const [editingNote, setEditingNote] = useState<{
    wordId: string;
    note: string;
  } | null>(null);
  const [annotationGroups, setAnnotationGroups] = useState<
    Map<string, AnnotationGroup>
  >(new Map());
  const [selectedGroupWords, setSelectedGroupWords] = useState<Set<string>>(
    new Set(),
  );
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);

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

  // Ajouter une annotation à l'historique
  const addToHistory = (
    action: "add" | "remove" | "edit",
    annotation: Annotation,
  ) => {
    const newHistory = annotationHistory.slice(0, historyIndex + 1);
    newHistory.push({ action, annotation, timestamp: Date.now() });
    setAnnotationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo annotation
  const undoAnnotation = () => {
    if (historyIndex < 0) return;
    const item = annotationHistory[historyIndex];
    setAnnotations((prev) => {
      const newMap = new Map(prev);
      if (item.action === "add") {
        newMap.delete(item.annotation.wordId);
      } else if (item.action === "remove") {
        newMap.set(item.annotation.wordId, item.annotation);
      }
      return newMap;
    });
    setHistoryIndex(historyIndex - 1);
  };

  // Redo annotation
  const redoAnnotation = () => {
    if (historyIndex >= annotationHistory.length - 1) return;
    const item = annotationHistory[historyIndex + 1];
    setAnnotations((prev) => {
      const newMap = new Map(prev);
      if (item.action === "add") {
        newMap.set(item.annotation.wordId, item.annotation);
      } else if (item.action === "remove") {
        newMap.delete(item.annotation.wordId);
      }
      return newMap;
    });
    setHistoryIndex(historyIndex + 1);
  };

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoAnnotation();
      }
      // Ctrl/Cmd + Shift + Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redoAnnotation();
      }
      // Esc = désactiver mode annotation
      if (e.key === "Escape") {
        setAnnotationMode(null);
        setBrushMode(false);
      }
      // 1-3 = types d'annotation
      if (e.key === "1") setAnnotationMode("draft");
      if (e.key === "2") setAnnotationMode("important");
      if (e.key === "3") setAnnotationMode("underline");
      // B = toggle brush mode
      if (e.key === "b" || e.key === "B") {
        setBrushMode((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, annotationHistory]);

  const handleWordMouseDown = useCallback(
    (uniqueId: string) => {
      // Si mode annotation, appliquer l'annotation
      if (annotationMode) {
        setAnnotations((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(uniqueId);

          if (existing && existing.type === annotationMode) {
            // Retirer l'annotation si même type
            newMap.delete(uniqueId);
            addToHistory("remove", existing);
          } else {
            // Ajouter/changer l'annotation
            const newAnnotation: Annotation = {
              wordId: uniqueId,
              type: annotationMode,
              timestamp: Date.now(),
            };
            newMap.set(uniqueId, newAnnotation);
            addToHistory("add", newAnnotation);
          }
          return newMap;
        });

        // Si brush mode, continuer le drag
        if (brushMode) {
          setIsDragging(true);
          dragStartWordId.current = uniqueId;
        }
        return;
      }

      // Sinon, sélection normale
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
    },
    [annotationMode, brushMode, historyIndex, annotationHistory],
  );

  const handleWordMouseEnter = useCallback(
    (uniqueId: string) => {
      // Brush mode en annotation
      if (annotationMode && brushMode && isDragging) {
        setAnnotations((prev) => {
          const newMap = new Map(prev);
          if (
            !newMap.has(uniqueId) ||
            newMap.get(uniqueId)?.type !== annotationMode
          ) {
            const newAnnotation: Annotation = {
              wordId: uniqueId,
              type: annotationMode,
              timestamp: Date.now(),
            };
            newMap.set(uniqueId, newAnnotation);
            addToHistory("add", newAnnotation);
          }
          return newMap;
        });
        return;
      }

      // Mode sélection normale
      if (
        !annotationMode &&
        isDragging &&
        dragStartWordId.current !== uniqueId
      ) {
        setSelectedWordIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(uniqueId);
          return newSet;
        });
      }
    },
    [isDragging, annotationMode, brushMode, historyIndex, annotationHistory],
  );

  const handleWordMouseLeave = () => {};

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartWordId.current = null;
  };

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

  const clearAll = () => {
    setSelectedWordIds(new Set());
    setAnnotations(new Map());
    setAnnotationGroups(new Map());
    setAnnotationHistory([]);
    setHistoryIndex(-1);
  };

  const getAnnotationStyle = (wordId: string, isSelected: boolean) => {
    const annotation = annotations.get(wordId);
    const groupId = annotation?.groupId;
    const isGroupHovered = groupId && hoveredGroupId === groupId;
    const groupHighlight = isGroupHovered
      ? "ring-2 ring-offset-1 ring-blue-500 "
      : "";

    // Si sélectionné pour analyse
    if (isSelected && !annotation) {
      return "bg-black dark:bg-white text-white dark:text-black scale-[1.02]";
    }

    // Si annoté
    if (annotation) {
      const hasNote = annotation.note ? "border-b-2 border-dotted " : "";

      switch (annotation.type) {
        case "draft":
          return (
            groupHighlight +
            hasNote +
            "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 italic border-amber-400"
          );
        case "important":
          return (
            groupHighlight +
            hasNote +
            "bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-100 font-semibold border-rose-400"
          );
        case "underline":
          return (
            groupHighlight +
            hasNote +
            "underline decoration-2 decoration-blue-500 dark:decoration-blue-400 underline-offset-4"
          );
      }
    }

    // Défaut
    return "hover:bg-gray-100 dark:hover:bg-gray-800";
  };

  const getAnnotationCounts = () => {
    const counts = {
      draft: 0,
      important: 0,
      underline: 0,
    };
    annotations.forEach((ann) => {
      counts[ann.type]++;
    });
    return counts;
  };

  const handleAddNote = (wordId: string, note: string) => {
    setAnnotations((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(wordId);
      if (existing) {
        const updated = { ...existing, note };
        newMap.set(wordId, updated);
        addToHistory("edit", updated);
      }
      return newMap;
    });
    setEditingNote(null);
  };

  const handleAddNoteClick = (wordId: string) => {
    const annotation = annotations.get(wordId);
    if (annotation) {
      setEditingNote({ wordId, note: annotation.note || "" });
    }
  };

  const handleCreateGroup = () => {
    if (selectedGroupWords.size === 0) return;

    const groupId = `group-${Date.now()}`;
    const newGroup: AnnotationGroup = {
      id: groupId,
      name: `Groupe ${annotationGroups.size + 1}`,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      wordIds: Array.from(selectedGroupWords),
      timestamp: Date.now(),
    };

    setAnnotationGroups((prev) => new Map(prev).set(groupId, newGroup));

    // Ajouter groupId aux annotations
    setAnnotations((prev) => {
      const newMap = new Map(prev);
      selectedGroupWords.forEach((wordId) => {
        const ann = newMap.get(wordId);
        if (ann) {
          newMap.set(wordId, { ...ann, groupId });
        }
      });
      return newMap;
    });

    setSelectedGroupWords(new Set());
    setCreatingGroup(false);
  };

  const handleWordClickForGroup = (wordId: string) => {
    if (!creatingGroup) return;

    setSelectedGroupWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const handleGroupHover = (groupId: string | null) => {
    setHoveredGroupId(groupId);
  };

  const annotationCounts = getAnnotationCounts();

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
                  onMouseDown={() => {
                    if (creatingGroup) {
                      handleWordClickForGroup(wordData.uniqueId);
                    } else {
                      handleWordMouseDown(wordData.uniqueId);
                    }
                  }}
                  onMouseEnter={() => {
                    handleWordMouseEnter(wordData.uniqueId);
                    const annotation = annotations.get(wordData.uniqueId);
                    if (annotation?.groupId) {
                      handleGroupHover(annotation.groupId);
                    }
                  }}
                  onMouseLeave={() => {
                    handleWordMouseLeave();
                    handleGroupHover(null);
                  }}
                  className={`
                    inline-flex items-baseline px-0.5 -mx-0.5 rounded relative
                    transition-all duration-150 cursor-pointer select-none
                    ${getAnnotationStyle(wordData.uniqueId, isSelected(wordData.uniqueId))}
                    ${creatingGroup && selectedGroupWords.has(wordData.uniqueId) ? "ring-2 ring-blue-500" : ""}
                  `}
                  onClick={(e) => {
                    if (e.detail === 2 && annotations.has(wordData.uniqueId)) {
                      // Double-clic pour ajouter une note
                      handleAddNoteClick(wordData.uniqueId);
                    }
                  }}
                >
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <span className="flex items-baseline">
                        {wordData.prefix && (
                          <span className="opacity-60">{wordData.prefix}</span>
                        )}
                        <span>{wordData.cleanWord}</span>
                        {wordData.suffix && (
                          <span className="opacity-60">{wordData.suffix}</span>
                        )}
                        {annotations.get(wordData.uniqueId)?.note && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </span>
                    </HoverCardTrigger>
                    {annotations.get(wordData.uniqueId)?.note && (
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Note</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleAddNoteClick(wordData.uniqueId)
                              }
                              className="h-6 px-2"
                            >
                              <FileEdit className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {annotations.get(wordData.uniqueId)!.note}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Double-clic pour éditer
                          </div>
                        </div>
                      </HoverCardContent>
                    )}
                  </HoverCard>
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
            <div className="flex-1 border-r flex flex-col">
              {/* Toolbar collée en haut */}
              {showToolbar && (
                <div className="border-b bg-muted/30 p-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Annotation types */}
                    <Button
                      variant={annotationMode === "draft" ? "default" : "ghost"}
                      size="sm"
                      onClick={() =>
                        setAnnotationMode(
                          annotationMode === "draft" ? null : "draft",
                        )
                      }
                      className="h-8 gap-2"
                      title="Brouillon (1)"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline text-xs">
                        Brouillon
                      </span>
                      {annotationCounts.draft > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 h-4 px-1 text-[10px]"
                        >
                          {annotationCounts.draft}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant={
                        annotationMode === "important" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() =>
                        setAnnotationMode(
                          annotationMode === "important" ? null : "important",
                        )
                      }
                      className="h-8 gap-2"
                      title="Important (2)"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline text-xs">
                        Important
                      </span>
                      {annotationCounts.important > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 h-4 px-1 text-[10px]"
                        >
                          {annotationCounts.important}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant={
                        annotationMode === "underline" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() =>
                        setAnnotationMode(
                          annotationMode === "underline" ? null : "underline",
                        )
                      }
                      className="h-8 gap-2"
                      title="Souligner (3)"
                    >
                      <Underline className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline text-xs">
                        Souligner
                      </span>
                      {annotationCounts.underline > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 h-4 px-1 text-[10px]"
                        >
                          {annotationCounts.underline}
                        </Badge>
                      )}
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Brush mode */}
                    <Button
                      variant={brushMode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBrushMode(!brushMode)}
                      className="h-8 gap-2"
                      title="Mode pinceau (B)"
                    >
                      <Brush className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline text-xs">Pinceau</span>
                    </Button>

                    {/* Groups */}
                    <Button
                      variant={creatingGroup ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCreatingGroup(!creatingGroup)}
                      className="h-8 gap-2"
                      title="Créer un groupe"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline text-xs">Groupe</span>
                    </Button>
                  </div>

                  {/* Toggle toolbar button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToolbar(false)}
                    className="h-7 w-7 p-0"
                    title="Masquer la barre d'outils"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Show toolbar button when hidden */}
              {!showToolbar && (
                <div className="border-b bg-muted/10 p-1 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToolbar(true)}
                    className="h-6 text-xs gap-1"
                  >
                    <GripVertical className="w-3 h-3" />
                    Outils d'annotation
                  </Button>
                </div>
              )}

              <ScrollArea className="flex-1">
                <div className="p-8">
                  <div className="max-w-3xl mx-auto">
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
                {/* Creating group mode */}
                {creatingGroup && (
                  <div className="bg-card rounded-lg border p-3 flex-shrink-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Mode création de groupe
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Cliquez sur les mots à regrouper (
                      {selectedGroupWords.size} sélectionné
                      {selectedGroupWords.size > 1 ? "s" : ""})
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateGroup}
                        disabled={selectedGroupWords.size < 2}
                        className="h-7 text-xs"
                      >
                        Créer le groupe
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCreatingGroup(false);
                          setSelectedGroupWords(new Set());
                        }}
                        className="h-7 text-xs"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}

                {/* Annotation info */}
                {annotationMode && !creatingGroup && (
                  <div className="bg-card rounded-lg border p-3 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      {annotationMode === "draft" && (
                        <FileEdit className="w-4 h-4 text-amber-600" />
                      )}
                      {annotationMode === "important" && (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      {annotationMode === "underline" && (
                        <Underline className="w-4 h-4 text-blue-600" />
                      )}
                      <p className="text-xs font-medium">
                        Mode :{" "}
                        {annotationMode === "draft"
                          ? "Brouillon"
                          : annotationMode === "important"
                            ? "Important"
                            : "Souligné"}
                        {brushMode && " (Pinceau)"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {brushMode
                        ? "Maintenez et glissez pour annoter plusieurs mots"
                        : "Cliquez sur les mots • Double-clic pour ajouter une note"}
                    </p>
                  </div>
                )}

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
                        Tout effacer
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

      {/* Groups display in sidebar when creating */}
      {creatingGroup && annotationGroups.size > 0 && (
        <div className="fixed right-4 top-20 w-64 bg-card border shadow-xl z-40 rounded-lg">
          <div className="p-3 border-b">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Groupes existants
            </h4>
          </div>
          <ScrollArea className="max-h-96">
            <div className="p-3 space-y-2">
              {Array.from(annotationGroups.values()).map((group) => (
                <div
                  key={group.id}
                  className="bg-muted/30 rounded-lg p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                  onMouseEnter={() => handleGroupHover(group.id)}
                  onMouseLeave={() => handleGroupHover(null)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-xs font-medium truncate">
                      {group.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {group.wordIds.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {group.wordIds.slice(0, 3).map((wordId) => {
                      const wordData = allWords.find(
                        (w) => w.uniqueId === wordId,
                      );
                      return (
                        <span
                          key={wordId}
                          className="text-[10px] px-1.5 py-0.5 bg-muted rounded"
                        >
                          {wordData?.cleanWord || "?"}
                        </span>
                      );
                    })}
                    {group.wordIds.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{group.wordIds.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Note editing dialog */}
      {editingNote && (
        <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingNote?.note ? "Modifier la note" : "Ajouter une note"}
              </DialogTitle>
              <DialogDescription>
                Note personnelle sur cette annotation (double-clic sur le mot ou
                clic sur 📝)
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={editingNote?.note || ""}
              onChange={(e) =>
                setEditingNote(
                  editingNote ? { ...editingNote, note: e.target.value } : null,
                )
              }
              placeholder="Votre note..."
              className="w-full h-24 px-3 py-2 text-sm bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingNote(null)}>
                Annuler
              </Button>
              <Button
                onClick={() =>
                  editingNote &&
                  handleAddNote(editingNote.wordId, editingNote.note)
                }
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
