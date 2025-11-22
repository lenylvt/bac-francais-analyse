import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { searchPoemInLinks, scrapePoemAndSave } from "@/lib/appwrite/firecrawl";
import commentairecomposeLinks from "@/data/commentairecompose.fr.2025-11-21T21_56_32.159Z.json";

interface CommunityRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPoemAdded: () => void;
}

export default function CommunityRequestDialog({
  open,
  onOpenChange,
  onPoemAdded,
}: CommunityRequestDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setSelectedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isMultiImporting, setIsMultiImporting] = useState(false);
  const [multiImportProgress, setMultiImportProgress] = useState({
    current: 0,
    total: 0,
    successCount: 0,
    failCount: 0,
  });

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchPoemInLinks(commentairecomposeLinks.links, searchQuery);
  }, [searchQuery]);

  const toggleUrlSelection = (url: string) => {
    const newSelection = new Set(selectedUrls);
    if (newSelection.has(url)) {
      newSelection.delete(url);
    } else {
      newSelection.add(url);
    }
    setSelectedUrls(newSelection);
  };

  const handleAddPoem = async (url: string) => {
    try {
      setIsLoading(true);
      setSelectedUrl(url);
      setError(null);

      setLoadingStep("🔍 Connexion au site...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      setLoadingStep("📄 Extraction du contenu...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      setLoadingStep("📝 Récupération de l'analyse...");
      await scrapePoemAndSave(url);

      setLoadingStep("✅ Poème ajouté avec succès !");
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Success
      onPoemAdded();
      onOpenChange(false);
      setSearchQuery("");
      setSelectedUrl(null);
      setLoadingStep("");
      setSelectedUrls(new Set());
    } catch (error: any) {
      const errorMsg = error.message || "Erreur inconnue";
      if (errorMsg.includes("408") || errorMsg.includes("timeout")) {
        setError(
          "⏱️ Délai d'attente dépassé. Le site met trop de temps à répondre. Réessayez.",
        );
      } else if (errorMsg.includes("404")) {
        setError("❌ Page non trouvée. Le lien est peut-être invalide.");
      } else if (errorMsg.includes("Données incomplètes")) {
        setError(
          "⚠️ Le poème n'a pas pu être extrait complètement. La page n'a peut-être pas d'analyse.",
        );
      } else {
        setError(`❌ ${errorMsg}`);
      }
    } finally {
      setIsLoading(false);
      setSelectedUrl(null);
      setLoadingStep("");
    }
  };

  const handleMultiImport = async () => {
    if (selectedUrls.size === 0) return;

    setIsMultiImporting(true);
    setError(null);
    setMultiImportProgress({
      current: 0,
      total: selectedUrls.size,
      successCount: 0,
      failCount: 0,
    });

    const urlsArray = Array.from(selectedUrls);

    for (let i = 0; i < urlsArray.length; i++) {
      const url = urlsArray[i];
      try {
        setLoadingStep(`📝 Import ${i + 1}/${urlsArray.length}...`);
        await scrapePoemAndSave(url);
        setMultiImportProgress((prev) => ({
          ...prev,
          current: i + 1,
          successCount: prev.successCount + 1,
        }));
      } catch {
        setMultiImportProgress((prev) => ({
          ...prev,
          current: i + 1,
          failCount: prev.failCount + 1,
        }));
      }
    }

    setLoadingStep("✅ Import terminé !");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onPoemAdded();
    onOpenChange(false);
    setSearchQuery("");
    setSelectedUrls(new Set());
    setIsMultiImporting(false);
    setLoadingStep("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Demande d'analyse communautaire
          </DialogTitle>
          <DialogDescription>
            Recherchez un poème depuis commentairecompose.fr et ajoutez-le à la
            base de données pour tous les utilisateurs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Multi-import Progress */}
          {isMultiImporting && (
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 rounded-lg p-8 shadow-lg">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-primary/30 animate-ping" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
                  <Loader2 className="relative w-16 h-16 text-primary animate-spin" />
                </div>
                <div className="text-center space-y-3">
                  <p className="font-bold text-xl text-primary">
                    {loadingStep}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {multiImportProgress.current}/{multiImportProgress.total}{" "}
                    poèmes traités
                  </p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-600">
                      ✓ {multiImportProgress.successCount} réussis
                    </span>
                    <span className="text-red-600">
                      ✗ {multiImportProgress.failCount} échoués
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && !isMultiImporting && (
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 rounded-lg p-8 shadow-lg">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-primary/30 animate-ping" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
                  <Loader2 className="relative w-16 h-16 text-primary animate-spin" />
                </div>
                <div className="text-center space-y-3">
                  <p className="font-bold text-xl text-primary">
                    {loadingStep}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Veuillez patienter pendant que nous récupérons et traitons
                    le contenu...
                  </p>
                  <div className="flex justify-center gap-1 pt-2">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !isLoading && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Search Input */}
          {!isLoading && !isMultiImporting && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un poème, auteur..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setError(null);
                  }}
                  className="pl-9"
                />
              </div>

              {/* Results Count & Multi-select Actions */}
              {searchQuery && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {searchResults.length} résultat(s) trouvé(s)
                  </div>
                  {selectedUrls.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {selectedUrls.size} sélectionné(s)
                      </Badge>
                      <Button
                        size="sm"
                        onClick={handleMultiImport}
                        className="h-7 gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Importer tout
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedUrls(new Set())}
                        className="h-7"
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Search Results */}
              <ScrollArea className="h-[400px] pr-4">
                {searchResults.length === 0 && searchQuery && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Aucun résultat trouvé
                    </p>
                  </div>
                )}

                {searchResults.length === 0 && !searchQuery && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Commencez à rechercher un poème
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Exemple: "baudelaire", "zone apollinaire"
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {searchResults.map((result, index) => {
                    // Extract slug from URL and format as title if no title available
                    const urlSlug =
                      new URL(result.url).pathname
                        .split("/")
                        .filter((p) => p)
                        .pop() || "";
                    const formattedTitle = urlSlug
                      .split("-")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1),
                      )
                      .join(" ");
                    const displayTitle = result.title || formattedTitle;

                    const isSelected = selectedUrls.has(result.url);

                    return (
                      <div
                        key={index}
                        className={`group relative border rounded-lg p-3 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer ${
                          isSelected ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => toggleUrlSelection(result.url)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {isSelected && (
                                <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                            <h3
                              className="font-medium text-sm truncate"
                              title={displayTitle}
                            >
                              {displayTitle.length > 60
                                ? displayTitle.substring(0, 60) + "..."
                                : displayTitle}
                            </h3>
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddPoem(result.url);
                            }}
                            className="shrink-0 h-8"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedUrls(new Set());
            }}
            disabled={isLoading || isMultiImporting}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
