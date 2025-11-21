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
  Star,
  TrendingUp,
  Award,
  Target,
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
  const [expandedStanzas, setExpandedStanzas] = useState<number[]>([0]);

  const getScoreColor = (score: number) => {
    if (score >= 16) return "text-green-600 dark:text-green-400";
    if (score >= 12) return "text-blue-600 dark:text-blue-400";
    if (score >= 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 16) return "bg-green-50 border-green-200";
    if (score >= 12) return "bg-blue-50 border-blue-200";
    if (score >= 10) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 16)
      return {
        label: "Excellent",
        variant: "default" as const,
        icon: Award,
        color: "text-green-600",
      };
    if (score >= 12)
      return {
        label: "Bien",
        variant: "secondary" as const,
        icon: Star,
        color: "text-blue-600",
      };
    if (score >= 10)
      return {
        label: "Passable",
        variant: "outline" as const,
        icon: Target,
        color: "text-yellow-600",
      };
    return {
      label: "À améliorer",
      variant: "destructive" as const,
      icon: TrendingUp,
      color: "text-red-600",
    };
  };

  const toggleStanza = (index: number) => {
    setExpandedStanzas((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const badge = getScoreBadge(averageScore);
  const BadgeIcon = badge.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-down {
          animation: slideDown 0.5s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.6s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>

      {/* Header avec score principal */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b shadow-sm">
        <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
          <div className="text-center animate-slide-down">
            {/* Trophy Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 mb-4 shadow-xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white relative z-10" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Résultats d'analyse
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mb-1">
              {poem.title}
            </p>
            <p className="text-xs text-muted-foreground italic">
              {poem.author}
            </p>
          </div>

          {/* Score card */}
          <div
            className={`mt-6 p-5 md:p-6 rounded-2xl border-2 shadow-lg animate-scale-in ${getScoreBgColor(averageScore)}`}
          >
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
              <div
                className={`text-5xl md:text-6xl font-bold ${getScoreColor(averageScore)}`}
              >
                {averageScore.toFixed(1)}
              </div>
              <div className="text-center md:text-left">
                <div className="text-lg text-muted-foreground mb-1">/ 20</div>
                <Badge
                  variant={badge.variant}
                  className="text-sm px-3 py-1 gap-1.5"
                >
                  <BadgeIcon className="w-4 h-4" />
                  {badge.label}
                </Badge>
              </div>
            </div>
            <Progress
              value={(averageScore / 20) * 100}
              className="h-3 shadow-inner"
            />
            <div className="mt-3 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {evaluations.length}{" "}
                {evaluations.length > 1
                  ? "strophes analysées"
                  : "strophe analysée"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-4xl mx-auto w-full">
        <div className="space-y-4 animate-fade-in">
          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="bg-white rounded-xl p-3 border shadow-sm text-center">
              <div className="text-2xl font-bold text-green-600">
                {evaluations.filter((e) => e.strengths.length > 0).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Points forts
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border shadow-sm text-center">
              <div className="text-2xl font-bold text-orange-600">
                {evaluations.filter((e) => e.missedPoints.length > 0).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                À améliorer
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border shadow-sm text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(
                  evaluations.reduce((sum, e) => sum + e.strengths.length, 0) /
                    evaluations.length,
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Moy. forces
              </div>
            </div>
          </div>

          {/* Liste des évaluations */}
          {evaluations.map((evaluation, index) => {
            const stanza = poem.stanzas.find(
              (s) => s.id === answers[index].stanzaId,
            );
            const analysis = poem.linearAnalysis?.find(
              (a) => a.stanzaId === answers[index].stanzaId,
            );
            const isExpanded = expandedStanzas.includes(index);

            return (
              <Card
                key={index}
                className="overflow-hidden border-2 shadow-md hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader
                  className="pb-3 cursor-pointer active:bg-muted/50 transition-colors"
                  onClick={() => toggleStanza(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg mb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {answers[index].stanzaId}
                        </div>
                        Strophe {answers[index].stanzaId}
                      </CardTitle>
                      {stanza && (
                        <div className="text-xs md:text-sm text-muted-foreground italic line-clamp-2 leading-relaxed pl-10">
                          {stanza.lines.slice(0, 2).join(" / ")}
                          {stanza.lines.length > 2 && "..."}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className={`text-right px-3 py-2 rounded-xl ${getScoreBgColor(evaluation.score)}`}
                      >
                        <div
                          className={`text-2xl md:text-3xl font-bold ${getScoreColor(evaluation.score)}`}
                        >
                          {evaluation.score}
                        </div>
                        <div className="text-xs text-muted-foreground">/20</div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <Separator />

                    {/* Feedback général */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                          <Star className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-2 text-blue-900">
                            Commentaire général
                          </h3>
                          <p className="text-sm leading-relaxed text-blue-800">
                            {evaluation.feedback}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Points forts */}
                    {evaluation.strengths.length > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="font-semibold text-sm text-green-900">
                            Points forts ({evaluation.strengths.length})
                          </h3>
                        </div>
                        <ul className="space-y-2.5">
                          {evaluation.strengths.map((strength, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-3 bg-white/60 rounded-lg p-3 border border-green-100"
                            >
                              <span className="text-green-600 mt-0.5 shrink-0 text-lg">
                                ✓
                              </span>
                              <span className="flex-1 text-green-900">
                                {strength}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Points à améliorer */}
                    {evaluation.missedPoints.length > 0 && (
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="font-semibold text-sm text-orange-900">
                            Points à améliorer ({evaluation.missedPoints.length}
                            )
                          </h3>
                        </div>
                        <ul className="space-y-2.5">
                          {evaluation.missedPoints.map((point, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-3 bg-white/60 rounded-lg p-3 border border-orange-100"
                            >
                              <span className="text-orange-600 mt-0.5 shrink-0 text-lg">
                                •
                              </span>
                              <span className="flex-1 text-orange-900">
                                {point}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Analyse de référence */}
                    {analysis && (
                      <>
                        <Separator />
                        <div className="bg-slate-50 border rounded-xl p-4">
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-600 flex items-center justify-center">
                              <span className="text-white text-xs">📖</span>
                            </div>
                            Analyse de référence
                          </h3>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {analysis.analysis}
                          </p>
                          {analysis.keywords &&
                            analysis.keywords.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="text-xs font-medium text-slate-600 mb-2">
                                  Mots-clés importants :
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {analysis.keywords.map((kw, i) => (
                                    <Badge
                                      key={i}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {kw.word}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
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

      {/* Footer fixe avec actions */}
      <div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur-md border-t shadow-lg">
        <div className="p-4 max-w-4xl mx-auto w-full">
          <div className="flex gap-3">
            <Button
              onClick={onHome}
              variant="outline"
              className="flex-1 h-12 md:h-14 touch-manipulation text-base border-2 hover:bg-muted/50"
            >
              <Home className="w-5 h-5 mr-2" />
              Accueil
            </Button>
            <Button
              onClick={onRestart}
              className="flex-1 h-12 md:h-14 touch-manipulation text-base bg-gradient-to-r from-black via-gray-900 to-gray-800 hover:from-gray-900 hover:via-gray-800 hover:to-black shadow-lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Recommencer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
