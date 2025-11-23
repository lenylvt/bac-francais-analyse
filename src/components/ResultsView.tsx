import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Home,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import type { Poem, AIEvaluation, UserAnswer } from "@/types";

interface ResultsViewProps {
  poem: Poem;
  evaluations: AIEvaluation[];
  answers: UserAnswer[];
  averageScore: number;
  onHome: () => void;
  skipIntro?: boolean;
}

export default function ResultsView({
  poem,
  evaluations,
  answers,
  averageScore,
  onHome,
  skipIntro = false,
}: ResultsViewProps) {
  const [expandedAnalysis, setExpandedAnalysis] = useState<number | null>(null);
  const [animationStage, setAnimationStage] = useState(
    skipIntro ? "done" : "intro",
  );
  const [showTitle, setShowTitle] = useState(skipIntro);
  const [showScoreLoading, setShowScoreLoading] = useState(false);
  const [showScore, setShowScore] = useState(skipIntro);
  const [showFeedback, setShowFeedback] = useState(skipIntro);
  const [showButton, setShowButton] = useState(skipIntro);

  useEffect(() => {
    if (skipIntro) return;

    const introTimer = setTimeout(() => {
      setShowTitle(true);
    }, 2000);

    const scoreLoadingTimer = setTimeout(() => {
      setShowScoreLoading(true);
    }, 5000);

    const scoreTimer = setTimeout(() => {
      setShowScore(true);
    }, 9000);

    const feedbackTimer = setTimeout(() => {
      setShowFeedback(true);
    }, 10000);

    const buttonTimer = setTimeout(() => {
      setShowButton(true);
    }, 18000);

    return () => {
      clearTimeout(introTimer);
      clearTimeout(scoreLoadingTimer);
      clearTimeout(scoreTimer);
      clearTimeout(feedbackTimer);
      clearTimeout(buttonTimer);
    };
  }, [skipIntro]);

  const handleReveal = () => {
    setAnimationStage("animating");
    setTimeout(() => {
      setAnimationStage("done");
    }, 500);
  };

  const getStatusColor = (score: number) => {
    if (score >= 16)
      return {
        bg: "bg-green-50 dark:bg-green-950",
        text: "text-green-900 dark:text-green-100",
        border: "border-green-200 dark:border-green-800",
      };
    if (score >= 12)
      return {
        bg: "bg-blue-50 dark:bg-blue-950",
        text: "text-blue-900 dark:text-blue-100",
        border: "border-blue-200 dark:border-blue-800",
      };
    if (score >= 10)
      return {
        bg: "bg-orange-50 dark:bg-orange-950",
        text: "text-orange-900 dark:text-orange-100",
        border: "border-orange-200 dark:border-orange-800",
      };
    return {
      bg: "bg-red-50 dark:bg-red-950",
      text: "text-red-900 dark:text-red-100",
      border: "border-red-200 dark:border-red-800",
    };
  };

  const getStatusLabel = (score: number) => {
    if (score >= 16) return "Ray t'es la c't'année !";
    if (score >= 12) return "Pas mal";
    if (score >= 10) return "Pas ouf";
    return "Avec tout le respect, c'est guez.";
  };

  const statusColors = getStatusColor(averageScore);
  const globalFeedback = evaluations[0]?.analysis || "";

  return (
    <div className="min-h-screen bg-background relative">
      <style>{`
        @keyframes fadeInUp {
          0% {
            transform: translateY(30px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .sparkle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: linear-gradient(45deg, #fbbf24, #f59e0b);
          border-radius: 50%;
          animation: sparkle 1.5s ease-in-out infinite;
        }

        .sparkle:nth-child(1) { top: 20%; left: 30%; animation-delay: 0s; }
        .sparkle:nth-child(2) { top: 40%; left: 70%; animation-delay: 0.3s; }
        .sparkle:nth-child(3) { top: 60%; left: 20%; animation-delay: 0.6s; }
        .sparkle:nth-child(4) { top: 80%; left: 60%; animation-delay: 0.9s; }
        .sparkle:nth-child(5) { top: 30%; left: 80%; animation-delay: 1.2s; }
        .sparkle:nth-child(6) { top: 70%; left: 40%; animation-delay: 0.4s; }
        .sparkle:nth-child(7) { top: 50%; left: 50%; animation-delay: 0.7s; }
        .sparkle:nth-child(8) { top: 10%; left: 50%; animation-delay: 1s; }

        .content-appear {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }

        .scale-in {
          animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }

        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }

        .fullscreen-overlay {
          transition: opacity 0.5s ease-out;
        }

        .fullscreen-overlay.hiding {
          opacity: 0;
          pointer-events: none;
        }
      `}</style>

      {/* Fullscreen Intro */}
      {animationStage !== "done" && (
        <div
          className={`fullscreen-overlay fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 ${animationStage === "animating" ? "hiding" : ""}`}
        >
          <div className="max-w-4xl w-full space-y-6">
            {/* Titre et Auteur */}
            <div
              className={`text-center space-y-2 transition-all duration-1000 ease-out ${showTitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${showScore ? "-translate-y-12" : ""}`}
            >
              <h1 className="poem-title text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
                {poem.title}
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400">
                {poem.author}
              </p>
            </div>

            {/* Loading Score avec étincelles */}
            {showScoreLoading && !showScore && (
              <div className="text-center space-y-4 fade-in relative transition-all duration-700 py-8">
                <div className="text-8xl font-bold text-gray-300 dark:text-gray-700 pulse-animation">
                  ?
                </div>
                {/* Étincelles autour */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="sparkle"></div>
                  <div className="sparkle"></div>
                  <div className="sparkle"></div>
                  <div className="sparkle"></div>
                  <div className="sparkle"></div>
                  <div className="sparkle"></div>
                  <div className="sparkle"></div>
                  <div className="sparkle"></div>
                </div>
              </div>
            )}

            {/* Note réelle */}
            {showScore && (
              <>
                <div className="text-center space-y-4 scale-in transition-all duration-700 py-4">
                  <div className="text-7xl md:text-8xl font-bold text-gray-900 dark:text-gray-100">
                    {averageScore.toFixed(1)}
                    <span className="text-5xl md:text-6xl text-gray-400 dark:text-gray-600">
                      /20
                    </span>
                  </div>
                  <span
                    className={`inline-block px-5 py-2 rounded-full text-lg font-medium ${statusColors.bg} ${statusColors.text} border-2 ${statusColors.border}`}
                  >
                    {getStatusLabel(averageScore)}
                  </span>
                </div>

                {/* Feedback Global avec TextGenerateEffect */}
                {showFeedback && (
                  <div className="bg-card border-2 rounded-2xl p-6 fade-in transition-all duration-700">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">
                      Feedback global
                    </h2>
                    <TextGenerateEffect
                      words={globalFeedback}
                      className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-normal"
                      duration={1.5}
                      filter={true}
                    />
                  </div>
                )}
              </>
            )}

            {/* Bouton Voir les détails */}
            {showButton && (
              <div className="flex justify-center pt-2 scale-in transition-all duration-700">
                <button
                  onClick={handleReveal}
                  className="px-10 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-base font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg hover:shadow-xl"
                >
                  Voir les détails
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header Final */}
      <div
        className={`bg-card border-b sticky top-0 z-10 transition-opacity duration-500 shadow-sm ${animationStage === "done" ? "opacity-100" : "opacity-0"}`}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={onHome}
                className="px-5 py-2.5 flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all hover:scale-105 shadow-md text-sm"
              >
                <Home size={18} />
                <span>Accueil</span>
              </button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-8"></div>
              <div className="flex-1">
                <h1 className="poem-title text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">
                  {poem.title}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {poem.author}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {averageScore.toFixed(1)}
                  <span className="text-lg text-gray-400 dark:text-gray-600">
                    /20
                  </span>
                </div>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text} border ${statusColors.border} mt-1`}
                >
                  {getStatusLabel(averageScore)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`max-w-4xl mx-auto px-4 py-6 space-y-4 transition-opacity duration-500 ${animationStage === "done" ? "opacity-100" : "opacity-0"}`}
      >
        {/* Global Feedback */}
        <div
          className={`bg-card border rounded-lg p-4 ${animationStage === "done" ? "content-appear" : ""}`}
        >
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">
            Feedback global
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {globalFeedback}
          </p>
        </div>

        {/* Analyses Count */}
        <div
          className={`flex items-center gap-2 px-1 ${animationStage === "done" ? "content-appear delay-100" : ""}`}
        >
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {evaluations.length} analyse{evaluations.length > 1 ? "s" : ""}{" "}
            évaluée{evaluations.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Analyses List */}
        <div className="space-y-3">
          {evaluations.map((evaluation, idx) => {
            const answer = answers[idx];
            const isExpanded = expandedAnalysis === idx;

            return (
              <div
                key={idx}
                className={`bg-card border rounded-lg overflow-hidden ${animationStage === "done" ? `content-appear delay-${200 + idx * 100}` : ""}`}
              >
                {/* Analysis Header */}
                <button
                  onClick={() => setExpandedAnalysis(isExpanded ? null : idx)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {idx + 1}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {answer.selectedWords.length === 0 ? (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 rounded">
                          Analyse générale
                        </span>
                      ) : (
                        answer.selectedWords.map((word, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
                          >
                            {word}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {evaluation.score}
                      <span className="text-base text-gray-400 dark:text-gray-600">
                        /20
                      </span>
                    </span>
                    {isExpanded ? (
                      <ChevronDown
                        className="text-gray-400 dark:text-gray-500"
                        size={20}
                      />
                    ) : (
                      <ChevronRight
                        className="text-gray-400 dark:text-gray-500"
                        size={20}
                      />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4 bg-muted/30">
                    {/* Student Analysis */}
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        Ton analyse
                      </h3>
                      <div className="bg-card border rounded-lg p-3">
                        <p className="text-gray-700 dark:text-gray-300">
                          {answer.analysis}
                        </p>
                      </div>
                    </div>

                    {/* Teacher Feedback */}
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        Feedback du professeur
                      </h3>
                      <div
                        className={`${statusColors.bg} border ${statusColors.border} rounded-lg p-3`}
                      >
                        <p className={`${statusColors.text} leading-relaxed`}>
                          {evaluation.feedback}
                        </p>
                      </div>
                    </div>

                    {/* Points forts */}
                    {evaluation.strengths.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                          <CheckCircle2
                            size={16}
                            className="text-green-600 dark:text-green-400"
                          />
                          Points forts
                        </h3>
                        <div className="bg-card border rounded-lg p-3">
                          <ul className="space-y-2">
                            {evaluation.strengths.map((strength, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                              >
                                <CheckCircle2
                                  size={16}
                                  className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0"
                                />
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Improvements */}
                    {evaluation.missedPoints.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                          <AlertCircle
                            size={16}
                            className="text-orange-600 dark:text-orange-400"
                          />
                          Points à améliorer
                        </h3>
                        <div className="bg-card border rounded-lg p-3">
                          <ul className="space-y-2">
                            {evaluation.missedPoints.map((improvement, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                              >
                                <AlertCircle
                                  size={16}
                                  className="text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0"
                                />
                                <span>{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
