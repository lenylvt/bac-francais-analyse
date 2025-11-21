import { useState, useEffect } from "react";
import Auth from "@/components/Auth";
import PoemSelector from "@/components/PoemSelector";
import { getCurrentUser, type AuthUser } from "@/lib/appwrite/auth";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleAuthSuccess = () => {
    checkAuth();
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  return <PoemSelector />;
}

export default App;
