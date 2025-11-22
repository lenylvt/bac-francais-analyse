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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
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
  Type,
  Underline,
  Highlighter,
  PencilLine,
  StickyNote,
  Palette,
  ChevronDown,
  ChevronUp,
  Eraser,
  Trash2,
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
  onSubmit?: (
    analyses: { selectedWords: string[]; analysis: string }[],
  ) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

interface WordData {
  cleanWord: string;
  prefix: string;
  suffix: string;
  stanzaId: number;
  uniqueId: string;
}

type AnnotationType = "highlight" | "underline";
type AnnotationColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "orange"
  | "purple";

interface Annotation {
  wordId: string;
  type: AnnotationType;
  color: AnnotationColor;
  note?: string;
  timestamp: number;
}

interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: AnnotationColor;
  content: string;
  timestamp: number;
}

interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
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
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>("yellow");
  const [annotationHistory, setAnnotationHistory] = useState<
    AnnotationHistoryItem[]
  >([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editingNote, setEditingNote] = useState<{
    wordId: string;
    note: string;
  } | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [drawingStrokes, setDrawingStrokes] = useState<DrawingStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<
    { x: number; y: number }[]
  >([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const isComplete = mode === "complete";
  const isGeneralAnalysis = selectedWordIds.size === 0;

  const loadAnalyses = useCallback(async () => {
    try {
      const analyses = await getUserAnalysesForPoem(userId, poem.id);
      const completedAnalyses = analyses.filter((a) => a.completed);
      for (const completed of completedAnalyses) {
        await deleteAnalysis(completed.$id);
      }
    } catch (error) {
      console.error("Error loading analyses:", error);
    }
  }, [userId, poem.id]);

  useEffect(() => {
    const loadIncompleteAnalyses = async () => {
      if (hasLoadedIncomplete) return;
      try {
        const incompletes = await getIncompleteAnalyses(userId, poem.id);
        if (incompletes.length > 0) {
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

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const handleResumeAnalysis = async () => {
    // Charger TOUTES les analyses incomplètes dans savedAnalyses
    const allAnalyses = incompleteAnalyses.map((incomplete) => {
      const selectedWordsDisplay = incomplete.selectedWords.map((uniqueId) => {
        const wordData = allWords.find((w) => w.uniqueId === uniqueId);
        return wordData?.cleanWord || uniqueId;
      });
      return {
        selectedWords: selectedWordsDisplay,
        analysis: incomplete.analysis,
      };
    });
    setSavedAnalyses(allAnalyses);
    setShowResumeDialog(false);
  };

  const handleStartNew = async () => {
    for (const analysis of incompleteAnalyses) {
      try {
        await deleteAnalysis(analysis.$id);
      } catch (error) {
        console.error("Error deleting analysis:", error);
      }
    }
    setShowResumeDialog(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 280 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing],
  );

  const handleResizeMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleResizeMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleResizeMouseUp);
      };
    }
  }, [isResizing, handleMouseMove]);

  const allWords: WordData[] = [];
  const stanzasToShow = isComplete ? poem.stanzas : [stanza];

  stanzasToShow.forEach((s, idx) => {
    s.lines.forEach((line) => {
      const words = line.split(/(\s+|[.,;:!?'"-]+)/);
      words.forEach((word) => {
        if (word.trim()) {
          const match = word.match(
            /^([.,;:!?'"-]*)([^.,;:!?'"-]+)([.,;:!?'"-]*)$/,
          );
          const prefix = match?.[1] || "";
          const cleanWord = match?.[2] || word;
          const suffix = match?.[3] || "";
          const stanzaId = isComplete ? idx : stanzaIndex;
          const uniqueId = `${stanzaId}-${cleanWord}-${allWords.filter((w) => w.cleanWord === cleanWord && w.stanzaId === stanzaId).length}`;
          allWords.push({
            cleanWord,
            prefix,
            suffix,
            stanzaId,
            uniqueId,
          });
        }
      });
    });
  });

  const addToHistory = (
    action: "add" | "remove" | "edit",
    annotation: Annotation,
  ) => {
    const newHistory = annotationHistory.slice(0, historyIndex + 1);
    newHistory.push({
      action,
      annotation,
      timestamp: Date.now(),
    });
    setAnnotationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undoAnnotation = () => {
    if (historyIndex < 0) return;
    const item = annotationHistory[historyIndex];
    const newMap = new Map(annotations);
    if (item.action === "add") {
      newMap.delete(item.annotation.wordId);
    } else if (item.action === "remove") {
      newMap.set(item.annotation.wordId, item.annotation);
    }
    setAnnotations(newMap);
    setHistoryIndex(historyIndex - 1);
  };

  const redoAnnotation = () => {
    if (historyIndex >= annotationHistory.length - 1) return;
    const item = annotationHistory[historyIndex + 1];
    const newMap = new Map(annotations);
    if (item.action === "add") {
      newMap.set(item.annotation.wordId, item.annotation);
    } else if (item.action === "remove") {
      newMap.delete(item.annotation.wordId);
    }
    setAnnotations(newMap);
    setHistoryIndex(historyIndex + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redoAnnotation();
        } else {
          undoAnnotation();
        }
      }
      if (e.key === "Escape") {
        setAnnotationMode(null);
      }
      if (e.key === "1") setAnnotationMode("highlight");
      if (e.key === "2") setAnnotationMode("underline");
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, annotationHistory]);

  const handleWordMouseDown = useCallback(
    (uniqueId: string) => {
      if (!annotationMode) {
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
        return;
      }

      setAnnotations((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(uniqueId);

        if (
          existing &&
          existing.type === annotationMode &&
          existing.color === selectedColor
        ) {
          newMap.delete(uniqueId);
          addToHistory("remove", existing);
        } else {
          const newAnnotation: Annotation = {
            wordId: uniqueId,
            type: annotationMode,
            color: selectedColor,
            timestamp: Date.now(),
          };
          newMap.set(uniqueId, newAnnotation);
          addToHistory("add", newAnnotation);
        }
        return newMap;
      });
    },
    [annotationMode, selectedColor, historyIndex, annotationHistory],
  );

  const handleWordMouseEnter = useCallback(
    (uniqueId: string) => {
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
    [isDragging, annotationMode],
  );

  const handleWordMouseLeave = () => {};

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

  const clearAll = () => {
    setSelectedWordIds(new Set());
    setAnalysis("");
    setAnnotations(new Map());
    setAnnotationHistory([]);
    setHistoryIndex(-1);
    setStickyNotes([]);
    setDrawingStrokes([]);
  };

  const getAnnotationStyle = (wordId: string, isSelected: boolean) => {
    const annotation = annotations.get(wordId);

    if (isSelected) {
      return "bg-black dark:bg-white text-white dark:text-black scale-[1.02] font-medium z-10 relative";
    }

    if (annotation) {
      const hasNote = annotation.note
        ? "border-b-2 border-dotted border-current "
        : "";
      const colorMap: Record<AnnotationColor, { bg: string; text: string }> = {
        yellow: {
          bg: "bg-yellow-200 dark:bg-yellow-900/40",
          text: "text-yellow-900 dark:text-yellow-100",
        },
        green: {
          bg: "bg-green-200 dark:bg-green-900/40",
          text: "text-green-900 dark:text-green-100",
        },
        blue: {
          bg: "bg-blue-200 dark:bg-blue-900/40",
          text: "text-blue-900 dark:text-blue-100",
        },
        pink: {
          bg: "bg-pink-200 dark:bg-pink-900/40",
          text: "text-pink-900 dark:text-pink-100",
        },
        orange: {
          bg: "bg-orange-200 dark:bg-orange-900/40",
          text: "text-orange-900 dark:text-orange-100",
        },
        purple: {
          bg: "bg-purple-200 dark:bg-purple-900/40",
          text: "text-purple-900 dark:text-purple-100",
        },
      };

      const colors = colorMap[annotation.color];

      switch (annotation.type) {
        case "highlight":
          return `${hasNote}${colors.bg} ${colors.text} px-1 rounded`;
        case "underline":
          return `${hasNote}underline decoration-2 underline-offset-4 ${colors.text}`;
      }
    }

    return "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors";
  };

  const getAnnotationCounts = () => {
    const counts = { highlight: 0, underline: 0 };
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
      }
      return newMap;
    });
    setEditingNote(null);
  };

  const handleAddNoteClick = (wordId: string) => {
    const annotation = annotations.get(wordId);
    setEditingNote({ wordId, note: annotation?.note || "" });
  };

  const handleAddStickyNote = () => {
    const scrollContainer = document.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    const scrollTop = scrollContainer?.scrollTop || 0;

    const newNote: StickyNote = {
      id: `sticky-${Date.now()}`,
      x: 50 + (stickyNotes.length % 5) * 30,
      y: scrollTop + 100 + Math.floor(stickyNotes.length / 5) * 30,
      width: 180,
      height: 150,
      color: selectedColor,
      content: "",
      timestamp: Date.now(),
    };
    setStickyNotes((prev) => [...prev, newNote]);
  };

  const handleUpdateStickyNote = (id: string, updates: Partial<StickyNote>) => {
    setStickyNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...updates } : note)),
    );
  };

  const handleNoteDragStart = (id: string, e: React.MouseEvent) => {
    const note = stickyNotes.find((n) => n.id === id);
    if (!note) return;

    const rect = textContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffset.current = {
      x: e.clientX - rect.left - note.x,
      y: e.clientY - rect.top - note.y,
    };
    setDraggedNoteId(id);

    const handleMouseMove = (e: MouseEvent) => {
      if (!textContainerRef.current) return;
      const rect = textContainerRef.current.getBoundingClientRect();

      const newX = e.clientX - rect.left - dragOffset.current.x;
      const newY = e.clientY - rect.top - dragOffset.current.y;

      setStickyNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                x: Math.max(0, Math.min(newX, rect.width - n.width)),
                y: Math.max(0, newY),
              }
            : n,
        ),
      );
    };

    const handleMouseUp = () => {
      setDraggedNoteId(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleDeleteStickyNote = (id: string) => {
    setStickyNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return;

    if (eraserMode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        setDrawingStrokes((prev) =>
          prev.filter((stroke) => {
            return !stroke.points.some((point) => {
              const distance = Math.sqrt(
                Math.pow(point.x - clickX, 2) + Math.pow(point.y - clickY, 2),
              );
              return distance < 10;
            });
          }),
        );
      }
      return;
    }

    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return;

    if (eraserMode && e.buttons === 1) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        setDrawingStrokes((prev) =>
          prev.filter((stroke) => {
            return !stroke.points.some((point) => {
              const distance = Math.sqrt(
                Math.pow(point.x - clickX, 2) + Math.pow(point.y - clickY, 2),
              );
              return distance < 10;
            });
          }),
        );
      }
      return;
    }

    if (!isDrawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setCurrentStroke((prev) => [
        ...prev,
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
      ]);
    }
  };

  const handleCanvasMouseUp = () => {
    if (eraserMode) return;
    if (!isDrawing || currentStroke.length === 0) return;
    const colorMap: Record<AnnotationColor, string> = {
      yellow: "#fef08a",
      green: "#86efac",
      blue: "#93c5fd",
      pink: "#f9a8d4",
      orange: "#fdba74",
      purple: "#d8b4fe",
    };
    const newStroke: DrawingStroke = {
      id: `stroke-${Date.now()}`,
      points: currentStroke,
      color: colorMap[selectedColor],
      width: 3,
      timestamp: Date.now(),
    };
    setDrawingStrokes((prev) => [...prev, newStroke]);
    setCurrentStroke([]);
    setIsDrawing(false);
  };

  useEffect(() => {
    if (!drawingMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawingStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    });

    if (currentStroke.length > 1) {
      const colorMap: Record<AnnotationColor, string> = {
        yellow: "#fef08a",
        green: "#86efac",
        blue: "#93c5fd",
        pink: "#f9a8d4",
        orange: "#fdba74",
        purple: "#d8b4fe",
      };
      ctx.strokeStyle = colorMap[selectedColor];
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      currentStroke.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }
  }, [drawingMode, drawingStrokes, currentStroke, selectedColor]);

  const annotationCounts = getAnnotationCounts();

  const handleSaveAnalysis = async () => {
    if (!analysis.trim()) return;

    // Pour l'affichage local
    const selectedWordsDisplay = Array.from(selectedWordIds).map((id) => {
      const wordData = allWords.find((w) => w.uniqueId === id);
      return wordData?.cleanWord || "";
    });

    // Pour la DB on garde les uniqueId
    const selectedWordsIds = Array.from(selectedWordIds);

    const newAnalysis: SavedAnalysis = {
      selectedWords: selectedWordsDisplay,
      analysis,
    };
    setSavedAnalyses([...savedAnalyses, newAnalysis]);

    try {
      setIsSaving(true);
      // Toujours créer une nouvelle analyse (pas d'update)
      const newDoc = await createAnalysis({
        userId,
        poemId: poem.id,
        poemTitle: poem.title,
        stanzaId: stanzaIndex,
        selectedWords: selectedWordsIds,
        analysis,
        completed: false,
      });
      console.log("✅ Analyse sauvegardée:", newDoc.$id);
    } catch (error) {
      console.error("Error saving analysis:", error);
    } finally {
      setIsSaving(false);
    }

    setSelectedWordIds(new Set());
    setAnalysis("");
    setCurrentAnalysisId(null); // Reset pour la prochaine analyse
  };

  const handleDeleteAnalysis = (index: number) => {
    setSavedAnalyses(savedAnalyses.filter((_, i) => i !== index));
  };

  const handleEditAnalysis = async (index: number) => {
    const saved = savedAnalyses[index];
    // Si on a les mots en clair, on cherche les uniqueId correspondants
    const wordIds = saved.selectedWords
      .map((word) => {
        const wordData = allWords.find((w) => w.cleanWord === word);
        return wordData?.uniqueId;
      })
      .filter(Boolean) as string[];
    setSelectedWordIds(new Set(wordIds));
    setAnalysis(saved.analysis);
    setEditingIndex(index);

    // Récupérer l'ID de l'analyse depuis la DB pour pouvoir l'update
    try {
      const incompletes = await getIncompleteAnalyses(userId, poem.id);
      if (incompletes[index]) {
        setCurrentAnalysisId(incompletes[index].$id);
      }
    } catch (error) {
      console.error("Error getting analysis ID:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !analysis.trim()) return;

    // Pour l'affichage local
    const selectedWordsDisplay = Array.from(selectedWordIds).map((id) => {
      const wordData = allWords.find((w) => w.uniqueId === id);
      return wordData?.cleanWord || "";
    });

    // Pour la DB on garde les uniqueId
    const selectedWordsIds = Array.from(selectedWordIds);

    const updatedAnalyses = [...savedAnalyses];
    updatedAnalyses[editingIndex] = {
      selectedWords: selectedWordsDisplay,
      analysis,
    };
    setSavedAnalyses(updatedAnalyses);

    try {
      setIsSaving(true);
      if (currentAnalysisId) {
        await updateAnalysis(currentAnalysisId, {
          selectedWords: selectedWordsIds,
          analysis,
        });
        console.log("✅ Analyse mise à jour:", currentAnalysisId);
      }
    } catch (error) {
      console.error("Error updating analysis:", error);
    } finally {
      setIsSaving(false);
    }

    setSelectedWordIds(new Set());
    setAnalysis("");
    setEditingIndex(null);
    setCurrentAnalysisId(null); // Reset après édition
  };

  const handleCancelEdit = () => {
    setSelectedWordIds(new Set());
    setAnalysis("");
    setEditingIndex(null);
  };

  const handleSubmitToAI = async () => {
    if (savedAnalyses.length === 0) return;

    try {
      setIsSaving(true);

      // Récupérer toutes les analyses incomplètes
      const incompletes = await getIncompleteAnalyses(userId, poem.id);

      // Supprimer toutes les analyses incomplètes de la DB
      // (elles vont être dans results maintenant)
      for (const incomplete of incompletes) {
        await deleteAnalysis(incomplete.$id);
        console.log("🗑️ Analyse supprimée de DB:", incomplete.$id);
      }

      const analysesToSubmit = savedAnalyses.map((sa) => ({
        selectedWords: sa.selectedWords.map((word) => {
          const wordData = allWords.find((w) => w.cleanWord === word);
          return wordData?.cleanWord || word;
        }),
        analysis: sa.analysis,
      }));

      if (onSubmit) {
        onSubmit(analysesToSubmit);
      }
    } catch (error) {
      console.error("Error submitting to AI:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStanza = (s: typeof stanza, displayNumber: number) => {
    const stanzaWords = allWords.filter(
      (w) => w.stanzaId === (isComplete ? displayNumber - 1 : stanzaIndex),
    );
    let wordCounter = 0;

    const isSelected = (uniqueId: string) => selectedWordIds.has(uniqueId);

    return (
      <div key={displayNumber} className="mb-8 select-none">
        <div className="text-xs text-muted-foreground mb-2 font-medium select-none">
          Strophe {displayNumber}
        </div>
        {s.lines.map((line, lineIdx) => {
          const words = line.split(/(\s+|[.,;:!?'"-]+)/);
          const lineWords: React.ReactNode[] = [];
          words.forEach((word, wordIdx) => {
            if (!word.trim()) {
              lineWords.push(
                <span key={`space-${lineIdx}-${wordIdx}`}>{word}</span>,
              );
              return;
            }

            const wordData = stanzaWords[wordCounter];
            wordCounter++;

            if (!wordData) return;

            lineWords.push(
              <button
                key={wordData.uniqueId}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleWordMouseDown(wordData.uniqueId);
                }}
                onMouseEnter={() => handleWordMouseEnter(wordData.uniqueId)}
                onMouseLeave={() => handleWordMouseLeave()}
                className={`inline-flex items-baseline px-0.5 -mx-0.5 rounded relative transition-all duration-150 cursor-pointer select-none ${getAnnotationStyle(wordData.uniqueId, isSelected(wordData.uniqueId))}`}
                onClick={(e) => {
                  if (e.detail === 2 && annotations.has(wordData.uniqueId)) {
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
                            <Eye className="w-3 h-3" />
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
              </button>,
            );
          });

          return (
            <div key={lineIdx} className="mb-2">
              {lineWords}
            </div>
          );
        })}
      </div>
    );
  };

  const canSave = analysis.trim().length > 0;
  const selectedWordsData = Array.from(selectedWordIds).map((id) =>
    allWords.find((w) => w.uniqueId === id),
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="border-b bg-card">
        <div className="max-w-[1920px] mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-7 gap-1.5 px-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-xs">Retour</span>
              </Button>
              <div className="h-5 w-px bg-border" />
              <div>
                <h1 className="poem-title text-sm font-semibold">
                  {poem.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isComplete
                    ? `${totalStanzas} strophes`
                    : `Strophe ${stanzaIndex + 1}/${totalStanzas}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sizes: ("small" | "medium" | "large")[] = [
                    "small",
                    "medium",
                    "large",
                  ];
                  const currentIndex = sizes.indexOf(textSize);
                  const nextIndex = (currentIndex + 1) % sizes.length;
                  setTextSize(sizes[nextIndex]);
                }}
                className="h-7 px-2 gap-1"
                title={`Taille: ${textSize === "small" ? "Petit" : textSize === "medium" ? "Moyen" : "Grand"}`}
              >
                <Type className="w-3.5 h-3.5" />
                <span
                  className={
                    textSize === "small"
                      ? "text-[10px]"
                      : textSize === "medium"
                        ? "text-xs"
                        : "text-sm"
                  }
                >
                  A
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="h-7 w-7 p-0"
              >
                {theme === "dark" ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Moon className="w-3.5 h-3.5" />
                )}
              </Button>
              {savedAnalyses.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReviewDialog(true)}
                  className="h-7 gap-1.5 px-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">
                    Revoir ({savedAnalyses.length})
                  </span>
                  <span className="sm:hidden text-xs">
                    {savedAnalyses.length}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto">
          <div className="hidden md:flex h-full">
            <div className="flex-1 border-r flex flex-col">
              {showToolbar && (
                <div className="border-b bg-muted/30 p-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button
                      variant={
                        annotationMode === "highlight" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => {
                        setAnnotationMode(
                          annotationMode === "highlight" ? null : "highlight",
                        );
                        setDrawingMode(false);
                        setEraserMode(false);
                      }}
                      className="h-8 gap-2"
                      title="Surligner"
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline text-xs">
                        Surligner
                      </span>
                      {annotationCounts.highlight > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 h-4 px-1 text-[10px]"
                        >
                          {annotationCounts.highlight}
                        </Badge>
                      )}
                    </Button>

                    <Button
                      variant={
                        annotationMode === "underline" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => {
                        setAnnotationMode(
                          annotationMode === "underline" ? null : "underline",
                        );
                        setDrawingMode(false);
                        setEraserMode(false);
                      }}
                      className="h-8 gap-2"
                      title="Souligner"
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

                    <Button
                      variant={drawingMode && !eraserMode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setDrawingMode(!drawingMode);
                        setAnnotationMode(null);
                        setEraserMode(false);
                      }}
                      className="h-8 gap-2"
                      title="Mode dessin"
                    >
                      <PencilLine className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline text-xs">Dessin</span>
                    </Button>

                    {drawingMode && (
                      <Button
                        variant={eraserMode ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEraserMode(!eraserMode)}
                        className="h-8 gap-2"
                        title="Gomme"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline text-xs">Gomme</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddStickyNote}
                      className="h-8 gap-2"
                      title="Ajouter un post-it"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline text-xs">Post-it</span>
                      {stickyNotes.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 h-4 px-1 text-[10px]"
                        >
                          {stickyNotes.length}
                        </Badge>
                      )}
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2"
                          title="Choisir la couleur"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <div
                            className="w-4 h-4 rounded border"
                            style={{
                              backgroundColor:
                                selectedColor === "yellow"
                                  ? "#fef08a"
                                  : selectedColor === "green"
                                    ? "#86efac"
                                    : selectedColor === "blue"
                                      ? "#93c5fd"
                                      : selectedColor === "pink"
                                        ? "#f9a8d4"
                                        : selectedColor === "orange"
                                          ? "#fdba74"
                                          : "#d8b4fe",
                            }}
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              "yellow",
                              "green",
                              "blue",
                              "pink",
                              "orange",
                              "purple",
                            ] as AnnotationColor[]
                          ).map((color) => (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={`w-8 h-8 rounded border-2 ${selectedColor === color ? "border-black dark:border-white" : "border-transparent"}`}
                              style={{
                                backgroundColor:
                                  color === "yellow"
                                    ? "#fef08a"
                                    : color === "green"
                                      ? "#86efac"
                                      : color === "blue"
                                        ? "#93c5fd"
                                        : color === "pink"
                                          ? "#f9a8d4"
                                          : color === "orange"
                                            ? "#fdba74"
                                            : "#d8b4fe",
                              }}
                              title={color}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {drawingMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDrawingStrokes([])}
                        className="h-8 text-xs gap-1"
                        title="Effacer tous les dessins"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Effacer tout</span>
                      </Button>
                    )}
                  </div>

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
                <div className="p-8 relative">
                  <div
                    className="max-w-3xl mx-auto relative"
                    ref={textContainerRef}
                  >
                    {drawingMode && (
                      <canvas
                        ref={canvasRef}
                        width={800}
                        height={1200}
                        className="absolute top-0 left-0 pointer-events-auto z-20"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        style={{
                          cursor: eraserMode
                            ? "pointer"
                            : drawingMode
                              ? "crosshair"
                              : "default",
                        }}
                      />
                    )}

                    {stickyNotes.map((note) => {
                      const isCollapsed = note.height < 100;
                      const isDragging = draggedNoteId === note.id;
                      return (
                        <div
                          key={note.id}
                          className={`absolute z-30 rounded-lg select-none ${
                            isDragging
                              ? "shadow-2xl scale-105 cursor-grabbing"
                              : "shadow-lg hover:shadow-xl transition-shadow duration-150"
                          }`}
                          style={{
                            left: note.x,
                            top: note.y,
                            width: note.width,
                            height: note.height,
                            backgroundColor:
                              note.color === "yellow"
                                ? "#fef08a"
                                : note.color === "green"
                                  ? "#86efac"
                                  : note.color === "blue"
                                    ? "#93c5fd"
                                    : note.color === "pink"
                                      ? "#f9a8d4"
                                      : note.color === "orange"
                                        ? "#fdba74"
                                        : "#d8b4fe",
                            border: isDragging
                              ? "2px solid rgba(0,0,0,0.3)"
                              : "1px solid rgba(0,0,0,0.1)",
                          }}
                        >
                          <div
                            className="flex items-center justify-between p-2 border-b border-black/10 bg-black/5 group cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                handleNoteDragStart(note.id, e);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <GripVertical className="w-3.5 h-3.5 text-black/40 group-hover:text-black/60" />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 gap-1 hover:bg-black/10 rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStickyNote(note.id, {
                                    height: isCollapsed ? 150 : 35,
                                  });
                                }}
                                title={isCollapsed ? "Déplier" : "Replier"}
                              >
                                {isCollapsed ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronUp className="w-3 h-3" />
                                )}
                                <span className="text-[10px] font-medium">
                                  {isCollapsed ? "Ouvrir" : "Fermer"}
                                </span>
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-red-500/20 hover:text-red-700 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStickyNote(note.id);
                              }}
                              title="Supprimer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          {!isCollapsed && (
                            <Textarea
                              value={note.content}
                              onChange={(e) =>
                                handleUpdateStickyNote(note.id, {
                                  content: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Écrivez votre note ici..."
                              className="w-full h-[calc(100%-37px)] bg-transparent border-none resize-none text-xs p-3 focus-visible:ring-0 placeholder:text-black/40"
                              style={{
                                fontFamily: "inherit",
                                lineHeight: "1.5",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}

                    <div
                      className={`poem-text leading-relaxed relative z-10 select-none ${textSize === "small" ? "text-[22px]" : textSize === "large" ? "text-[29px]" : "text-[26px]"}`}
                      style={{ pointerEvents: drawingMode ? "none" : "auto" }}
                    >
                      {stanzasToShow.map((s, idx) => renderStanza(s, idx + 1))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            <div
              className="w-1 bg-border hover:bg-primary cursor-col-resize relative group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div
              className="flex flex-col bg-muted/50 dark:bg-muted/20"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
                {!isGeneralAnalysis && selectedWordIds.size > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {selectedWordIds.size} mot
                        {selectedWordIds.size > 1 ? "s" : ""} sélectionné
                        {selectedWordIds.size > 1 ? "s" : ""}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="h-5 text-xs px-2"
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

                <div className="flex-1 flex flex-col min-h-0 gap-2">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <label className="text-xs font-medium text-muted-foreground">
                      {isGeneralAnalysis
                        ? "Analyse générale"
                        : "Analyse des mots sélectionnés"}
                    </label>
                    {editingIndex !== null && (
                      <Button
                        onClick={handleCancelEdit}
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={analysis}
                    onChange={(e) => setAnalysis(e.target.value)}
                    placeholder="Écrivez votre analyse ici..."
                    className="flex-1 w-full px-3 py-2 text-sm bg-muted/30 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-0"
                  />
                  <Button
                    onClick={
                      editingIndex !== null
                        ? handleSaveEdit
                        : handleSaveAnalysis
                    }
                    disabled={!canSave || isSaving}
                    size="sm"
                    className="w-full gap-2 flex-shrink-0"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editingIndex !== null
                      ? "Sauvegarder modification"
                      : "Enregistrer l'analyse"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vos analyses enregistrées</DialogTitle>
            <DialogDescription>
              Vérifiez et modifiez vos analyses avant de les soumettre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {savedAnalyses.map((saved, idx) => (
              <div key={idx} className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">
                      {saved.selectedWords.length > 0
                        ? saved.selectedWords.join(" • ")
                        : "Analyse générale"}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {saved.analysis}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleEditAnalysis(idx);
                        setShowReviewDialog(false);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAnalysis(idx)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              className="w-full sm:w-auto"
            >
              Fermer
            </Button>
            {savedAnalyses.length > 0 && (
              <Button
                onClick={() => {
                  handleSubmitToAI();
                  setShowReviewDialog(false);
                }}
                disabled={isLoading || isSaving}
                className="w-full sm:w-auto gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Envoyer à l'IA ({savedAnalyses.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprendre votre analyse ?</DialogTitle>
            <DialogDescription>
              Vous avez {incompleteAnalyses.length} analyse(s) en cours.
              Voulez-vous reprendre ou recommencer ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {incompleteAnalyses.length} analyse
              {incompleteAnalyses.length > 1 ? "s" : ""} en cours trouvée
              {incompleteAnalyses.length > 1 ? "s" : ""}
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleStartNew}
              className="flex-1"
            >
              Recommencer
            </Button>
            <Button onClick={handleResumeAnalysis} className="flex-1">
              <AlertCircle className="w-4 h-4 mr-2" />
              Reprendre ({incompleteAnalyses.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingNote && (
        <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingNote?.note ? "Modifier la note" : "Ajouter une note"}
              </DialogTitle>
              <DialogDescription>
                Note personnelle sur cette annotation (double-clic sur le mot)
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
