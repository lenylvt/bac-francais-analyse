import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  BookOpen,
  User,
  LogOut,
  Sparkles,
  ChevronRight,
  Clock,
  Search,
  X,
  BarChart3,
  Moon,
  Sun,
  FileText,
  Smartphone,
} from "lucide-react";
import { logout, getCurrentUser } from "@/lib/appwrite/auth";
import { getUserStats, getIncompleteAnalyses } from "@/lib/appwrite/database";
import { getAllPoemsProgressive, type PoemDocument } from "@/lib/appwrite/poems";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface PoemSelectorProps {
  onSelect: (poemId: string) => void;
  onProgress: () => void;
}

export default function PoemSelector({
  onSelect,
  onProgress,
}: PoemSelectorProps) {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    completedAnalyses: 0,
    averageScore: 0,
  });
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPoemsLoading, setIsPoemsLoading] = useState(true);
  const [incompletePoems, setIncompletePoems] = useState<Set<string>>(
    new Set(),
  );
  const [dbPoems, setDbPoems] = useState<PoemDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<{
    title: string;
    analysis: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Recharger les analyses incomplètes à chaque montage du composant
  useEffect(() => {
    const reloadIncomplete = async () => {
      const user = await getCurrentUser();
      if (user && dbPoems.length > 0) {
        const incomplete = new Set<string>();
        for (const poem of dbPoems) {
          const analyses = await getIncompleteAnalyses(user.$id, poem.$id);
          if (analyses.length > 0) {
            incomplete.add(poem.$id);
          }
        }
        setIncompletePoems(incomplete);
        console.log("🔄 Analyses incomplètes rechargées:", incomplete.size);
      }
    };

    if (dbPoems.length > 0) {
      reloadIncomplete();
    }
  }, [dbPoems.length]);

  const loadData = async () => {
    // Load poems first
    await loadPoemsFromDB();
    // Then load user data with incomplete check
    await loadUserData();
  };

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserEmail(user.email);
        const userStats = await getUserStats(user.$id);
        setStats(userStats);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPoemsFromDB = async () => {
    try {
      setIsPoemsLoading(true);
      setDbPoems([]); // Reset poems

      const loadedPoems: PoemDocument[] = [];

      // Load poems progressively and display them as they arrive (sorted)
      await getAllPoemsProgressive((poem) => {
        loadedPoems.push(poem);
        // Sort and update display after each poem is added
        const sorted = [...loadedPoems].sort((a, b) => a.title.localeCompare(b.title));
        setDbPoems(sorted);
      });

      setIsPoemsLoading(false);

      // Check for incomplete analyses after poems are loaded
      const user = await getCurrentUser();
      if (user && loadedPoems.length > 0) {
        const incomplete = new Set<string>();
        for (const poem of loadedPoems) {
          const analyses = await getIncompleteAnalyses(user.$id, poem.$id);
          if (analyses.length > 0) {
            incomplete.add(poem.$id);
          }
        }
        setIncompletePoems(incomplete);
        console.log("📊 Poèmes avec analyses incomplètes:", incomplete.size);
      }
    } catch (error) {
      console.error("Error loading poems from DB:", error);
      setIsPoemsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b bg-card shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold">BAC Français</h1>
              <p className="text-[10px] text-muted-foreground">
                Analyse linéaire interactive
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats inline */}
            {!isLoading && stats.completedAnalyses > 0 && (
              <div className="hidden md:flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Analyses:</span>
                  <span className="font-semibold">
                    {stats.completedAnalyses}
                  </span>
                </div>
                {stats.averageScore > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Moyenne:</span>
                    <span className="font-semibold">
                      {stats.averageScore}/20
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="h-4 w-px bg-border hidden md:block" />
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
            <Button
              variant="ghost"
              size="sm"
              onClick={onProgress}
              className="gap-2 h-8 text-xs"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Suivi</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 h-8 text-xs">
              <User className="w-3.5 h-3.5" />
              <span className="hidden md:inline max-w-[150px] truncate">
                {userEmail}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
          {/* Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Poèmes</h2>
            <p className="text-sm text-muted-foreground">
              Sélectionnez un poème pour commencer votre analyse
            </p>
          </div>

          {/* Search & Filters */}
          <div className="mb-6 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un poème..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter by Author */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedAuthor === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAuthor(null)}
              >
                Tous les auteurs
              </Button>
              {Array.from(new Set(dbPoems.map((p) => p.author))).map(
                (author) => (
                  <Button
                    key={author}
                    variant={selectedAuthor === author ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAuthor(author)}
                  >
                    {author}
                  </Button>
                ),
              )}
            </div>
          </div>

          {/* DB Poems Section */}
          <div className="space-y-3">
            {dbPoems
              .filter((poem) => {
                // Filter by search query
                const matchesSearch =
                  searchQuery === "" ||
                  poem.title
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  poem.author
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  poem.fullText
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());

                // Filter by author
                const matchesAuthor =
                  selectedAuthor === null || poem.author === selectedAuthor;

                return matchesSearch && matchesAuthor;
              })
              .map((dbPoem) => {
                const hasIncomplete = incompletePoems.has(dbPoem.$id);
                return (
                  <Card
                    key={dbPoem.$id}
                    className={`group border-2 hover:border-primary hover:shadow-md transition-all duration-200 ${
                      hasIncomplete
                        ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10"
                        : ""
                    }`}
                  >
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => !isMobile && onSelect(dbPoem.$id)}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="poem-title text-lg font-bold transition-colors">
                                  {dbPoem.title}
                                </h3>
                                {hasIncomplete && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1"
                                  >
                                    <Clock className="w-3 h-3" />
                                    En cours
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5" />
                                  {dbPoem.author}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {dbPoem.analyses && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAnalysis({
                                    title: dbPoem.title,
                                    analysis: dbPoem.analyses || "",
                                  });
                                }}
                                className="flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                Lire l'analyse
                              </Button>
                            )}
                            {isMobile && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1 text-xs"
                              >
                                <Smartphone className="w-3 h-3" />
                                Analyses disponibles sur PC uniquement
                              </Badge>
                            )}
                          </div>
                        </div>

                        {!isMobile && (
                          <div
                            className="flex-shrink-0 cursor-pointer"
                            onClick={() => onSelect(dbPoem.$id)}
                          >
                            <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

            {/* Loading state */}
            {isPoemsLoading && (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des poèmes...</p>
              </div>
            )}

            {/* No results message */}
            {!isPoemsLoading && dbPoems.filter((poem) => {
              const matchesSearch =
                searchQuery === "" ||
                poem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                poem.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                poem.fullText.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesAuthor =
                selectedAuthor === null || poem.author === selectedAuthor;
              return matchesSearch && matchesAuthor;
            }).length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun poème trouvé</p>
                {(searchQuery || selectedAuthor) && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedAuthor(null);
                    }}
                    className="mt-2"
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      <Dialog
        open={!!selectedAnalysis}
        onOpenChange={() => setSelectedAnalysis(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold poem-title">
              {selectedAnalysis?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-120px)]">
            <div className="p-6 pt-4">
              <div className="prose prose-base dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    h1: ({ ...props }) => (
                      <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />
                    ),
                    h2: ({ ...props }) => (
                      <h2
                        className="text-xl font-semibold mt-5 mb-3"
                        {...props}
                      />
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="text-lg font-semibold mt-4 mb-2"
                        {...props}
                      />
                    ),
                    p: ({ ...props }) => (
                      <p className="mb-4 leading-relaxed" {...props} />
                    ),
                    ul: ({ ...props }) => (
                      <ul
                        className="list-disc pl-6 mb-4 space-y-2"
                        {...props}
                      />
                    ),
                    ol: ({ ...props }) => (
                      <ol
                        className="list-decimal pl-6 mb-4 space-y-2"
                        {...props}
                      />
                    ),
                    li: ({ ...props }) => (
                      <li className="leading-relaxed" {...props} />
                    ),
                    blockquote: ({ ...props }) => (
                      <blockquote
                        className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
                        {...props}
                      />
                    ),
                    strong: ({ ...props }) => (
                      <strong
                        className="font-semibold text-foreground"
                        {...props}
                      />
                    ),
                    em: ({ ...props }) => <em className="italic" {...props} />,
                    code: ({ ...props }) => (
                      <code
                        className="bg-muted px-1.5 py-0.5 rounded text-sm"
                        {...props}
                      />
                    ),
                  }}
                >
                  {selectedAnalysis?.analysis.replace(/\\n/g, "\n") || ""}
                </ReactMarkdown>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
