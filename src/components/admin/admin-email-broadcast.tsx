"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  ShieldCheck,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Send,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBroadcastSettingsSummary,
  getReleaseEmailPreviewAction,
  executeReleaseEmailBroadcastAction,
  BroadcastSummary,
} from "@/lib/actions/email-actions";

export function AdminEmailBroadcastView() {
  const [summary, setSummary] = useState<BroadcastSummary | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [isRunningDryRun, setIsRunningDryRun] = useState(false);
  const [dryRunReport, setDryRunReport] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [sum, preview] = await Promise.all([
          getBroadcastSettingsSummary(),
          getReleaseEmailPreviewAction("v1.1"),
        ]);
        setSummary(sum);
        setEmailPreview(preview);
      } catch (err: any) {
        setErrorMessage(err?.message || "Impossible de charger les données SMTP.");
      }
    }
    loadData();
  }, []);

  const handleCopyText = () => {
    if (!emailPreview) return;
    navigator.clipboard.writeText(emailPreview.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunSimulation = async () => {
    setIsRunningDryRun(true);
    setDryRunReport(null);
    setErrorMessage(null);

    try {
      const res = await executeReleaseEmailBroadcastAction({ dryRun: true });
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.result) {
        setDryRunReport(
          `Simulation validée : ${res.result.recipientsCount} destinataires vérifiés. Message-ID généré : ${res.result.messageId}. Aucun paquet SMTP réel envoyé (Dry-run).`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Échec de la simulation.");
    } finally {
      setIsRunningDryRun(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & SMTP Service Info */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-[#111A2E]">
                  Service SMTP & Annonces de Mises à Jour
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  validely.app@gmail.com
                </span>
              </div>
              <p className="text-xs text-[#68748A] mt-0.5">
                Génération de courriels d'annonce au design premium, calqué sur la charte graphique de l'application (sans émojis IA génériques).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyText}
              className="text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              <span>{copied ? "Texte copié" : "Copier version texte"}</span>
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={handleRunSimulation}
              disabled={isRunningDryRun}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRunningDryRun ? "animate-spin" : ""}`} />
              <span>Tester la simulation (Dry-Run)</span>
            </Button>
          </div>
        </div>

        {/* Safety Lock Status Notice */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
          <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Verrou de sécurité actif : </span>
            Conformément aux directives de pré-production, aucun email réel n'est envoyé lors des développements locaux.
            Le déclencheur d'envoi en direct reste verrouillé jusqu'au déploiement validé sur Git et activation de <code className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-800 font-mono text-[10px]">ENABLE_EMAIL_BROADCAST=true</code>.
          </div>
        </div>

        {/* Dry run feedback alerts */}
        {dryRunReport && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{dryRunReport}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Live Email Preview Container */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[#111A2E] flex items-center space-x-2">
              <span>Aperçu en Direct du Courriel (HTML Rendu)</span>
            </h3>
            <p className="text-xs text-[#68748A]">
              Objet : <strong className="text-slate-800">{emailPreview?.subject || "Chargement..."}</strong>
            </p>
          </div>

          {/* Viewport switch */}
          <div className="flex items-center space-x-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0]">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                previewMode === "desktop" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Bureau (600px)</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                previewMode === "mobile" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile (380px)</span>
            </button>
          </div>
        </div>

        {/* Render Frame */}
        <div className="flex justify-center bg-[#0b0f19] p-6 rounded-xl border border-slate-800 overflow-x-auto min-h-[500px]">
          {emailPreview ? (
            <div
              style={{ width: previewMode === "desktop" ? "600px" : "380px" }}
              className="transition-all duration-300 shadow-2xl"
            >
              <iframe
                title="Email Preview"
                srcDoc={emailPreview.html}
                className="w-full h-[760px] border-0 rounded-xl bg-[#0b0f19]"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center text-slate-400 text-xs py-12">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Génération du gabarit d'annonce...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
