"use client";

import React, { useState } from "react";
import {
  Music,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  Globe,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  Radio,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioCatalogEntry, AudioCatalogCategory, AudioSourceType } from "@/types/database";
import {
  createCatalogEntry,
  updateCatalogEntry,
  togglePublishCatalogEntry,
  deleteCatalogEntry,
} from "@/lib/actions/audio-catalog-actions";
import { parseAndValidateYouTubeUrl } from "@/lib/audio/youtube-parser";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

interface AdminAudioCatalogProps {
  initialEntries: AudioCatalogEntry[];
  onNotify?: (msg: string, isError?: boolean) => void;
}

const CATEGORY_LABELS: Record<AudioCatalogCategory, { label: string; color: string }> = {
  focus: { label: "Focus & Synthèse", color: "bg-blue-50 text-blue-700 border-blue-200" },
  lofi: { label: "Lo-Fi Beats", color: "bg-purple-50 text-purple-700 border-purple-200" },
  nature: { label: "Nature & Éléments", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ambient: { label: "Ambient & Drone", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  binaural: { label: "Ondes Binaurales", color: "bg-sky-50 text-sky-700 border-sky-200" },
  classical: { label: "Classique & Piano", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

export function AdminAudioCatalog({ initialEntries, onNotify }: AdminAudioCatalogProps) {
  const [entries, setEntries] = useState<AudioCatalogEntry[]>(initialEntries);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AudioCatalogEntry | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<AudioCatalogCategory>("focus");
  const [formSourceType, setFormSourceType] = useState<AudioSourceType>("youtube");
  const [formSourceKey, setFormSourceKey] = useState("");
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete modal state
  const [entryToDelete, setEntryToDelete] = useState<AudioCatalogEntry | null>(null);

  const filteredEntries = entries.filter((e) =>
    selectedCategory === "all" ? true : e.category === selectedCategory
  );

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("focus");
    setFormSourceType("youtube");
    setFormSourceKey("");
    setFormIsPublished(true);
    setFormSortOrder(entries.length * 10);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (entry: AudioCatalogEntry) => {
    setEditingEntry(entry);
    setFormTitle(entry.title);
    setFormDescription(entry.description || "");
    setFormCategory(entry.category);
    setFormSourceType(entry.source_type);
    setFormSourceKey(entry.source_key);
    setFormIsPublished(entry.is_published);
    setFormSortOrder(entry.sort_order);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Veuillez renseigner un titre valide.");
      return;
    }
    if (formSourceType === "youtube") {
      const parsed = parseAndValidateYouTubeUrl(formSourceKey);
      if (!parsed.valid) {
        setFormError(parsed.error || "URL YouTube invalide.");
        return;
      }
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      if (editingEntry) {
        const res = await updateCatalogEntry(editingEntry.id, {
          title: formTitle,
          description: formDescription,
          category: formCategory,
          sourceType: formSourceType,
          sourceKey: formSourceKey,
          isPublished: formIsPublished,
          sortOrder: formSortOrder,
        });

        if (!res.success || !res.entry) {
          setFormError(res.error || "Échec de la modification.");
          return;
        }

        setEntries((prev) =>
          prev.map((item) => (item.id === editingEntry.id ? res.entry! : item))
        );
        onNotify?.(`Piste "${formTitle}" mise à jour.`);
        setIsModalOpen(false);
      } else {
        const res = await createCatalogEntry({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          sourceType: formSourceType,
          sourceKey: formSourceKey,
          isPublished: formIsPublished,
          sortOrder: formSortOrder,
        });

        if (!res.success || !res.entry) {
          setFormError(res.error || "Échec de la création.");
          return;
        }

        setEntries((prev) => [...prev, res.entry!]);
        onNotify?.(`Piste "${formTitle}" ajoutée au catalogue partagé.`);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err?.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (entry: AudioCatalogEntry) => {
    const nextState = !entry.is_published;
    const res = await togglePublishCatalogEntry(entry.id, nextState);
    if (res.success) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, is_published: nextState } : e))
      );
      onNotify?.(
        nextState
          ? `Piste "${entry.title}" publiée dans le catalogue étudiant.`
          : `Piste "${entry.title}" passée en brouillon masqué.`
      );
    } else {
      onNotify?.(res.error || "Erreur lors du changement de publication.", true);
    }
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    const target = entryToDelete;
    const res = await deleteCatalogEntry(target.id);
    if (res.success) {
      setEntries((prev) => prev.filter((e) => e.id !== target.id));
      onNotify?.(`Piste "${target.title}" supprimée.`);
      setEntryToDelete(null);
    } else {
      onNotify?.(res.error || "Erreur de suppression.", true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E4E8F0] p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-serif font-bold text-[#111A2E] flex items-center space-x-2">
            <Radio className="w-4 h-4 text-[#2855D9]" />
            <span>Catalogue Audio Partagé ({entries.length})</span>
          </h2>
          <p className="text-xs text-[#68748A] mt-0.5">
            Pistes audios et flux YouTube curatés par l&apos;administration, accessibles par l&apos;ensemble de la promo.
          </p>
        </div>

        <Button size="sm" variant="primary" onClick={openCreateModal}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Ajouter une Piste</span>
        </Button>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${
            selectedCategory === "all"
              ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
              : "bg-white border border-[#E4E8F0] text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          Toutes ({entries.length})
        </button>
        {(["focus", "lofi", "nature", "ambient", "binaural", "classical"] as AudioCatalogCategory[]).map((cat) => {
          const count = entries.filter((e) => e.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
                  : "bg-white border border-[#E4E8F0] text-[#68748A] hover:bg-[#F4F6FA]"
              }`}
            >
              {CATEGORY_LABELS[cat].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Entries Table */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl overflow-hidden shadow-xs">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-[#68748A] text-xs space-y-2">
            <Music className="w-8 h-8 mx-auto text-[#94A3B8]" />
            <p className="font-medium text-[#111A2E]">Aucune piste audio dans cette catégorie.</p>
            <p>Cliquez sur &ldquo;Ajouter une Piste&rdquo; pour enrichir le catalogue partagé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4E8F0] bg-[#FAFBFD] text-[#68748A] font-semibold">
                  <th className="py-3 px-4">Piste & Titre</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8F0]">
                {filteredEntries.map((entry) => {
                  const catBadge = CATEGORY_LABELS[entry.category] || CATEGORY_LABELS.focus;
                  const isPreviewing = previewingId === entry.id;

                  return (
                    <tr key={entry.id} className="hover:bg-[#FAFBFD] transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center shrink-0">
                            <Music className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-[#111A2E]">{entry.title}</div>
                            {entry.description && (
                              <div className="text-[11px] text-[#68748A] line-clamp-1">
                                {entry.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${catBadge.color}`}
                        >
                          {catBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#68748A]">
                        {entry.source_type === "youtube" ? (
                          <div className="flex items-center space-x-1.5 text-rose-600 font-mono text-[11px]">
                            <span>YouTube</span>
                            <span className="text-[#94A3B8]">({entry.youtube_video_id})</span>
                          </div>
                        ) : (
                          <span className="font-mono text-[11px]">Synthèse interne</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(entry)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition ${
                            entry.is_published
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                          }`}
                          title="Cliquer pour basculer la visibilité promo"
                        >
                          {entry.is_published ? (
                            <>
                              <Globe className="w-3 h-3" />
                              <span>Publié</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Brouillon</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {entry.source_type === "youtube" && (
                            <button
                              type="button"
                              onClick={() => setPreviewingId(isPreviewing ? null : entry.id)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isPreviewing
                                  ? "bg-[#2855D9] text-white border-[#2855D9]"
                                  : "border-[#E4E8F0] text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
                              }`}
                              title={isPreviewing ? "Arrêter l'aperçu" : "Aperçu lecteur"}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(entry)}
                            className="p-1.5 rounded-lg border border-[#E4E8F0] text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] transition cursor-pointer"
                            title="Modifier la piste"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEntryToDelete(entry)}
                            className="p-1.5 rounded-lg border border-[#E4E8F0] text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer"
                            title="Supprimer la piste"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Live Admin Preview Panel if a YouTube track is being previewed */}
        {previewingId && (
          <div className="p-4 bg-[#FAFBFD] border-t border-[#E4E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-[#111A2E]">
              <Volume2 className="w-4 h-4 text-[#2855D9] animate-pulse" />
              <span>
                Aperçu de sécurité :{" "}
                <strong>{entries.find((e) => e.id === previewingId)?.title}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <iframe
                title="Aperçu Audio"
                width="200"
                height="60"
                src={`https://www.youtube-nocookie.com/embed/${
                  entries.find((e) => e.id === previewingId)?.youtube_video_id
                }?autoplay=1&enablejsapi=1`}
                className="rounded-lg border border-[#E4E8F0]"
                allow="autoplay; encrypted-media"
                sandbox="allow-scripts allow-same-origin allow-presentation"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewingId(null)}
                className="text-xs"
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="font-bold text-sm text-[#111A2E] flex items-center space-x-2">
                <Music className="w-4 h-4 text-[#2855D9]" />
                <span>
                  {editingEntry ? "Modifier la Piste Partagée" : "Ajouter une Piste au Catalogue"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#68748A] hover:text-[#111A2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">
                  Titre de la piste audio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Lofi Study Beats 2026 - Peaceful Piano"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">
                  Description pédagogique / ambiance (optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Ambiance sonore relaxante sans paroles, idéale pour les révisions de compilation et systèmes."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111A2E] mb-1">Catégorie</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AudioCatalogCategory)}
                    className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                  >
                    <option value="focus">Focus & Synthèse</option>
                    <option value="lofi">Lo-Fi Beats</option>
                    <option value="nature">Nature & Éléments</option>
                    <option value="ambient">Ambient & Drone</option>
                    <option value="binaural">Ondes Binaurales</option>
                    <option value="classical">Classique & Piano</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#111A2E] mb-1">Ordre de tri</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">
                  URL YouTube autorisée *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formSourceKey}
                  onChange={(e) => setFormSourceKey(e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 font-mono text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
                <p className="text-[11px] text-[#68748A] mt-1">
                  Formats supportés : `youtube.com/watch?v=...`, `youtu.be/...`, ou `youtube.com/shorts/...`.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="catalogPublishCheck"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="rounded border-[#E4E8F0] text-[#2855D9] focus:ring-[#2855D9]"
                />
                <label htmlFor="catalogPublishCheck" className="text-xs text-[#111A2E] font-medium cursor-pointer">
                  Publier immédiatement et rendre accessible à tous les étudiants de la promo
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" size="sm" variant="primary" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Enregistrement..."
                    : editingEntry
                    ? "Mettre à jour la piste"
                    : "Ajouter au catalogue"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {entryToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(entryToDelete)}
          onClose={() => setEntryToDelete(null)}
          onConfirm={confirmDelete}
          itemName={entryToDelete.title}
          itemType="resource"
          itemFormat="Piste Audio du Catalogue"
        />
      )}
    </div>
  );
}
