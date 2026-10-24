"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  CheckCheck,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
  Droplets,
  Flame,
  Award,
  Zap,
  Crown,
  Megaphone,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentProfileModal } from "@/components/profile/student-profile-modal";
import { AnnouncementModal, AnnouncementData } from "./announcement-modal";
import { SystemNotification, CheerType } from "@/types/database";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/actions/notification-actions";

interface NotificationBellProps {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "À l'instant";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function getCheerMeta(type?: CheerType) {
  switch (type) {
    case "water":
      return {
        icon: Droplets,
        bg: "bg-blue-50 border-blue-200 text-blue-600",
        badge: "bg-blue-100 text-blue-700",
        iconColor: "text-blue-600",
        emoji: "💧",
      };
    case "fire":
      return {
        icon: Flame,
        bg: "bg-amber-50 border-amber-200 text-amber-600",
        badge: "bg-amber-100 text-amber-800",
        iconColor: "text-amber-600",
        emoji: "🔥",
      };
    case "muscle":
      return {
        icon: Zap,
        bg: "bg-purple-50 border-purple-200 text-purple-600",
        badge: "bg-purple-100 text-purple-700",
        iconColor: "text-purple-600",
        emoji: "💪",
      };
    case "clap":
    default:
      return {
        icon: Award,
        bg: "bg-emerald-50 border-emerald-200 text-emerald-600",
        badge: "bg-emerald-100 text-emerald-800",
        iconColor: "text-emerald-600",
        emoji: "👏",
      };
  }
}

function getNotificationMeta(item: SystemNotification) {
  if (item.type === "announcement" || item.id.startsWith("announcement-")) {
    const isV2 = item.id.includes("v2") || item.title.includes("v2.0") || item.title.includes("V2");
    const isV1_3 = item.id.includes("v1-3") || item.title.includes("v1.3");
    const isV1_2 = item.id.includes("v1-2") || item.title.includes("v1.2");
    const isV1_1 = item.id.includes("v1-1") || item.title.includes("v1.1");
    const versionLabel = isV2 ? "v2.0" : isV1_3 ? "v1.3" : isV1_2 ? "v1.2" : isV1_1 ? "v1.1" : "v2.0";

    return {
      icon: Sparkles,
      bg: "bg-gradient-to-br from-blue-50 to-indigo-100 border-indigo-200 text-indigo-700 shadow-2xs",
      badge: "bg-indigo-600 text-white font-bold border border-indigo-700 shadow-xs",
      chip: `Release ${versionLabel}`,
      versionLabel,
      emoji: "🚀",
      isSpecial: true,
      isAnnouncement: true,
    };
  }

  if (item.type === "role_assignment") {
    const isVip = item.title.toLowerCase().includes("vip");
    return {
      icon: isVip ? Sparkles : Crown,
      bg: isVip
        ? "bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-300 text-amber-700 shadow-2xs"
        : "bg-gradient-to-br from-purple-50 to-indigo-100 border-indigo-200 text-indigo-700 shadow-2xs",
      badge: isVip
        ? "bg-amber-100 text-amber-900 border border-amber-300"
        : "bg-indigo-100 text-indigo-900 border border-indigo-200",
      chip: isVip ? "Statut VIP" : "Attribution de Rôle",
      emoji: isVip ? "✨" : "👑",
      isSpecial: true,
      isAnnouncement: false,
    };
  }

  if (item.type === "achievement") {
    return {
      icon: Award,
      bg: "bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-300 text-emerald-700 shadow-2xs",
      badge: "bg-emerald-100 text-emerald-900 border border-emerald-300",
      chip: "Accomplissement",
      emoji: "🏆",
      isSpecial: false,
      isAnnouncement: false,
    };
  }

  return { ...getCheerMeta(item.cheer_type), chip: "Encouragement", isSpecial: false, isAnnouncement: false };
}

export function NotificationBell({ user }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [profileToViewId, setProfileToViewId] = useState<string | null>(null);
  const [initialProfileToView, setInitialProfileToView] = useState<any>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openStudentProfile = useCallback((senderId: string, senderName?: string | null, senderAvatar?: string | null) => {
    setProfileToViewId(senderId);
    setInitialProfileToView({
      id: senderId,
      displayName: senderName || "Étudiant IGL4",
      avatarUrl: senderAvatar || null,
      stats: { streak: 0, totalFocusedMinutes: 0, healthyTreesCount: 0, witheredTreesCount: 0, totalSessions: 0, speciesCount: 0 },
      trees: [],
      achievements: [],
      unlockedAchievementsCount: 0,
    });
    setIsOpen(false);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMyNotifications();
      setNotifications(data || []);
    } catch {
      // Offline fallback
    }
  }, [user]);

  // Initial fetch and automatic sync
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // 1. Refresh on tab focus
    const onFocus = () => {
      fetchNotifications();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    // 2. Efficient periodic sync (every 60s when tab is visible)
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 60000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(timer);
    };
  }, [user, fetchNotifications]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await markNotificationAsRead(id);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isLoading) return;
    setIsLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsAsRead();
    } catch {}
    setIsLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {}
  };

  const displayedList = useMemo(() => {
    return filterUnreadOnly
      ? (notifications || []).filter((n) => !n.is_read)
      : (notifications || []);
  }, [filterUnreadOnly, notifications]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? "bg-[#EDF2FF] border-[#2855D9]/40 text-[#2855D9] shadow-xs"
            : "border-[#E4E8F0] hover:border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#64748B]"
        }`}
        aria-label="Centre de notifications"
        title="Notifications et encouragements"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-[#2855D9] animate-pulse" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {/* Unread Pill Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#E11D48] text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
            <span className="absolute -inset-0.5 rounded-full bg-[#E11D48]/30 animate-ping -z-10" />
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-[#E4E8F0] rounded-2xl shadow-2xl p-0 z-50 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-b from-[#F8FAFC] to-white border-b border-[#E4E8F0] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-[#111A2E]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold">
                  {unreadCount} nouv.
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isLoading}
                  className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[#2855D9] hover:bg-[#EDF2FF] transition-colors cursor-pointer"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Tout lire</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter tabs if notifications exist */}
          {notifications.length > 0 && (
            <div className="px-3 py-1.5 bg-[#F8FAFC]/80 border-b border-[#F1F4F9] flex items-center justify-between text-[11px] text-[#64748B]">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setFilterUnreadOnly(false)}
                  className={`font-semibold cursor-pointer pb-0.5 ${
                    !filterUnreadOnly
                      ? "text-[#111A2E] border-b-2 border-[#2855D9]"
                      : "hover:text-[#182235]"
                  }`}
                >
                  Toutes ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterUnreadOnly(true)}
                  className={`font-semibold cursor-pointer pb-0.5 ${
                    filterUnreadOnly
                      ? "text-[#111A2E] border-b-2 border-[#2855D9]"
                      : "hover:text-[#182235]"
                  }`}
                >
                  Non lues ({unreadCount})
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-[#F1F4F9]">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="font-bold text-[#111A2E] text-sm">
                  {filterUnreadOnly
                    ? "Aucune notification non lue"
                    : "Votre fil est à jour"}
                </div>
                <p className="text-[#64748B] text-xs max-w-xs mx-auto leading-relaxed">
                  {filterUnreadOnly
                    ? "Vous avez consulté toutes vos interactions récentes."
                    : "Recevez les encouragements et les arrosages de bosquet de vos camarades d'IGL4 ici."}
                </p>
                <Link
                  href="/forest/community"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center space-x-1.5 mt-2 px-3 py-1.5 rounded-xl bg-[#2855D9] text-white font-semibold text-xs hover:bg-[#1E40AF] transition-colors"
                >
                  <span>Encourager un camarade</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              displayedList.map((item) => {
                const meta = getNotificationMeta(item);
                const IconComponent = meta.icon;
                const linkLabel =
                  item.type === "role_assignment" || item.type === "announcement"
                    ? item.link?.includes("admin")
                      ? "Accéder à l'administration"
                      : "Consulter mon espace"
                    : "Voir mon bosquet";

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.is_read) handleMarkAsRead(item.id);
                      if (item.type === "announcement" || item.id.startsWith("announcement-")) {
                        setSelectedAnnouncement({
                          id: item.id,
                          title: item.title,
                          content: item.content,
                          link: item.link,
                          created_at: item.created_at,
                          release_version: item.id.includes("v1-1") ? "v1.1" : undefined,
                        });
                        setIsOpen(false);
                      } else if (item.sender_id) {
                        openStudentProfile(item.sender_id, item.sender_name, item.sender_avatar_url);
                      }
                    }}
                    className={`p-3.5 transition-colors cursor-pointer group flex items-start space-x-3 ${
                      item.is_read
                        ? "bg-white hover:bg-[#F8FAFC]"
                        : meta.isAnnouncement
                        ? "bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white hover:bg-blue-50/90 border-l-3 border-indigo-600 shadow-2xs"
                        : meta.isSpecial
                        ? "bg-gradient-to-r from-amber-50/80 via-yellow-50/40 to-white hover:bg-amber-50/90 border-l-3 border-amber-500 shadow-2xs"
                        : "bg-[#F0F5FF]/60 hover:bg-[#F0F5FF] border-l-3 border-[#2855D9]"
                    }`}
                  >
                    {/* Icon or Avatar */}
                    <div
                      className="relative shrink-0 cursor-pointer"
                      onClick={(e) => {
                        if (item.sender_id) {
                          e.stopPropagation();
                          if (!item.is_read) handleMarkAsRead(item.id);
                          openStudentProfile(item.sender_id, item.sender_name, item.sender_avatar_url);
                        }
                      }}
                      title={item.sender_id ? "Consulter le profil de l'étudiant" : undefined}
                    >
                      {item.sender_avatar_url ? (
                        <img
                          src={item.sender_avatar_url}
                          alt={item.sender_name || "Expéditeur"}
                          className="w-9 h-9 rounded-xl object-cover border border-[#E4E8F0]"
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm ${meta.bg}`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-2xs",
                          meta.badge || "bg-emerald-100"
                        )}
                      >
                        <IconComponent className={cn("w-2.5 h-2.5", (meta as any).iconColor || "text-emerald-700")} />
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        {meta.isSpecial && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider ${meta.badge}`}
                          >
                            {meta.chip}
                          </span>
                        )}
                        <span
                          className={`font-bold truncate text-xs flex-1 ${
                            item.is_read ? "text-[#182235]" : "text-[#111A2E]"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] shrink-0">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-[#475569] leading-snug break-words">
                        {item.content}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        {meta.isAnnouncement ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!item.is_read) handleMarkAsRead(item.id);
                              const detectedVersion =
                                item.id.includes("v2") || item.title.includes("v2.0") || item.title.includes("V2")
                                  ? "v2.0"
                                  : item.id.includes("v1-3") || item.title.includes("v1.3")
                                  ? "v1.3"
                                  : item.id.includes("v1-2") || item.title.includes("v1.2")
                                  ? "v1.2"
                                  : "v1.1";

                              setSelectedAnnouncement({
                                id: item.id,
                                title: item.title,
                                content: item.content,
                                link: item.link,
                                created_at: item.created_at,
                                release_version: detectedVersion,
                              });
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                          >
                            <span>Consulter la note {(meta as any).versionLabel || "v2.0"}</span>
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                          </button>
                        ) : item.sender_id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!item.is_read) handleMarkAsRead(item.id);
                              openStudentProfile(item.sender_id || "", item.sender_name, item.sender_avatar_url);
                            }}
                            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#2855D9] hover:underline cursor-pointer"
                          >
                            <User className="w-3 h-3 text-[#2855D9]" />
                            <span>Voir le profil &amp; bosquet</span>
                          </button>
                        ) : item.link ? (
                          <Link
                            href={item.link}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!item.is_read) handleMarkAsRead(item.id);
                              setIsOpen(false);
                            }}
                            className={`inline-flex items-center space-x-1 text-[11px] font-semibold hover:underline ${
                              meta.isSpecial ? "text-amber-800" : "text-[#2855D9]"
                            }`}
                          >
                            <span>{linkLabel}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {!item.is_read && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              className="p-1 text-[#64748B] hover:text-[#2855D9] hover:bg-white rounded-md transition-colors"
                              title="Marquer comme lu"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-1 text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Supprimer la notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#F8FAFC] border-t border-[#E4E8F0] flex items-center justify-between text-[11px]">
            <Link
              href="/forest/community"
              onClick={() => setIsOpen(false)}
              className="text-[#64748B] hover:text-[#2855D9] font-medium transition-colors"
            >
              Bosquets des camarades
            </Link>
            <span className="text-[10px] text-[#94A3B8]">
              Validily Inter-Étudiants
            </span>
          </div>
        </div>
      )}

      {/* Public Student Profile Modal accessed from Notification click */}
      <StudentProfileModal
        studentId={profileToViewId}
        isOpen={Boolean(profileToViewId)}
        onClose={() => {
          setProfileToViewId(null);
          setInitialProfileToView(null);
        }}
        initialProfile={initialProfileToView}
      />

      {/* Global Release Announcement Modal */}
      <AnnouncementModal
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        announcement={selectedAnnouncement}
      />
    </div>
  );
}
