import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, BookMarked, ArrowLeft, ChevronRight } from "lucide-react";
import type { Mode } from "@/types";
import { useState } from "react";

interface ModeSelectorProps {
  poemTitle: string;
  onSelect: (mode: Mode) => void;
  onBack: () => void;
}

export default function ModeSelector({
  poemTitle,
  onSelect,
  onBack,
}: ModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

  const handleModeClick = (mode: Mode) => {
    setSelectedMode(mode);
  };

  const handleStart = () => {
    if (selectedMode) {
      onSelect(selectedMode);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="-ml-2 mb-3 touch-manipulation min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl font-bold leading-tight">{poemTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choisissez votre mode d'entraînement
          </p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        <Card
          className={`cursor-pointer active:scale-[0.98] transition-all border-2 ${
            selectedMode === "complete"
              ? "border-foreground shadow-lg"
              : "border-border"
          }`}
          onClick={() => handleModeClick("complete")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2.5 rounded-lg bg-foreground text-background shrink-0">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2 mb-1">
                    Mode Complet
                    <Badge variant="secondary" className="text-xs">
                      Recommandé
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Analyse approfondie de toutes les strophes
                  </p>
                </div>
              </div>
              {selectedMode === "complete" && (
                <ChevronRight className="w-5 h-5 shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li>• Toutes les strophes</li>
              <li>• Analyse détaillée</li>
              <li>• Préparation optimale</li>
            </ul>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer active:scale-[0.98] transition-all border-2 ${
            selectedMode === "quick"
              ? "border-foreground shadow-lg"
              : "border-border"
          }`}
          onClick={() => handleModeClick("quick")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2.5 rounded-lg bg-secondary text-secondary-foreground shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">Mode Rapide</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Révision express avec strophes aléatoires
                  </p>
                </div>
              </div>
              {selectedMode === "quick" && (
                <ChevronRight className="w-5 h-5 shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li>• Strophes aléatoires</li>
              <li>• Révision rapide</li>
              <li>• Dernière ligne droite</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 bg-background border-t p-4">
        <Button
          className="w-full min-h-[52px] text-base touch-manipulation"
          size="lg"
          onClick={handleStart}
          disabled={!selectedMode}
        >
          {selectedMode ? "Démarrer" : "Sélectionnez un mode"}
        </Button>
      </div>
    </div>
  );
}
