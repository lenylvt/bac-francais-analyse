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
} from "lucide-react";
import { logout, getCurrentUser } from "@/lib/appwrite/auth";
import { getUserStats } from "@/lib/appwrite/database";

interface PoemSelectorProps {
  poems: Poem[];
  onSelect: (poemId: string) => void;
}

export default function PoemSelector({ poems, onSelect }: PoemSelectorProps) {
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    completedAnalyses: 0,
    averageScore: 0,
  });
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

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

          {/* Poems List */}
          <div className="space-y-3">
            {poems.map((poem) => (
              <Card
                key={poem.id}
                className="group cursor-pointer border-2 hover:border-black hover:shadow-md transition-all duration-200"
                onClick={() => onSelect(poem.id)}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold mb-1 group-hover:text-black transition-colors">
                            {poem.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {poem.author}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {poem.collection} • {poem.year}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {poem.stanzas.length} strophes
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {poem.fullText.filter((line) => line.trim()).length}{" "}
                          vers
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 line-clamp-2">
                        {poem.stanzas[0].lines[0]}
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
