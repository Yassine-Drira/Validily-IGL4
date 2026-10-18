"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  ShieldCheck,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Send,
  AlertTriangle,
  RefreshCw,
  Lock,
  Upload,
  Code,
  Eye,
  Columns,
  Save,
  RotateCcw,
  FileCode,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBroadcastSettingsSummary,
  getReleaseEmailPreviewAction,
  executeReleaseEmailBroadcastAction,
  saveCustomEmailTemplateAction,
  resetCustomEmailTemplateAction,
  BroadcastSummary,
} from "@/lib/actions/email-actions";

export function AdminEmailBroadcastView() {
  const [summary, setSummary] = useState<BroadcastSummary | null>(null);
  const [subject, setSubject] = useState<string>("Validily IGL4 — Annonce Officielle");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [plainText, setPlainText] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "code" | "split">("split");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [isRunningDryRun, setIsRunningDryRun] = useState(false);
  const [isSendingLive, setIsSendingLive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  const [dryRunReport, setDryRunReport] = useState<string | null>(null);
  const [liveReport, setLiveReport] = useState<string | null>(null);
  const [saveReport, setSaveReport] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [sum, preview] = await Promise.all([
          getBroadcastSettingsSummary(),
          getReleaseEmailPreviewAction("v1.2"),
        ]);
        setSummary(sum);
        if (preview) {
          setSubject(preview.subject || "Validily IGL4 — Annonce Officielle");
          setHtmlContent(preview.html || "");
          setPlainText(preview.text || "");
          setIsCustom(Boolean((preview as any).isCustom));
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Impossible de charger les données SMTP.");
      }
    }
    loadData();
  }, []);

  const handleCopyText = () => {
    const textToCopy = plainText || htmlContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".html") && !file.name.toLowerCase().endsWith(".htm")) {
      setErrorMessage("Veuillez sélectionner un fichier HTML valide (.html ou .htm).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setHtmlContent(content);
        setIsCustom(true);
        setImportedFileName(file.name);
        setSaveReport(
          `Fichier "${file.name}" importé avec succès (${(file.size / 1024).toFixed(1)} Ko). Vous pouvez l'éditer en direct ou l'enregistrer dans la base.`
        );
        setErrorMessage(null);

        // Auto-detect title tag if present
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          setSubject(titleMatch[1].trim());
        }
      }
    };
    reader.onerror = () => {
      setErrorMessage("Erreur lors de la lecture du fichier HTML importé.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    setSaveReport(null);
    setErrorMessage(null);
    try {
      const res = await saveCustomEmailTemplateAction({
        subject,
        html: htmlContent,
      });
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsCustom(true);
        setSaveReport("Modèle personnalisé enregistré dans la base globale avec succès.");
        setTimeout(() => setSaveReport(null), 6000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erreur lors de la sauvegarde du modèle.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTemplate = async () => {
    setIsResetting(true);
    setSaveReport(null);
    setErrorMessage(null);
    try {
      const res = await resetCustomEmailTemplateAction();
      if (res.defaultTemplate) {
        setSubject(res.defaultTemplate.subject);
        setHtmlContent(res.defaultTemplate.html);
        setPlainText(res.defaultTemplate.text);
        setIsCustom(false);
        setImportedFileName(null);
        setSaveReport("Modèle réinitialisé au gabarit officiel Validily v1.2.");
        setTimeout(() => setSaveReport(null), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erreur lors de la réinitialisation.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleRunSimulation = async () => {
    setIsRunningDryRun(true);
    setDryRunReport(null);
    setLiveReport(null);
    setErrorMessage(null);

    try {
      const res = await executeReleaseEmailBroadcastAction({
        dryRun: true,
        customSubject: subject,
        customHtml: htmlContent,
      });
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.result) {
        setDryRunReport(
          `Simulation validée : ${res.result.recipientsCount} destinataires vérifiés. Message-ID généré : ${res.result.messageId}. Objet testé : "${subject}". Aucun paquet SMTP réel envoyé (Dry-run).`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Échec de la simulation.");
    } finally {
      setIsRunningDryRun(false);
    }
  };

  const handleSendLiveBroadcast = async () => {
    setIsSendingLive(true);
    setDryRunReport(null);
    setLiveReport(null);
    setErrorMessage(null);
    setShowConfirmModal(false);

    try {
      const res = await executeReleaseEmailBroadcastAction({
        dryRun: false,
        customSubject: subject,
        customHtml: htmlContent,
      });
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.result) {
        if (res.result.isDryRun) {
          setDryRunReport(
            `Sécurité active : L'envoi a été intercepté en mode simulation car ENABLE_EMAIL_BROADCAST=true ou le mot de passe SMTP n'est pas encore configuré dans vos variables d'environnement.`
          );
        } else {
          setLiveReport(
            `Courriel officiel diffusé avec succès à ${res.result.recipientsCount} étudiants ! Message-ID : ${res.result.messageId}`
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Échec de l'envoi de la diffusion.");
    } finally {
      setIsSendingLive(false);
    }
  };

  const htmlSizeBytes = new Blob([htmlContent]).size;
  const htmlSizeKb = (htmlSizeBytes / 1024).toFixed(1);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden File Input for HTML Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* Top Banner & SMTP Service Info */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[#111A2E]">
                  Service SMTP & Annonces de Mises à Jour
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  validely.app@gmail.com
                </span>
                {isCustom && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    Modèle Personnalisé Actif
                  </span>
                )}
              </div>
              <p className="text-xs text-[#68748A] mt-0.5">
                Édition libre du code HTML, importation directe de gabarits préconçus (.html) et diffusion en direct auprès de la cohorte étudiante.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs border-[#2855D9] text-[#2855D9] hover:bg-blue-50 font-medium"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              <span>Importer un fichier HTML (.html)</span>
            </Button>

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
              variant="outline"
              onClick={handleRunSimulation}
              disabled={isRunningDryRun || isSendingLive}
              className="text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRunningDryRun ? "animate-spin" : ""}`} />
              <span>Tester la simulation (Dry-Run)</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setShowConfirmModal(true)}
              disabled={isRunningDryRun || isSendingLive}
              className="text-xs bg-[#2855D9] hover:bg-[#1E40AF] text-white font-medium"
            >
              <Send className={`w-3.5 h-3.5 mr-1 ${isSendingLive ? "animate-pulse" : ""}`} />
              <span>{isSendingLive ? "Envoi en cours..." : "Diffuser en direct"}</span>
            </Button>
          </div>
        </div>

        {/* Safety Lock Status Notice */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
          <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Protocole de sécurité actif : </span>
            Vous pouvez importer n'importe quel code HTML fini ou l'éditer en direct ci-dessous. Le déclencheur d'envoi en direct requiert <code className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-800 font-mono text-[10px]">ENABLE_EMAIL_BROADCAST=true</code> sur Vercel pour expédier physiquement les emails. La simulation (Dry-Run) valide 100% du flux immédiatement.
          </div>
        </div>

        {/* Live Broadcast Success Report */}
        {liveReport && (
          <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium">{liveReport}</span>
          </div>
        )}

        {/* Save feedback alert */}
        {saveReport && (
          <div className="mt-4 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-medium">{saveReport}</span>
          </div>
        )}

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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#2855D9] flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Confirmer la diffusion du courriel
                </h3>
                <p className="text-xs text-slate-500">
                  Diffusion officielle auprès des étudiants enregistrés
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Expéditeur SMTP :</span>
                <span className="font-mono font-medium text-slate-900">validely.app@gmail.com</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Destinataires estimés :</span>
                <span className="font-semibold text-slate-900">{summary?.totalRegisteredUsers || 5} étudiants</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Gabarit utilisé :</span>
                <span className="font-semibold text-purple-700">
                  {isCustom ? "Modèle Personnalisé (Importé/Édité)" : "Gabarit Officiel Validily"} ({htmlSizeKb} Ko)
                </span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block text-[11px] mb-0.5">Objet du courriel :</span>
                <span className="font-semibold text-slate-900 line-clamp-1">{subject}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Le message sera envoyé tel quel avec le code HTML actuellement prévisualisé.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSendLiveBroadcast}
                className="text-xs bg-[#2855D9] hover:bg-[#1E40AF] text-white"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Confirmer et diffuser</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Editor & Live Preview Workbench */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-5">
        {/* Subject and Metadata bar */}
        <div className="space-y-3 pb-4 border-b border-[#E4E8F0]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-2xl">
              <label htmlFor="email-subject-input" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Objet du Courriel (Subject Line) :</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="email-subject-input"
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setIsCustom(true);
                  }}
                  placeholder="Ex: Validily IGL4 — Nouveautés et Mises à Jour..."
                  className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2855D9] transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 font-medium"
                title="Enregistrer ce code HTML et cet objet dans la base globale"
              >
                <Save className={`w-3.5 h-3.5 mr-1 ${isSaving ? "animate-spin" : ""}`} />
                <span>{isSaving ? "Enregistrement..." : "Enregistrer le modèle"}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleResetTemplate}
                disabled={isResetting}
                className="text-xs text-slate-600 hover:text-slate-900"
                title="Rétablir le gabarit HTML officiel Validily v1.1"
              >
                <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isResetting ? "animate-spin" : ""}`} />
                <span>Réinitialiser</span>
              </Button>
            </div>
          </div>

          {/* Quick Info bar */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-[#68748A] gap-2 pt-1">
            <div className="flex items-center gap-3">
              <span>Taille du gabarit : <strong className="text-slate-800">{htmlSizeKb} Ko</strong> ({htmlContent.length} caractères)</span>
              {importedFileName && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px]">
                  Fichier importé : {importedFileName}
                </span>
              )}
            </div>

            {/* Mode selector (Preview / Code / Split) */}
            <div className="flex items-center space-x-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0]">
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                  viewMode === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu Rendu</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                  viewMode === "code" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Éditeur HTML</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                  viewMode === "split" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Vue Scindée</span>
              </button>
            </div>
          </div>
        </div>

        {/* Viewport bar for preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aperçu en Direct dans un Navigateur Virtuel :</span>
            </span>

            <div className="flex items-center space-x-1 bg-[#F4F6FA] p-0.5 rounded-lg border border-[#E4E8F0]">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all ${
                  previewMode === "desktop" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>Bureau (600px)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all ${
                  previewMode === "mobile" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Mobile (380px)</span>
              </button>
            </div>
          </div>
        )}

        {/* Workbench Body */}
        <div className="transition-all duration-200">
          {/* ONLY CODE MODE */}
          {viewMode === "code" && (
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono text-[11px]">Éditeur de code HTML (Collez ou tapez votre code ici)</span>
                <span className="text-[10px] font-mono text-emerald-400">Syntaxe HTML5 supportée</span>
              </div>
              <textarea
                value={htmlContent}
                onChange={(e) => {
                  setHtmlContent(e.target.value);
                  setIsCustom(true);
                }}
                spellCheck={false}
                rows={24}
                className="w-full font-mono text-xs text-slate-200 bg-transparent border-0 focus:outline-hidden resize-y leading-relaxed"
                placeholder="<html><body><h1>Votre message personnalisé...</h1></body></html>"
              />
            </div>
          )}

          {/* ONLY PREVIEW MODE */}
          {viewMode === "preview" && (
            <div className="flex justify-center bg-[#0b0f19] p-6 rounded-xl border border-slate-800 overflow-x-auto min-h-[550px]">
              {htmlContent ? (
                <div
                  style={{ width: previewMode === "desktop" ? "600px" : "380px" }}
                  className="transition-all duration-300 shadow-2xl"
                >
                  <iframe
                    title="Email Preview"
                    srcDoc={htmlContent}
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
          )}

          {/* SPLIT VIEW (Code on Left, Render on Right) */}
          {viewMode === "split" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Code Editor Panel */}
              <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 flex flex-col h-[760px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 shrink-0">
                  <span className="font-mono text-[11px]">Code Source HTML (Modifiable en direct)</span>
                  <span className="text-[10px] font-mono text-emerald-400">Mise à jour instantanée</span>
                </div>
                <textarea
                  value={htmlContent}
                  onChange={(e) => {
                    setHtmlContent(e.target.value);
                    setIsCustom(true);
                  }}
                  spellCheck={false}
                  className="w-full flex-1 font-mono text-xs text-slate-200 bg-transparent border-0 focus:outline-hidden resize-none leading-relaxed overflow-y-auto"
                  placeholder="<html><body><h1>Votre message personnalisé...</h1></body></html>"
                />
              </div>

              {/* Render Frame Panel */}
              <div className="flex justify-center items-start bg-[#0b0f19] p-4 rounded-xl border border-slate-800 overflow-y-auto h-[760px]">
                <div
                  style={{ width: previewMode === "desktop" ? "100%" : "380px", maxWidth: "600px" }}
                  className="transition-all duration-300 shadow-2xl h-full"
                >
                  <iframe
                    title="Email Preview Split"
                    srcDoc={htmlContent}
                    className="w-full h-full border-0 rounded-xl bg-[#0b0f19]"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
