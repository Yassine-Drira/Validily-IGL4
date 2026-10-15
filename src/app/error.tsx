"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-[#E4E8F0] rounded-3xl p-8 sm:p-10 text-center shadow-xs space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>

        <div className="space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FAFAF7] border border-[#E4E8F0] text-[#68748A]">
            validily-IGL4 • Sécurité & Résilience
          </div>
          <h1 className="text-xl font-bold text-[#111A2E] tracking-tight">
            Une interruption temporaire est survenue
          </h1>
          <p className="text-xs text-[#68748A] leading-relaxed max-w-sm mx-auto">
            La plateforme a isolé cette erreur pour préserver vos données de session. Vous pouvez recharger la vue immédiatement.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => reset()}
            className="w-full sm:w-auto text-xs py-2 px-4 flex items-center justify-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réessayer</span>
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full text-xs py-2 px-4 flex items-center justify-center space-x-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Retour à l&apos;accueil</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
