import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Home,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Poem, AIEvaluation, UserAnswer } from "@/types";
import { useState } from "react";

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
  const [expandedStanzas, setExpandedStanzas] = useState<number[]>([]);

  const getScoreColor = (score: number) => {
    if (score >= 16) return "text-green-600 dark:text-green-400";
    if (score >= 12) return "text-blue-600 dark:text-blue-400";
    if (score >= 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
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
      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 md:p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Résultats</h1>
            <p className="text-sm text-muted-foreground">{poem.title}</p>
          </div>

          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div
                className={`text-4xl md:text-5xl font-bold ${getScoreColor(averageScore)}`}
              >
                {averageScore.toFixed(1)}
              </div>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">/ 20</div>
                <Badge {...getScoreBadge(averageScore)} className="text-xs">
                  {getScoreBadge(averageScore).label}
                </Badge>
              </div>
            </div>
            <Progress value={(averageScore / 20) * 100} className="h-2" />
          </div>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
        {evaluations.map((evaluation, index) => {
          const stanza = poem.stanzas.find(
            (s) => s.id === answers[index].stanzaId,
          );
          const analysis = poem.linearAnalysis.find(
            (a) => a.stanzaId === answers[index].stanzaId,
          );
          const isExpanded = expandedStanzas.includes(index);

          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader
                className="pb-3 cursor-pointer active:bg-muted/50 transition-colors"
                onClick={() => toggleStanza(index)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base mb-1">
                      Strophe {answers[index].stanzaId}
                    </CardTitle>
                    {stanza && (
                      <div className="text-xs text-muted-foreground italic truncate">
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
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h3 className="font-semibold text-sm">Feedback</h3>
                    </div>
                    <p className="text-sm leading-relaxed pl-3">
                      {evaluation.feedback}
                    </p>
                  </div>

                  {/* Points forts */}
                  {evaluation.strengths.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <h3 className="font-semibold text-sm">
                            Points forts
                          </h3>
                        </div>
                        <ul className="space-y-2 pl-3">
                          {evaluation.strengths.map((strength, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                            >
                              <span className="text-green-600 dark:text-green-400 mt-0.5 shrink-0">
                                ✓
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
                          <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <h3 className="font-semibold text-sm">
                            Points à améliorer
                          </h3>
                        </div>
                        <ul className="space-y-2 pl-3">
                          {evaluation.missedPoints.map((point, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                            >
                              <span className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0">
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
                        <p className="text-sm text-muted-foreground leading-relaxed">
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

      {/* Footer fixe */}
      <div className="sticky bottom-0 z-10 bg-background border-t p-4">
        <div className="flex gap-3">
          <Button
            onClick={onHome}
            variant="outline"
            className="flex-1 min-h-[48px] touch-manipulation"
          >
            <Home className="w-4 h-4 mr-2" />
            Accueil
          </Button>
          <Button
            onClick={onRestart}
            className="flex-1 min-h-[48px] touch-manipulation"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Recommencer
          </Button>
        </div>
      </div>
    </div>
  );
}
