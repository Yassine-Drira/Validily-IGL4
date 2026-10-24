"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { CoachConversation, CoachConversationSearchResult } from "@/types/database";
import {
  listCoachConversationsAction,
  createCoachConversationAction,
  renameCoachConversationAction,
  deleteCoachConversationAction,
  searchCoachConversationsAction,
} from "@/lib/actions/coach-conversation-actions";

interface CoachHistorySidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (convoId: string) => void;
  onNewConversation: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface GroupedConversations {
  today: CoachConversation[];
  yesterday: CoachConversation[];
  last7Days: CoachConversation[];
  older: CoachConversation[];
}

export function CoachHistorySidebar({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  isOpenMobile,
  onCloseMobile,
}: CoachHistorySidebarProps) {
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CoachConversationSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Rename state
  const [editingConvoId, setEditingConvoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open menu dropdown state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load
  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const res = await listCoachConversationsAction(undefined, 30);
      if (res.success && res.data) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.error("Error loading coach conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const handleUpdate = () => {
      loadConversations();
    };
    window.addEventListener("validily-convo-updated", handleUpdate);
    return () => {
      window.removeEventListener("validily-convo-updated", handleUpdate);
    };
  }, [activeConversationId]);

  // Handle Search Debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchCoachConversationsAction(val, 8);
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setIsSearching(false);
  };

  // Group conversations chronologically
  const groupConversations = (items: CoachConversation[]): GroupedConversations => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    const grouped: GroupedConversations = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: [],
    };

    items.forEach((item) => {
      const time = new Date(item.updated_at).getTime();
      if (time >= todayStart) {
        grouped.today.push(item);
      } else if (time >= yesterdayStart) {
        grouped.yesterday.push(item);
      } else if (time >= sevenDaysStart) {
        grouped.last7Days.push(item);
      } else {
        grouped.older.push(item);
      }
    });

    return grouped;
  };

  // New Chat action
  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      const res = await createCoachConversationAction();
      if (res.success && res.data) {
        setConversations((prev) => [res.data!, ...prev]);
        onSelectConversation(res.data!.id);
        if (isOpenMobile) onCloseMobile();
      }
    } catch (err) {
      console.error("Failed to create new conversation:", err);
    } finally {
      setIsCreating(false);
    }
  };

  // Start Rename
  const handleStartRename = (convo: CoachConversation) => {
    setEditingConvoId(convo.id);
    setEditingTitle(convo.title);
    setOpenMenuId(null);
  };

  // Save Rename
  const handleSaveRename = async () => {
    if (!editingConvoId || !editingTitle.trim()) return;
    setIsRenaming(true);
    try {
      const res = await renameCoachConversationAction(editingConvoId, editingTitle.trim());
      if (res.success && res.data) {
        setConversations((prev) =>
          prev.map((c) => (c.id === editingConvoId ? { ...c, title: res.data!.title } : c))
        );
        setEditingConvoId(null);
      }
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    } finally {
      setIsRenaming(false);
    }
  };

  // Delete Action
  const handleDelete = async (convoId: string) => {
    setIsDeleting(true);
    try {
      const res = await deleteCoachConversationAction(convoId);
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convoId));
        setConfirmDeleteId(null);
        setOpenMenuId(null);
        if (activeConversationId === convoId) {
          onNewConversation();
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const grouped = groupConversations(conversations);

  const renderConversationItem = (item: CoachConversation) => {
    const isActive = item.id === activeConversationId;
    const isEditing = editingConvoId === item.id;
    const isConfirmingDelete = confirmDeleteId === item.id;

    if (isEditing) {
      return (
        <div key={item.id} className="p-2 rounded-xl bg-white border border-[#2855D9] shadow-xs">
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") setEditingConvoId(null);
            }}
            autoFocus
            className="w-full text-xs font-semibold text-[#111A2E] bg-transparent outline-none px-1 py-0.5"
          />
          <div className="flex items-center justify-end gap-1 mt-1.5 pt-1 border-t border-[#E4E8F0]">
            <button
              onClick={() => setEditingConvoId(null)}
              className="p-1 rounded text-[#68748A] hover:bg-[#F1F5F9] cursor-pointer"
              title="Annuler"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSaveRename}
              disabled={isRenaming}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#2855D9] text-white hover:bg-[#1E40AF] cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 inline mr-1" />
              <span>Valider</span>
            </button>
          </div>
        </div>
      );
    }

    if (isConfirmingDelete) {
      return (
        <div key={item.id} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
          <p className="font-bold text-rose-800 text-[11px]">Supprimer cette discussion ?</p>
          <div className="flex items-center justify-end gap-1.5 mt-2">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-2 py-1 rounded text-[10px] font-bold text-[#68748A] hover:bg-white cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              disabled={isDeleting}
              className="px-2.5 py-1 rounded text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
            >
              Supprimer
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className={`group relative flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
          isActive
            ? "bg-[#EDF2FF] text-[#2855D9] font-bold border border-[#2855D9]/20 shadow-2xs"
            : "text-[#111A2E] hover:bg-[#F8FAFC] border border-transparent hover:border-[#E4E8F0]"
        }`}
        onClick={() => {
          onSelectConversation(item.id);
          if (isOpenMobile) onCloseMobile();
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <MessageSquare
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive ? "text-[#2855D9]" : "text-[#68748A] group-hover:text-[#2855D9]"
            }`}
          />
          <div className="truncate">
            <p className="text-xs font-semibold truncate leading-snug">{item.title}</p>
            {item.last_message_preview && (
              <p className="text-[10px] text-[#68748A] truncate font-normal mt-0.5">
                {item.last_message_preview}
              </p>
            )}
          </div>
        </div>

        {/* Action button menu trigger */}
        <div
          className="relative shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
            className="p-1 rounded-lg text-[#68748A] hover:text-[#111A2E] hover:bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {/* Context menu popup */}
          {openMenuId === item.id && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl border border-[#E4E8F0] shadow-md z-30 py-1">
              <button
                onClick={() => handleStartRename(item)}
                className="w-full px-3 py-1.5 text-[11px] font-semibold text-[#111A2E] hover:bg-[#F8FAFC] flex items-center gap-2 text-left cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-[#2855D9]" />
                <span>Renommer</span>
              </button>
              <button
                onClick={() => {
                  setConfirmDeleteId(item.id);
                  setOpenMenuId(null);
                }}
                className="w-full px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-left cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Supprimer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF] p-3.5">
      {/* Header & New Chat button */}
      <div className="space-y-3 pb-3 border-b border-[#E4E8F0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EDF2FF] border border-[#2855D9]/20 flex items-center justify-center text-[#2855D9]">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[#111A2E] uppercase tracking-wider font-mono">
              Historique Coach
            </span>
          </div>

          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-[#68748A] hover:bg-[#F1F5F9] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={handleCreateNew}
          disabled={isCreating}
          className="w-full py-2 px-3 rounded-xl bg-[#2855D9] hover:bg-[#1E40AF] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle discussion</span>
        </button>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#68748A] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher une discussion..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-[#F8FAFC] border border-[#E4E8F0] focus:border-[#2855D9] focus:bg-white text-[#111A2E] placeholder-[#68748A] outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#68748A] hover:text-[#111A2E] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto mt-2.5 space-y-4 pr-1">
        {/* Search Results Mode */}
        {searchResults !== null ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider">
                Résultats de recherche ({searchResults.length})
              </span>
              {isSearching && <span className="text-[10px] text-[#2855D9] animate-pulse">Recherche...</span>}
            </div>

            {searchResults.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-[#F8FAFC] border border-[#E4E8F0] text-xs text-[#68748A]">
                <AlertCircle className="w-4 h-4 mx-auto mb-1.5 text-[#68748A]" />
                <p className="font-semibold">Aucun résultat trouvé</p>
                <p className="text-[10px] mt-0.5">Essayez un autre mot-clé académique</p>
              </div>
            ) : (
              searchResults.map((result) => (
                <div
                  key={result.conversationId}
                  onClick={() => {
                    onSelectConversation(result.conversationId);
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                    result.conversationId === activeConversationId
                      ? "bg-[#EDF2FF] border-[#2855D9]/30 text-[#2855D9]"
                      : "bg-[#F8FAFC] hover:bg-white border-[#E4E8F0] hover:border-[#2855D9]/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#111A2E] truncate">{result.title}</p>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                        result.matchType === "title"
                          ? "bg-blue-100 text-[#2855D9]"
                          : "bg-emerald-100 text-[#059669]"
                      }`}
                    >
                      {result.matchType === "title" ? "Titre" : "Contenu"}
                    </span>
                  </div>
                  {result.matchType === "content" && (
                    <p className="text-[10px] text-[#68748A] mt-1 line-clamp-2 italic">
                      "{result.snippet}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        ) : isLoading ? (
          /* Skeletons */
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-[#F1F5F9] animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          /* Empty state */
          <div className="p-6 text-center text-xs text-[#68748A] space-y-2">
            <Sparkles className="w-6 h-6 mx-auto text-[#2855D9]/50" />
            <p className="font-semibold text-[#111A2E]">Aucune discussion archivée</p>
            <p className="text-[11px]">Lancez un dialogue avec votre Coach IA pour démarrer l'historique.</p>
          </div>
        ) : (
          /* Grouped chronological list */
          <div className="space-y-4">
            {grouped.today.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider px-2">
                  Aujourd'hui
                </span>
                {grouped.today.map(renderConversationItem)}
              </div>
            )}

            {grouped.yesterday.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider px-2">
                  Hier
                </span>
                {grouped.yesterday.map(renderConversationItem)}
              </div>
            )}

            {grouped.last7Days.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider px-2">
                  7 derniers jours
                </span>
                {grouped.last7Days.map(renderConversationItem)}
              </div>
            )}

            {grouped.older.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider px-2">
                  Plus ancien
                </span>
                {grouped.older.map(renderConversationItem)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Column */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 h-[780px] rounded-3xl border border-[#E4E8F0] shadow-xs overflow-hidden bg-white">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (with Backdrop) */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
