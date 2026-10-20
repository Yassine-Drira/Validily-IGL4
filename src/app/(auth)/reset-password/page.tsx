"use client";

import Link from "next/link";
import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flushAuthCookiesClient } from "@/lib/auth/cookie-utils";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { ValidilySymbol } from "@/components/brand/validily-logo";

// Password strength calculation helper
function evaluatePasswordStrength(password: string) {
  let score = 0;
  if (!password) return { score: 0, label: "", color: "" };

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasMinLength) score += 1;
  if (hasUpper && hasLower) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial || password.length >= 12) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: "Faible", color: "bg-rose-500", textColor: "text-rose-600" };
    case 2:
      return { score: 2, label: "Moyen", color: "bg-amber-500", textColor: "text-amber-600" };
    case 3:
      return { score: 3, label: "Robuste", color: "bg-blue-600", textColor: "text-blue-600" };
    case 4:
      return { score: 4, label: "Excellent", color: "bg-emerald-600", textColor: "text-emerald-600" };
    default:
      return { score: 0, label: "", color: "", textColor: "" };
  }
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlError = searchParams.get("error");
  const codeParam = searchParams.get("code");

  // Flow states:
  // "request": Demande par email
  // "requested_sent": Email envoyé avec succès
  // "update": Définir le nouveau mot de passe
  // "updated_success": Nouveau mot de passe enregistré avec succès
  // "expired": Lien expiré ou invalide
  const [flowState, setFlowState] = useState<
    "request" | "requested_sent" | "update" | "updated_success" | "expired"
  >("request");

  // Form fields
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status and feedback
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Initialize and check recovery session on mount
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    // Check URL parameters for explicit errors
    if (urlError) {
      if (
        urlError === "expired-or-invalid" ||
        urlError.toLowerCase().includes("expired") ||
        urlError.toLowerCase().includes("invalid")
      ) {
        setFlowState("expired");
        return;
      }
      setErrorMsg(decodeURIComponent(urlError));
    }

    // Check if recovery tokens are in the hash fragment (implicit flow)
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const isRecoveryHash =
      hash.includes("type=recovery") ||
      hash.includes("access_token=") ||
      hash.includes("refresh_token=");

    // Listen to Supabase auth state changes for PASSWORD_RECOVERY event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setFlowState("update");
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      }
    });

    // Check if session is already active (e.g. exchanged via /api/auth/callback)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setFlowState("update");
        if (session.user?.email) {
          setUserEmail(session.user.email);
        }
      } else if (isRecoveryHash) {
        setFlowState("update");
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [urlError]);

  // Rate-limiting cooldown timer for sending emails
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Redirect countdown after successful password reset
  useEffect(() => {
    if (flowState !== "updated_success") return;
    if (redirectCountdown <= 0) {
      router.push("/login?reset=success");
      return;
    }
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [flowState, redirectCountdown, router]);

  // Evaluate password strength
  const strength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = newPassword.length >= 8 && passwordsMatch;

  // Handler: Request password reset link by email
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || cooldown > 0) return;

    setErrorMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/api/auth/callback?next=/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        // Free tier rate-limit or invalid request handling
        setErrorMsg(error.message || "Impossible d'envoyer l'email de réinitialisation.");
      } else {
        setFlowState("requested_sent");
        setCooldown(60); // 60s cooldown to protect Supabase quotas and prevent spam
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Une erreur inattendue est survenue lors de l'envoi du lien."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handler: Submit new password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setErrorMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg(error.message || "Échec de la mise à jour du mot de passe.");
      } else {
        // Flush stale chunk cookies and sign out to force a clean login with new credentials
        flushAuthCookiesClient();
        await supabase.auth.signOut().catch(() => {});
        setFlowState("updated_success");
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Une erreur est survenue lors de la réinitialisation du mot de passe."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 shadow-xs">
      {/* ========================================================= */}
      {/* STATE 1: REQUEST RESET LINK                               */}
      {/* ========================================================= */}
      {flowState === "request" && (
        <>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2855D9] mx-auto mb-3 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
              Mot de passe oublié ?
            </h1>
            <p className="text-xs text-[#68748A] mt-1.5 max-w-sm mx-auto leading-relaxed">
              Entrez votre adresse email universitaire. Nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe en un clic.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#182235] mb-1">
                Email universitaire
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@university.tn"
                  required
                  autoFocus
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={loading || cooldown > 0 || !email.trim()}
              className="w-full text-xs font-medium"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Envoi du lien en cours...
                </>
              ) : cooldown > 0 ? (
                `Patientez ${cooldown}s pour renvoyer`
              ) : (
                <>
                  <span>Envoyer le lien de récupération</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E4E8F0] text-center text-xs text-[#68748A]">
            Vous vous souvenez de votre mot de passe ?{" "}
            <Link href="/login" className="font-semibold text-[#2855D9] hover:underline">
              Se connecter
            </Link>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* STATE 2: EMAIL SENT CONFIRMATION                          */}
      {/* ========================================================= */}
      {flowState === "requested_sent" && (
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-2xs">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
            Vérifiez vos emails !
          </h1>
          <p className="text-xs text-[#68748A] mt-2 leading-relaxed">
            Un email contenant un lien de récupération sécurisé vient d&apos;être envoyé à :
          </p>
          <div className="my-3 px-3 py-1.5 bg-[#F4F6FA] border border-[#E4E8F0] rounded-md inline-block text-xs font-mono font-semibold text-[#182235]">
            {email}
          </div>

          <div className="my-5 p-4 rounded-lg bg-blue-50/70 border border-blue-200 text-left text-xs text-[#182235] space-y-2">
            <div className="flex items-center space-x-2 font-semibold text-[#2855D9]">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Consignes importantes</span>
            </div>
            <ul className="text-[11px] text-[#4A5568] space-y-1 list-disc pl-4">
              <li>Le lien est à usage unique et reste valide pendant 1 heure.</li>
              <li>Pensez à vérifier votre dossier <strong>Spams / Courriers indésirables</strong>.</li>
              <li>Cliquez directement sur le bouton dans l&apos;email pour configurer votre nouveau mot de passe.</li>
            </ul>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={cooldown > 0 || loading}
              onClick={handleRequestReset}
              className="w-full text-xs"
            >
              {cooldown > 0 ? (
                `Renvoyer un nouveau lien dans ${cooldown}s`
              ) : (
                "Renvoyer l'email de récupération"
              )}
            </Button>

            <Link
              href="/login"
              className="block text-xs text-[#68748A] hover:text-[#182235] hover:underline pt-1"
            >
              Retour à la page de connexion
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE 3: SET NEW PASSWORD                                 */}
      {/* ========================================================= */}
      {flowState === "update" && (
        <>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2855D9] mx-auto mb-3 shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
              Nouveau mot de passe
            </h1>
            <p className="text-xs text-[#68748A] mt-1.5 leading-relaxed">
              Choisissez un nouveau mot de passe sécurisé pour votre compte validily-IGL4.
            </p>
            {userEmail && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#F4F6FA] border border-[#E4E8F0] text-[11px] text-[#4A5568] font-mono">
                {userEmail}
              </span>
            )}
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* Input: Nouveau mot de passe */}
            <div>
              <label className="block text-xs font-medium text-[#182235] mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-9 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#68748A] hover:text-[#182235] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#68748A]">Force du mot de passe :</span>
                    <span className={`font-semibold ${strength.textColor}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-all duration-300 ${
                          step <= strength.score ? strength.color : "bg-stone-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input: Confirmer mot de passe */}
            <div>
              <label className="block text-xs font-medium text-[#182235] mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-9 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#68748A] hover:text-[#182235] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Real-time match verification */}
              {confirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center space-x-1.5 text-[11px]">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">
                        Les mots de passe correspondent
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span className="text-rose-700">
                        Les mots de passe ne correspondent pas
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Password security checklist */}
            <div className="p-3 rounded-lg bg-[#F4F6FA] border border-[#E4E8F0] text-[11px] text-[#68748A] space-y-1">
              <div className="font-semibold text-[#182235] text-[11px] mb-1">
                Recommandations de sécurité :
              </div>
              <div className="flex items-center space-x-1.5">
                <span className={newPassword.length >= 8 ? "text-emerald-600" : "text-[#A0AEC0]"}>
                  ✓
                </span>
                <span className={newPassword.length >= 8 ? "text-[#182235] font-medium" : ""}>
                  Au moins 8 caractères
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "text-emerald-600" : "text-[#A0AEC0]"}>
                  ✓
                </span>
                <span className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "text-[#182235] font-medium" : ""}>
                  Majuscules et minuscules
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className={/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword) ? "text-emerald-600" : "text-[#A0AEC0]"}>
                  ✓
                </span>
                <span className={/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword) ? "text-[#182235] font-medium" : ""}>
                  Au moins un chiffre ou symbole
                </span>
              </div>
            </div>

            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={loading || !isPasswordValid}
              className="w-full text-xs font-medium"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Mise à jour en cours...
                </>
              ) : (
                "Enregistrer le nouveau mot de passe"
              )}
            </Button>
          </form>
        </>
      )}

      {/* ========================================================= */}
      {/* STATE 4: PASSWORD UPDATED SUCCESS                         */}
      {/* ========================================================= */}
      {flowState === "updated_success" && (
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
            Mot de passe mis à jour !
          </h1>
          <p className="text-xs text-[#68748A] mt-2 max-w-sm mx-auto leading-relaxed">
            Votre compte est désormais sécurisé avec votre nouveau mot de passe.
          </p>

          <div className="my-5 p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Redirection automatique vers la connexion dans {redirectCountdown}s...</span>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => router.push("/login?reset=success")}
            className="w-full text-xs"
          >
            Se connecter maintenant
          </Button>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE 5: EXPIRED OR INVALID TOKEN                         */}
      {/* ========================================================= */}
      {flowState === "expired" && (
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-3 shadow-2xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
            Lien expiré ou invalide
          </h1>
          <p className="text-xs text-[#68748A] mt-2 leading-relaxed">
            Ce lien de récupération n&apos;est plus valable. Pour des raisons de sécurité, les liens de réinitialisation expirent après 1 heure ou après avoir déjà été utilisés.
          </p>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setErrorMsg("");
                setFlowState("request");
              }}
              className="w-full text-xs"
            >
              Demander un nouveau lien
            </Button>

            <Link
              href="/login"
              className="block text-xs text-[#68748A] hover:text-[#182235] hover:underline pt-1"
            >
              Retour à la page de connexion
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 shadow-xs text-center text-xs text-[#68748A]">
          <RefreshCw className="w-5 h-5 mx-auto mb-2 text-[#2855D9] animate-spin" />
          Chargement de l&apos;espace de récupération...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
