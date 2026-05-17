import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import type { CallStatus, MutedProfileUntil } from "@/shared/types";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";
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
  { durationMs: 30 * 60 * 1000, label: "Выключить на 30 минут" },
  { durationMs: 60 * 60 * 1000, label: "Выключить на 1 час" },
  { durationMs: 2 * 60 * 60 * 1000, label: "Выключить на 2 часа" },
  { durationMs: 8 * 60 * 60 * 1000, label: "Выключить на 8 часов" },
  { durationMs: null, label: "Отключить уведомления" },
];

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
        aria-label="Закрыть профиль"
        className="fixed inset-0 z-[95] bg-black/62 backdrop-blur-md"
        onClick={onClose}
        type="button"
      />
      <section className="fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[#3f3f46]/50 bg-[#101010]/96 p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              aria-label="Открыть аватар"
              className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[24px] bg-[#f4f4f5] text-base font-medium text-[#050505] shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition hover:scale-[1.03] disabled:cursor-default disabled:hover:scale-100 sm:h-24 sm:w-24"
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
                  alt="Аватар профиля"
                  className="h-full w-full object-cover"
                  src={viewedProfile.avatarUrl}
                />
              ) : (
                viewedProfile.name[0]?.toUpperCase()
              )}
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a1a1aa]">
                Профиль
              </p>
              <h2 className="mt-1 truncate text-base font-medium leading-none text-[#f4f4f5] sm:text-base">
                {viewedProfile.name}
              </h2>
              <p className="mt-2 truncate text-sm font-medium text-[#a1a1aa]">
                {viewedProfile.username ? `@${viewedProfile.username}` : "@ник пока не выбран"}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]" />
                {formatLastSeen(viewedProfile.updatedAt)}
              </div>
            </div>
          </div>
          <button
            aria-label="Закрыть профиль"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-white/[0.03] text-[#d4d4d8] transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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

        <div className="mt-5 grid grid-cols-4 gap-2">
          <button
            aria-label="Открыть чат"
            className="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#3f3f46]/40 bg-black/24 text-center text-[#f4f4f5] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
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
            <span className="text-xs font-medium leading-none text-[#d4d4d8]">Чат</span>
          </button>
          <button
            aria-label="Позвонить"
            className="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#3f3f46]/40 bg-black/24 text-center text-[#f4f4f5] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
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
            <span className="text-xs font-medium leading-none text-[#d4d4d8]">Телефон</span>
          </button>
          <div className="relative">
            <button
              aria-expanded={profileNotificationMenuUserId === viewedProfile.userId}
              aria-label="Уведомления"
              className={`flex min-h-[74px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border text-center transition disabled:cursor-not-allowed disabled:opacity-45 ${
                isMuted
                  ? "border-amber-300/35 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
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
                {isMuted ? "Без звука" : "Уведомл."}
              </span>
            </button>
            {profileNotificationMenuUserId === viewedProfile.userId && viewedProfile.userId ? (
              <>
                <button
                  aria-label="Закрыть меню уведомлений"
                  className="fixed inset-0 z-[105] cursor-default bg-transparent"
                  onClick={() => setProfileNotificationMenuUserId(null)}
                  type="button"
                />
                <div className="absolute left-1/2 top-[calc(100%+8px)] z-[110] w-64 -translate-x-1/2 rounded-2xl border border-[#3f3f46]/55 bg-[#171717]/98 p-1.5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  {isMuted ? (
                    <button
                      className="min-h-10 w-full rounded-xl px-3 text-left text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/10"
                      onClick={() => unmuteProfileNotifications(viewedProfile.userId!)}
                      type="button"
                    >
                      Включить уведомления
                    </button>
                  ) : (
                    muteOptions.map((option) => (
                      <button
                        className="min-h-10 w-full whitespace-nowrap rounded-xl px-3 text-left text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
                        key={option.label}
                        onClick={() =>
                          viewedProfile.userId
                            ? muteProfileNotifications(viewedProfile.userId, option.durationMs)
                            : undefined
                        }
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
          <button
            aria-label="Заблокировать"
            className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border text-center transition disabled:cursor-not-allowed disabled:opacity-45 ${
              isBlockedByMe
                ? "border-red-300/45 bg-red-500/12 text-red-100 hover:bg-red-500/18"
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
              {isBlockedByMe ? "Разблок" : "Блок"}
            </span>
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <article className="rounded-3xl border border-[#3f3f46]/40 bg-black/22 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e5e5e5]">
              О себе
            </p>
            <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
              Пока ничего не написал о себе.
            </p>
          </article>

          <article className="rounded-3xl border border-[#3f3f46]/40 bg-black/22 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e5e5e5]">
              Телефон
            </p>
            <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
              Скрыт настройками приватности. Позже добавим показ только с разрешения пользователя.
            </p>
          </article>

          <article className="rounded-3xl border border-[#3f3f46]/40 bg-black/22 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e5e5e5]">
              Общие данные
            </p>
            <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
              Общие чаты и группы появятся здесь позже.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
