import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getUserResults,
  getUserResultsStats,
  deleteResult,
  type ResultDocument,
} from "@/lib/appwrite/results";
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  Calendar,
  BookOpen,
  Trash2,
  Eye,
  BarChart3,
  Target,
  Award,
  Moon,
  Sun,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTheme } from "@/hooks/useTheme";

interface ProgressProps {
  userId: string;
  onBack: () => void;
  onViewResult: (result: ResultDocument) => void;
}

export default function Progress({
  userId,
  onBack,
  onViewResult,
}: ProgressProps) {
  const { theme, toggleTheme } = useTheme();
  const [results, setResults] = useState<ResultDocument[]>([]);
  const [stats, setStats] = useState({
    totalTests: 0,
    averageScore: 0,
    bestScore: 0,
    recentTests: 0,
    poemsTested: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resultsData, statsData] = await Promise.all([
        getUserResults(userId),
        getUserResultsStats(userId),
      ]);
      setResults(resultsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resultId: string) => {
    if (!confirm("Supprimer ce résultat ?")) return;

    try {
      setDeletingId(resultId);
      await deleteResult(resultId);
      await loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary mb-3">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Suivi de progression</h1>
            <p className="text-sm text-muted-foreground">
              Vos résultats et statistiques
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border shadow-sm">
            <CardContent className="pt-6 pb-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{stats.totalTests}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Tests réalisés
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="pt-6 pb-4 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats.averageScore}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Moyenne / 20
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="pt-6 pb-4 text-center">
              <Award className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats.bestScore}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Meilleur score
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="pt-6 pb-4 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats.poemsTested}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Poèmes testés
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        {stats.recentTests > 0 && (
          <Card className="border shadow-sm bg-muted/30">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">{stats.recentTests}</span>
                <span className="text-muted-foreground">
                  test{stats.recentTests > 1 ? "s" : ""} cette semaine
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results List */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historique des tests
          </h2>

          {results.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun test réalisé pour le moment</p>
                <p className="text-sm mt-1">
                  Commencez à analyser des poèmes !
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <Card key={result.$id} className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-1">
                          {result.poemTitle}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mb-2">
                          {result.poemAuthor}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {result.mode === "complete" ? "Complet" : "Rapide"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {result.totalStanzas}{" "}
                            {result.totalStanzas > 1 ? "strophes" : "strophe"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              new Date(result.$createdAt),
                              "d MMM yyyy · HH:mm",
                              { locale: fr },
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-3xl font-bold ${getScoreColor(result.averageScore)}`}
                        >
                          {result.averageScore.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          / 20
                        </div>
                        <Badge
                          {...getScoreBadge(result.averageScore)}
                          className="text-xs mt-1"
                        >
                          {getScoreBadge(result.averageScore).label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <Separator />

                  <CardContent className="py-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onViewResult(result)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir le détail
                      </Button>
                      <Button
                        onClick={() => handleDelete(result.$id)}
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === result.$id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
