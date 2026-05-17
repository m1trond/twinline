import type { ProfileRow } from "@/shared/types";
import type { MutedProfileUntil } from "@/shared/types";
import type { ReactNode } from "react";
import { isProfileMuted } from "@/shared/utils/storage";

type ChatContextMenuState = {
  left: number;
  profile: ProfileRow;
  top: number;
};

type ChatContextMenuProps = {
  blockedByMeProfileIds: string[];
  contextMenu: ChatContextMenuState | null;
  muteProfileNotifications: (profileUserId: string, durationMs: number | null) => void;
  mutedProfiles: MutedProfileUntil;
  requestBlockChange: (profileUserId: string, targetLabel: string) => void;
  requestChatDeleteFromMenu: (profile: ProfileRow) => void;
  runChatMenuStub: (message: string) => void;
  setChatContextMenu: (menu: ChatContextMenuState | null) => void;
  unmuteProfileNotifications: (profileUserId: string) => void;
};

const muteOptions = [
  { durationMs: 30 * 60 * 1000, label: "Выключить на 30 минут" },
  { durationMs: 60 * 60 * 1000, label: "Выключить на 1 час" },
  { durationMs: 2 * 60 * 60 * 1000, label: "Выключить на 2 часа" },
  { durationMs: 8 * 60 * 60 * 1000, label: "Выключить на 8 часов" },
];

export function ChatContextMenu({
  blockedByMeProfileIds,
  contextMenu,
  muteProfileNotifications,
  mutedProfiles,
  requestBlockChange,
  requestChatDeleteFromMenu,
  runChatMenuStub,
  setChatContextMenu,
  unmuteProfileNotifications,
}: ChatContextMenuProps) {
  if (!contextMenu) {
    return null;
  }

  const { profile } = contextMenu;
  const isMuted = isProfileMuted(mutedProfiles, profile.user_id);

  return (
    <>
      <button
        aria-label="Закрыть меню чата"
        className="fixed inset-0 z-[80] cursor-default bg-transparent"
        onClick={() => setChatContextMenu(null)}
        onContextMenu={(event) => {
          event.preventDefault();
          setChatContextMenu(null);
        }}
        type="button"
      />
      <div
        className="hush-context-menu fixed z-[90] w-[min(286px,calc(100vw-24px))] overflow-visible rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 text-[#f4f4f5] shadow-[0_22px_70px_rgba(0,0,0,0.58)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        style={{ left: contextMenu.left, top: contextMenu.top }}
      >
        <p className="truncate px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[#a1a1aa]">
          Чат с {profile.display_name}
        </p>
        <MenuButton icon={<ArchiveIcon />} onClick={() => runChatMenuStub("Архив скоро подключим.")}>
          В архив
        </MenuButton>
        <div className="group relative">
          <button
            className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition hover:bg-white/10"
            type="button"
          >
            <FolderIcon />
            <span className="min-w-0 flex-1">Добавить в папку</span>
            <ChevronIcon />
          </button>
          <div className="hush-context-menu invisible absolute left-full top-0 z-[91] w-[220px] rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.58)] transition group-hover:visible group-hover:opacity-100">
            <SubMenuButton onClick={() => runChatMenuStub("Создание папок скоро подключим.")}>
              <span className="grid h-5 w-5 place-items-center">+</span>
              Новая папка
            </SubMenuButton>
            <SubMenuButton onClick={() => runChatMenuStub("Папки скоро подключим.")}>
              <span className="grid h-5 w-5 place-items-center">#</span>
              Выбрать папку
            </SubMenuButton>
          </div>
        </div>
        <MenuButton
          icon={<BanIcon />}
          onClick={() => {
            requestBlockChange(
              profile.user_id,
              profile.username ? `@${profile.username}` : profile.display_name,
            );
            setChatContextMenu(null);
          }}
        >
          {blockedByMeProfileIds.includes(profile.user_id) ? "Разблокировать" : "Заблокировать"}
        </MenuButton>
        <div className="group relative">
          {isMuted ? (
            <MenuButton
              icon={<BellIcon />}
              onClick={() => {
                unmuteProfileNotifications(profile.user_id);
                setChatContextMenu(null);
              }}
            >
              Включить уведомления
            </MenuButton>
          ) : (
            <>
              <button
                className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition hover:bg-white/10"
                type="button"
              >
                <BellIcon />
                <span className="min-w-0 flex-1">Выключить уведомления</span>
                <ChevronIcon />
              </button>
              <div className="hush-context-menu invisible absolute left-full top-0 z-[91] w-[260px] rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.58)] transition group-hover:visible group-hover:opacity-100">
                {muteOptions.map((option) => (
                  <SubMenuButton
                    key={option.label}
                    onClick={() => {
                      muteProfileNotifications(profile.user_id, option.durationMs);
                      setChatContextMenu(null);
                    }}
                  >
                    {option.label}
                  </SubMenuButton>
                ))}
                <SubMenuButton
                  danger
                  onClick={() => {
                    muteProfileNotifications(profile.user_id, null);
                    setChatContextMenu(null);
                  }}
                >
                  Отключить уведомления
                </SubMenuButton>
              </div>
            </>
          )}
        </div>
        <MenuButton danger icon={<TrashIcon />} onClick={() => requestChatDeleteFromMenu(profile)}>
          Удалить чат
        </MenuButton>
      </div>
    </>
  );
}

function MenuButton({
  children,
  danger = false,
  icon,
  onClick,
}: {
  children: string;
  danger?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition ${
        danger ? "text-red-100 hover:bg-red-500/18" : "hover:bg-white/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function SubMenuButton({
  children,
  danger = false,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition ${
        danger ? "text-red-100 hover:bg-red-500/18" : "hover:bg-white/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ArchiveIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><circle cx="15" cy="19" r="2" stroke="currentColor" strokeWidth="2" /><path d="M20.9 19.8A2 2 0 0 0 22 18V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h5.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M15 11v-1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M15 17v-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function FolderIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function ChevronIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function BanIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M4.929 4.929 19.07 19.071" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function BellIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M10.268 21a2 2 0 0 0 3.464 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function TrashIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
