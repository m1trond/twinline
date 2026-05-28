import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import type { CallStatus, MutedProfileUntil } from "@/shared/types";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";
import { useI18n } from "@/shared/i18n-context";
import { formatLastSeen } from "@/shared/utils/profile";
import { isProfileMuted } from "@/shared/utils/storage";

type ViewedProfileModalProps = {
  blockedByMeProfileIds: string[];
  blockedProfileIds: string[];
  callStatus: CallStatus;
  mutedProfiles: MutedProfileUntil;
  onClose: () => void;
  openProfileAvatarGallery: (profile: ViewedProfileState) => void | Promise<void>;
  profileNotificationMenuUserId: string | null;
  requestBlockChange: (profileUserId: string, targetLabel: string) => void;
  setActiveView: (view: "messages") => void;
  setProfileNotificationMenuUserId: Dispatch<SetStateAction<string | null>>;
  setSelectedChatUserId: (userId: string) => void;
  startCall: (receiverId: string) => void | Promise<void>;
  user: User | null;
  viewedProfile: ViewedProfileState | null;
  muteProfileNotifications: (profileUserId: string, durationMs: number | null) => void;
  unmuteProfileNotifications: (profileUserId: string) => void;
};

const muteOptions = [
  { durationMs: 30 * 60 * 1000, labelKey: "muteFor30Minutes" },
  { durationMs: 60 * 60 * 1000, labelKey: "muteFor1Hour" },
  { durationMs: 2 * 60 * 60 * 1000, labelKey: "muteFor2Hours" },
  { durationMs: 8 * 60 * 60 * 1000, labelKey: "muteFor8Hours" },
  { durationMs: null, labelKey: "muteForever" },
] as const;

export function ViewedProfileModal({
  blockedByMeProfileIds,
  blockedProfileIds,
  callStatus,
  mutedProfiles,
  onClose,
  openProfileAvatarGallery,
  profileNotificationMenuUserId,
  requestBlockChange,
  setActiveView,
  setProfileNotificationMenuUserId,
  setSelectedChatUserId,
  startCall,
  user,
  viewedProfile,
  muteProfileNotifications,
  unmuteProfileNotifications,
}: ViewedProfileModalProps) {
  const { language, t } = useI18n();

  if (!viewedProfile) {
    return null;
  }

  const isSelf = viewedProfile.userId === user?.id;
  const isBlocked = Boolean(viewedProfile.userId && blockedProfileIds.includes(viewedProfile.userId));
  const isBlockedByMe = Boolean(
    viewedProfile.userId && blockedByMeProfileIds.includes(viewedProfile.userId),
  );
  const isMuted = Boolean(
    viewedProfile.userId && isProfileMuted(mutedProfiles, viewedProfile.userId),
  );
  const canUseProfileActions = Boolean(viewedProfile.userId && !isSelf);
  const canOpenChat = canUseProfileActions && !isBlocked;
  const canCall = canOpenChat && callStatus === "idle";
  const profileBio =
    viewedProfile.bio?.trim() ||
    (language === "en"
      ? "The user has not added anything about themselves."
      : "Пользователь ничего о себе не указывал");

  const openChat = () => {
    if (!viewedProfile.userId || isSelf) {
      return;
    }

    setSelectedChatUserId(viewedProfile.userId);
    setActiveView("messages");
    onClose();
  };

  return (
    <>
      <button
        aria-label={language === "en" ? "Close profile" : "Закрыть профиль"}
        className="fixed inset-0 z-[95] bg-black/62 backdrop-blur-md"
        onClick={onClose}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/50 bg-[#101010]/96 p-3 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl sm:p-4">
        <div className="relative">
          <div className="grid min-w-0 place-items-center text-center">
            <button
              aria-label={language === "en" ? "Open avatar" : "Открыть аватар"}
              className="hush-avatar grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-base font-medium text-[#050505] shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition hover:scale-[1.03] disabled:cursor-default disabled:hover:scale-100"
              disabled={!viewedProfile.avatarUrl}
              onClick={() => {
                if (viewedProfile.avatarUrl) {
                  void openProfileAvatarGallery(viewedProfile);
                }
              }}
              type="button"
            >
              {viewedProfile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={t("avatarAlt")}
                  className="h-full w-full object-cover"
                  src={viewedProfile.avatarUrl}
                />
              ) : (
                viewedProfile.name[0]?.toUpperCase()
              )}
            </button>
            <div className="mt-3 min-w-0">
              <h2 className="truncate text-base font-medium leading-tight text-[#f4f4f5]">
                {viewedProfile.name}
              </h2>
              <p className="mt-1 truncate text-sm font-medium text-[#a1a1aa]">
                {viewedProfile.username ? `@${viewedProfile.username}` : t("nicknameNotSet")}
              </p>
              <div className="mt-1.5 text-xs font-medium leading-none text-[#a1a1aa]">
                {formatLastSeen(viewedProfile.updatedAt, language)}
              </div>
            </div>
          </div>
          <button
            aria-label={language === "en" ? "Close profile" : "Закрыть профиль"}
            className="absolute right-0 top-0 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/45 bg-white/[0.03] text-[#d4d4d8] transition hover:bg-white/10 hover:text-[#f4f4f5]"
            onClick={onClose}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          <button
            aria-label={language === "en" ? "Open chat" : "Открыть чат"}
            className="flex min-h-[52px] flex-col items-center justify-center gap-1.5 rounded-lg border border-[#3f3f46]/40 bg-black/24 text-center text-[#f4f4f5] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canOpenChat}
            onClick={openChat}
            type="button"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span className="text-xs font-medium leading-none text-[#d4d4d8]">
              {language === "en" ? "Chat" : "Чат"}
            </span>
          </button>
          <button
            aria-label={language === "en" ? "Call" : "Позвонить"}
            className="flex min-h-[52px] flex-col items-center justify-center gap-1.5 rounded-lg border border-[#3f3f46]/40 bg-black/24 text-center text-[#f4f4f5] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canCall}
            onClick={() => {
              openChat();

              if (viewedProfile.userId) {
                void startCall(viewedProfile.userId);
              }
            }}
            type="button"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span className="text-xs font-medium leading-none text-[#d4d4d8]">{t("call")}</span>
          </button>
          <div className="relative">
            <button
              aria-expanded={profileNotificationMenuUserId === viewedProfile.userId}
              aria-label={t("notifications")}
              className={`flex min-h-[52px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border text-center transition disabled:cursor-not-allowed disabled:opacity-45 ${
                isMuted
                  ? "border-[#f4f4f5]/45 bg-[#f4f4f5]/10 text-[#f4f4f5] hover:bg-white/[0.12]"
                  : "border-[#3f3f46]/40 bg-black/24 text-[#f4f4f5] hover:bg-white/[0.08]"
              }`}
              disabled={!canUseProfileActions}
              onClick={() => {
                if (!viewedProfile.userId || isSelf) {
                  return;
                }

                setProfileNotificationMenuUserId((currentUserId) =>
                  currentUserId === viewedProfile.userId ? null : viewedProfile.userId,
                );
              }}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="M10.268 21a2 2 0 0 0 3.464 0"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <span className="text-xs font-medium leading-none text-[#d4d4d8]">
                {isMuted
                  ? language === "en" ? "Muted" : "Без звука"
                  : language === "en" ? "Notify" : "Уведомл."}
              </span>
            </button>
            {profileNotificationMenuUserId === viewedProfile.userId && viewedProfile.userId ? (
              <>
                <button
                  aria-label={language === "en" ? "Close notifications menu" : "Закрыть меню уведомлений"}
                  className="fixed inset-0 z-[105] cursor-default bg-transparent"
                  onClick={() => setProfileNotificationMenuUserId(null)}
                  type="button"
                />
                <div className="absolute left-1/2 top-[calc(100%+8px)] z-[110] w-60 -translate-x-1/2 rounded-lg border border-[#3f3f46]/55 bg-[#171717]/98 p-1 text-left shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  {isMuted ? (
                    <button
                      className="min-h-8 w-full rounded-lg px-3 text-left text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
                      onClick={() => unmuteProfileNotifications(viewedProfile.userId!)}
                      type="button"
                    >
                      {language === "en" ? "Enable notifications" : "Включить уведомления"}
                    </button>
                  ) : (
                    muteOptions.map((option) => (
                      <button
                        className="min-h-8 w-full whitespace-nowrap rounded-lg px-3 text-left text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
                        key={option.labelKey}
                        onClick={() =>
                          viewedProfile.userId
                            ? muteProfileNotifications(viewedProfile.userId, option.durationMs)
                            : undefined
                        }
                        type="button"
                      >
                        {t(option.labelKey)}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
          <button
            aria-label={language === "en" ? "Block" : "Заблокировать"}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1.5 rounded-lg border text-center transition disabled:cursor-not-allowed disabled:opacity-45 ${
              isBlockedByMe
                ? "border-[#f4f4f5]/45 bg-[#f4f4f5]/10 text-[#f4f4f5] hover:bg-white/[0.12]"
                : "border-[#3f3f46]/40 bg-black/24 text-[#f4f4f5] hover:bg-white/[0.08]"
            }`}
            disabled={!canUseProfileActions}
            onClick={() => {
              if (!viewedProfile.userId || isSelf) {
                return;
              }

              requestBlockChange(
                viewedProfile.userId,
                viewedProfile.username ? `@${viewedProfile.username}` : viewedProfile.name,
              );
            }}
            type="button"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="M4.929 4.929 19.07 19.071"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-xs font-medium leading-none text-[#d4d4d8]">
              {isBlockedByMe
                ? language === "en" ? "Unblock" : "Разблок"
                : language === "en" ? "Block" : "Блок"}
            </span>
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          <article className="rounded-xl border border-[#3f3f46]/40 bg-black/22 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e5e5e5]">
              {t("bio")}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-5 text-[#a1a1aa]">
              {profileBio}
            </p>
          </article>


          <article className="rounded-xl border border-[#3f3f46]/40 bg-black/22 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e5e5e5]">
              {language === "en" ? "Shared data" : "Общие данные"}
            </p>
            <p className="mt-1.5 text-sm leading-5 text-[#a1a1aa]">
              {language === "en"
                ? "Shared chats and groups will appear here later."
                : "Общие чаты и группы появятся здесь позже."}
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
