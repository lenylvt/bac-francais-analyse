import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendOTP, verifyOTP } from "@/lib/appwrite/auth";
import {
  Mail,
  Sparkles,
  Loader2,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Shield,
} from "lucide-react";

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const id = await sendOTP(email);
      setUserId(id);
      setStep("otp");
      setCountdown(60);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyOTP(userId, otp);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const id = await sendOTP(email);
      setUserId(id);
      setOtp("");
      setCountdown(60);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      <div className="w-full max-w-md relative z-10">
        {/* Hero section */}
        <div className="text-center mb-8 animate-float">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-black via-gray-800 to-gray-900 mb-6 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl"></div>
            <BookOpen className="w-10 h-10 text-white relative z-10" />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-gray-900 via-black to-gray-800 bg-clip-text text-transparent">
            BAC Français
          </h1>
          <p className="text-muted-foreground text-lg">
            Analyse linéaire avec l'IA
          </p>
        </div>

        {/* Features badges */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border text-xs font-medium shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
            Évaluation IA
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border text-xs font-medium shadow-sm">
            <Shield className="w-3.5 h-3.5 text-green-600" />
            Connexion sécurisée
          </div>
        </div>

        <Card className="border-2 shadow-2xl backdrop-blur-sm bg-white/95 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Mail className="w-5 h-5" />
              {step === "email" ? "Commencer" : "Vérification"}
            </CardTitle>
            <CardDescription className="text-base">
              {step === "email"
                ? "Entrez votre email pour recevoir un code"
                : `Code envoyé à ${email}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Adresse email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre.email@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoFocus
                    className="h-12 text-base"
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-12 bg-gradient-to-r from-black via-gray-900 to-gray-800 hover:from-gray-900 hover:via-gray-800 hover:to-black text-base font-medium shadow-lg transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Recevoir le code
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Connexion sans mot de passe
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="space-y-3">
                  <label htmlFor="otp" className="text-sm font-medium">
                    Code de vérification
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                    required
                    autoFocus
                    maxLength={6}
                    className="h-16 text-center text-3xl tracking-[0.5em] font-mono font-bold"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-900 text-center leading-relaxed">
                      📧 Consultez votre boîte email
                      <br />
                      Le code expire dans quelques minutes
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 text-base font-medium shadow-lg transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Se connecter
                    </>
                  )}
                </Button>

                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError("");
                    }}
                    className="w-full"
                  >
                    ← Changer d'email
                  </Button>

                  {countdown > 0 ? (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        Renvoyer dans {countdown}s
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="w-full border-2 hover:bg-muted/50"
                    >
                      🔄 Renvoyer le code
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Connexion sécurisée par code OTP
          </p>
        </div>
      </div>
    </div>
  );
}
