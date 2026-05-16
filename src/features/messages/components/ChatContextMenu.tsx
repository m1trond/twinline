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
          <div className="hush-context-menu invisible absolute left-[calc(100%-6px)] top-0 z-[91] w-[220px] rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.58)] transition group-hover:visible group-hover:opacity-100">
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
          icon={<LockIcon />}
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
              icon={<VolumeIcon />}
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
                <MuteIcon />
                <span className="min-w-0 flex-1">Выключить уведомления</span>
                <ChevronIcon />
              </button>
              <div className="hush-context-menu invisible absolute left-[calc(100%-6px)] top-0 z-[91] w-[260px] rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.58)] transition group-hover:visible group-hover:opacity-100">
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
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M4 7h16v13H4V7ZM7 4h10l3 3H4l3-3ZM9 12h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function FolderIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function ChevronIcon() {
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function LockIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M18 11v8H6v-8M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function VolumeIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M5 9v6h4l5 4V5L9 9H5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M18 9a5 5 0 0 1 0 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function MuteIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M5 9v6h4l5 4V5L9 9H5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="m19 9-4 4M15 9l4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function TrashIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
