import type { ChatFolder, MutedProfileUntil, ProfileRow } from "@/shared/types";
import type { ReactNode } from "react";
import { useI18n } from "@/shared/i18n-context";
import { isProfileMuted } from "@/shared/utils/storage";
import { BellIcon, BlockIcon, TrashIcon } from "@/components/ui/icons";

type ChatContextMenuState = {
  left: number;
  profile: ProfileRow;
  top: number;
};

type ChatContextMenuProps = {
  blockedByMeProfileIds: string[];
  chatFolderAssignments: Record<string, string[]>;
  chatFolders: ChatFolder[];
  contextMenu: ChatContextMenuState | null;
  openCreateChatFolderDialog: (profile: ProfileRow) => void;
  toggleChatFolderFromMenu: (profile: ProfileRow, folderId: string) => void;
  archiveChatProfile: (profile: ProfileRow) => void;
  archivedProfileIds: string[];
  muteProfileNotifications: (profileUserId: string, durationMs: number | null) => void;
  mutedProfiles: MutedProfileUntil;
  pinnedChatProfileIds: string[];
  requestBlockChange: (profileUserId: string, targetLabel: string) => void;
  requestChatDeleteFromMenu: (profile: ProfileRow) => void;
  setChatContextMenu: (menu: ChatContextMenuState | null) => void;
  unmuteProfileNotifications: (profileUserId: string) => void;
  unarchiveChatProfile: (profile: ProfileRow) => void;
  togglePinnedChatProfile: (profile: ProfileRow) => void;
};

const muteOptions = [
  { durationMs: 30 * 60 * 1000, labelKey: "muteFor30Minutes" },
  { durationMs: 60 * 60 * 1000, labelKey: "muteFor1Hour" },
  { durationMs: 2 * 60 * 60 * 1000, labelKey: "muteFor2Hours" },
  { durationMs: 8 * 60 * 60 * 1000, labelKey: "muteFor8Hours" },
] as const;

export function ChatContextMenu({
  blockedByMeProfileIds,
  chatFolderAssignments,
  chatFolders,
  contextMenu,
  openCreateChatFolderDialog,
  toggleChatFolderFromMenu,
  archiveChatProfile,
  archivedProfileIds,
  muteProfileNotifications,
  mutedProfiles,
  pinnedChatProfileIds,
  requestBlockChange,
  requestChatDeleteFromMenu,
  setChatContextMenu,
  unmuteProfileNotifications,
  unarchiveChatProfile,
  togglePinnedChatProfile,
}: ChatContextMenuProps) {
  const { language, t } = useI18n();

  if (!contextMenu) {
    return null;
  }

  const { profile } = contextMenu;
  const isMuted = isProfileMuted(mutedProfiles, profile.user_id);
  const isArchived = archivedProfileIds.includes(profile.user_id);
  const isPinned = pinnedChatProfileIds.includes(profile.user_id);
  const assignedFolderIds = new Set(chatFolderAssignments[profile.user_id] ?? []);

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[80] cursor-default bg-transparent"
        onClick={() => setChatContextMenu(null)}
        onContextMenu={(event) => {
          event.preventDefault();
          setChatContextMenu(null);
        }}
        type="button"
      />
      <div
        className="hush-context-menu fixed z-[90] w-[min(286px,calc(100vw-24px))] overflow-visible rounded-xl border border-white/10 bg-[#18181b]/98 py-1 text-[#f4f4f5] shadow-[0_22px_70px_rgba(0,0,0,0.58)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        style={{ left: contextMenu.left, top: contextMenu.top }}
      >
        <p className="truncate px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#a1a1aa]">
          {t("chatWith")} {profile.display_name}
        </p>
        <MenuButton
          icon={isPinned ? <PinOffIcon /> : <PinIcon />}
          onClick={() => togglePinnedChatProfile(profile)}
        >
          {isPinned
            ? language === "en" ? "Unpin" : "Открепить"
            : language === "en" ? "Pin" : "Закрепить"}
        </MenuButton>
        <MenuButton
          icon={<ArchiveIcon />}
          onClick={() => {
            if (isArchived) {
              unarchiveChatProfile(profile);
            } else {
              archiveChatProfile(profile);
            }
          }}
        >
          {isArchived
            ? language === "en" ? "Return from archive" : "Вернуть из архива"
            : t("archive")}
        </MenuButton>
        <div className="group relative">
          <button
            className="flex min-h-8 w-full items-center gap-2.5 px-3.5 text-left text-sm font-medium transition hover:bg-white/10"
            type="button"
          >
            <FolderIcon />
            <span className="min-w-0 flex-1">{t("addToFolder")}</span>
            <ChevronIcon />
          </button>
          <div className="hush-context-menu invisible absolute left-full top-0 z-[91] w-[220px] rounded-xl border border-white/10 bg-[#18181b]/98 py-1 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.58)] transition group-hover:visible group-hover:opacity-100">
            <SubMenuButton onClick={() => openCreateChatFolderDialog(profile)}>
              <span className="grid h-5 w-5 place-items-center">+</span>
              {t("newFolder")}
            </SubMenuButton>
            {chatFolders.length > 0 ? (
              chatFolders.map((folder) => {
                const isAssigned = assignedFolderIds.has(folder.id);

                return (
                  <SubMenuButton
                    ariaPressed={isAssigned}
                    key={folder.id}
                    onClick={() => toggleChatFolderFromMenu(profile, folder.id)}
                  >
                    {isAssigned ? <CheckIcon /> : <FolderIcon />}
                    <span className="min-w-0 truncate">{folder.name}</span>
                  </SubMenuButton>
                );
              })
            ) : (
              <p className="px-3.5 py-1.5 text-xs font-medium text-[#a1a1aa]">
                {t("foldersEmpty")}
              </p>
            )}
          </div>
        </div>
        <MenuButton
          icon={<BlockIcon />}
          onClick={() => {
            requestBlockChange(
              profile.user_id,
              profile.username ? `@${profile.username}` : profile.display_name,
            );
            setChatContextMenu(null);
          }}
        >
          {blockedByMeProfileIds.includes(profile.user_id) ? t("unblockUser") : t("blockUser")}
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
              {t("enableNotifications")}
            </MenuButton>
          ) : (
            <>
              <button
                className="flex min-h-8 w-full items-center gap-2.5 px-3.5 text-left text-sm font-medium transition hover:bg-white/10"
                type="button"
              >
                <BellIcon />
                <span className="min-w-0 flex-1">{t("hideNotifications")}</span>
                <ChevronIcon />
              </button>
              <div className="hush-context-menu invisible absolute left-full top-0 z-[91] w-[260px] rounded-xl border border-white/10 bg-[#18181b]/98 py-1 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.58)] transition group-hover:visible group-hover:opacity-100">
                {muteOptions.map((option) => (
                  <SubMenuButton
                    key={option.labelKey}
                    onClick={() => {
                      muteProfileNotifications(profile.user_id, option.durationMs);
                      setChatContextMenu(null);
                    }}
                  >
                    {t(option.labelKey)}
                  </SubMenuButton>
                ))}
                <SubMenuButton
                  danger
                  onClick={() => {
                    muteProfileNotifications(profile.user_id, null);
                    setChatContextMenu(null);
                  }}
                >
                  {t("muteForever")}
                </SubMenuButton>
              </div>
            </>
          )}
        </div>
        <MenuButton danger icon={<TrashIcon />} onClick={() => requestChatDeleteFromMenu(profile)}>
          {t("deleteChat")}
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
      className={`flex min-h-8 w-full items-center gap-2.5 px-3.5 text-left text-sm font-medium transition ${
        danger ? "text-[#f4f4f5] hover:bg-white/10" : "hover:bg-white/10"
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
  ariaPressed,
  children,
  danger = false,
  onClick,
}: {
  ariaPressed?: boolean;
  children: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={ariaPressed}
      className={`flex min-h-8 w-full items-center gap-2.5 px-3.5 text-left text-sm font-medium transition ${
        danger ? "text-[#f4f4f5] hover:bg-white/10" : "hover:bg-white/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function CheckIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function PinIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M12 17v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function PinOffIcon() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24"><path d="M12 17v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="m2 2 20 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
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

