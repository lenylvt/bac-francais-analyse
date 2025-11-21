import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Poem } from "@/types";
import {
  BookOpen,
  Calendar,
  User,
  LogOut,
  Sparkles,
  ChevronRight,
  Clock,
} from "lucide-react";
import { logout, getCurrentUser } from "@/lib/appwrite/auth";
import { getUserStats, getIncompleteAnalyses } from "@/lib/appwrite/database";
import { getAllPoems, type PoemDocument } from "@/lib/appwrite/poems";

export default function PoemSelector() {
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    completedAnalyses: 0,
    averageScore: 0,
  });
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [incompletePoems, setIncompletePoems] = useState<Set<string>>(
    new Set(),
  );
  const [dbPoems, setDbPoems] = useState<PoemDocument[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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
        setUserId(user.$id);
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
      const poems = await getAllPoems();
      setDbPoems(poems);

      // Check for incomplete analyses after poems are loaded
      const user = await getCurrentUser();
      if (user && poems.length > 0) {
        const incomplete = new Set<string>();
        for (const poem of poems) {
          const analyses = await getIncompleteAnalyses(user.$id, poem.$id);
          if (analyses.length > 0) {
            incomplete.add(poem.$id);
          }
        }
        setIncompletePoems(incomplete);
      }
    } catch (error) {
      console.error("Error loading poems from DB:", error);
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
    <div className="h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1920px] mx-auto px-6 md:px-12 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
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

          {/* DB Poems Section */}
          <div className="space-y-3">
            {dbPoems.map((dbPoem) => {
              const hasIncomplete = incompletePoems.has(dbPoem.$id);
              return (
                <Card
                  key={dbPoem.$id}
                  className={`group cursor-pointer border-2 hover:border-black hover:shadow-md transition-all duration-200 ${
                    hasIncomplete ? "border-amber-500/50 bg-amber-50/30" : ""
                  }`}
                >
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold group-hover:text-black transition-colors">
                                {dbPoem.title}
                              </h3>
                              {hasIncomplete && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-700 border-amber-500/30 flex items-center gap-1"
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

                        {dbPoem.analyses && (
                          <div className="bg-muted/50 border rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Analyses disponibles
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {dbPoem.analyses}
                            </p>
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 line-clamp-3">
                          {dbPoem.fullText.split("\n").slice(0, 2).join(" ")}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-black group-hover:text-white flex items-center justify-center transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
