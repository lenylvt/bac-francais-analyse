import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertCircle,
  Home,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
} from "lucide-react";
import type { Poem, AIEvaluation, UserAnswer } from "@/types";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";

interface ResultsViewProps {
  poem: Poem;
  evaluations: AIEvaluation[];
  answers: UserAnswer[];
  averageScore: number;
  onRestart: () => void;
  onHome: () => void;
}

export default function ResultsView({
  poem,
  evaluations,
  answers,
  averageScore,
  onRestart,
  onHome,
}: ResultsViewProps) {
  const { theme, toggleTheme } = useTheme();
  const [expandedStanzas, setExpandedStanzas] = useState<number[]>([0]);

  const getScoreColor = (score: number) => {
    if (score >= 16) return "text-green-600";
    if (score >= 12) return "text-blue-600";
    if (score >= 10) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 16) return { label: "Excellent", variant: "default" as const };
    if (score >= 12) return { label: "Bien", variant: "secondary" as const };
    if (score >= 10) return { label: "Passable", variant: "outline" as const };
    return { label: "À améliorer", variant: "destructive" as const };
  };

  const toggleStanza = (index: number) => {
    setExpandedStanzas((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header compact sticky */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate">{poem.title}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {poem.author}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
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
              <div className="text-right">
                <div
                  className={`text-2xl font-bold ${getScoreColor(averageScore)}`}
                >
                  {averageScore.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">/ 20</div>
              </div>
              <Badge {...getScoreBadge(averageScore)} className="text-xs">
                {getScoreBadge(averageScore).label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-3">
          {evaluations.map((evaluation, index) => {
            const stanza = poem.stanzas.find(
              (s) => s.id === answers[index].stanzaId,
            );
            const analysis = poem.linearAnalysis?.find(
              (a) => a.stanzaId === answers[index].stanzaId,
            );
            const isExpanded = expandedStanzas.includes(index);

            return (
              <Card key={index} className="border shadow-sm">
                <CardHeader
                  className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleStanza(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-1">
                        Strophe {answers[index].stanzaId}
                      </CardTitle>
                      {stanza && (
                        <div className="text-xs text-muted-foreground italic line-clamp-1">
                          {stanza.lines[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-2xl font-bold ${getScoreColor(evaluation.score)}`}
                        >
                          {evaluation.score}
                        </div>
                        <div className="text-xs text-muted-foreground">/20</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <Separator />

                    {/* Feedback */}
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Feedback</h3>
                      <p className="text-sm leading-relaxed">
                        {evaluation.feedback}
                      </p>
                    </div>

                    {/* Points forts */}
                    {evaluation.strengths.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <h3 className="font-semibold text-sm">
                              Points forts
                            </h3>
                          </div>
                          <ul className="space-y-2">
                            {evaluation.strengths.map((strength, i) => (
                              <li
                                key={i}
                                className="text-sm flex items-start gap-2"
                              >
                                <span className="text-green-600 mt-0.5 shrink-0">
                                  •
                                </span>
                                <span className="flex-1">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Points à améliorer */}
                    {evaluation.missedPoints.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            <h3 className="font-semibold text-sm">
                              Points à améliorer
                            </h3>
                          </div>
                          <ul className="space-y-2">
                            {evaluation.missedPoints.map((point, i) => (
                              <li
                                key={i}
                                className="text-sm flex items-start gap-2"
                              >
                                <span className="text-orange-600 mt-0.5 shrink-0">
                                  •
                                </span>
                                <span className="flex-1">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Analyse de référence */}
                    {analysis && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold text-sm mb-2">
                            Analyse de référence
                          </h3>
                          <p className="text-sm leading-relaxed">
                            {analysis.analysis}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Footer fixe */}
      <div className="sticky bottom-0 z-10 bg-card border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
          <Button onClick={onHome} variant="outline" className="flex-1 h-11">
            <Home className="w-4 h-4 mr-2" />
            Accueil
          </Button>
          <Button onClick={onRestart} className="flex-1 h-11">
            <RotateCcw className="w-4 h-4 mr-2" />
            Recommencer
          </Button>
        </div>
      </div>
    </div>
  );
}
