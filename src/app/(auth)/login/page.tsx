"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginWithEmailAction } from "@/lib/actions/auth-actions";
import { flushAuthCookiesClient } from "@/lib/auth/cookie-utils";
import { Button } from "@/components/ui/button";
import { Lock, Mail, AlertCircle, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { ValidilySymbol } from "@/components/brand/validily-logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/";
  const isAdminNext = nextUrl.includes("admin");
  const resetSuccess = searchParams.get("reset") === "success";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      // 1. Flush any old accumulated sb-* chunk cookies before setting new session
      flushAuthCookiesClient();

      // 2. Perform authentication via robust Server Action
      // This bypasses client-side Chrome extensions, adblockers, and CORS
      const result = await loginWithEmailAction(email, password);

      if (!result.success) {
        setErrorMsg(result.error || "Échec de connexion. Vérifiez vos identifiants.");
        return;
      }

      // 3. Navigation with full page reload to activate HTTP session cookies
      window.location.href = nextUrl;
    } catch (err: any) {
      console.error("Login attempt error:", err);
      // Fallback: If server action failed due to transient network, attempt client-side gracefully
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        window.location.href = nextUrl;
        return;
      } catch (clientErr: any) {
        setErrorMsg(
          clientErr?.message?.includes("Failed to fetch")
            ? "Impossible de contacter le serveur d'authentification. Vérifiez votre connexion internet."
            : err?.message || "Échec de connexion. Vérifiez vos identifiants."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 shadow-xs">
      <div className="text-center mb-6">
        <ValidilySymbol size="lg" className="mx-auto mb-3" />
        <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
          Connexion à validily-IGL4
        </h1>
        <p className="text-xs text-[#68748A] mt-1">
          {isAdminNext
            ? "Authentification requise pour accéder aux Paramètres et à la Console d'Administration"
            : "Accédez à vos documents, favoris, et suivi de révision"}
        </p>
      </div>

      {isAdminNext && (
        <div className="mb-5 p-3 rounded-lg bg-blue-50/80 border border-blue-200 text-[#182235] text-xs flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-[#2855D9] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#2855D9]">Accès Paramètres :</span>
            <p className="text-[11px] text-[#4A5568] mt-0.5">
              Connectez-vous avec votre compte administrateur pour configurer les matières et semestres.
            </p>
          </div>
        </div>
      )}

      {resetSuccess && (
        <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start space-x-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-emerald-900">Mot de passe réinitialisé !</span>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
            </p>
          </div>
        </div>
      )}

      {urlError && !errorMsg && (
        <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {urlError === "auth-code-error"
              ? "Le lien d'authentification est invalide ou a expiré. Veuillez refaire une demande."
              : decodeURIComponent(urlError)}
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#182235] mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@university.tn"
              required
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium text-[#182235]">
              Mot de passe
            </label>
            <Link
              href="/reset-password"
              className="text-[11px] text-[#2855D9] hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
            />
          </div>
        </div>

        <Button
          type="submit"
          size="md"
          variant="primary"
          disabled={loading}
          className="w-full text-xs"
        >
          {loading ? "Authentification en cours..." : "Se connecter"}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-[#E4E8F0] text-center text-xs text-[#68748A]">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-semibold text-[#2855D9] hover:underline">
          Créer un compte étudiant
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#68748A]">Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}
