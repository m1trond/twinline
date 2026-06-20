import type { DragEvent, MouseEvent } from "react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useI18n } from "@/shared/i18n-context";
import { archivedChatFolderId } from "@/shared/constants";
import type { ChatFolder, MessageRow, ProfileRow } from "@/shared/types";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";
import { formatMessageTime } from "@/shared/utils/format";
import { getChatPreviewText } from "@/shared/utils/messages";
import { isProfileOnline } from "@/shared/utils/profile";

type ChatListViewProps = {
  allFolderName: string;
  chatFolders: ChatFolder[];
  chatProfiles: ProfileRow[];
  isLoadingChats: boolean;
  latestVisibleMessageByProfileId: Map<string, MessageRow>;
  openFolderContextMenu: (
    event: MouseEvent<HTMLElement>,
    folder: ChatFolder | null,
  ) => void;
  openChatContextMenu: (event: MouseEvent<HTMLElement>, profile: ProfileRow) => void;
  openCreateChatFolderDialog: () => void;
  pinnedChatProfileIds: string[];
  reorderChatFolders: (draggedFolderId: string, targetFolderId: string) => void;
  selectedChatFolderId: string | null;
  setSelectedChatFolderId: (folderId: string | null) => void;
  setSelectedChatUserId: (userId: string) => void;
  setViewedProfile: (profile: ViewedProfileState | null) => void;
  unreadMessagesByUserId: Map<string, number>;
};

export function ChatListView({
  allFolderName,
  chatFolders,
  chatProfiles,
  isLoadingChats,
  latestVisibleMessageByProfileId,
  openFolderContextMenu,
  openChatContextMenu,
  openCreateChatFolderDialog,
  pinnedChatProfileIds,
  reorderChatFolders,
  selectedChatFolderId,
  setSelectedChatFolderId,
  setSelectedChatUserId,
  setViewedProfile,
  unreadMessagesByUserId,
}: ChatListViewProps) {
  const { t } = useI18n();
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const pinnedChatProfileIdSet = new Set(pinnedChatProfileIds);

  function dropFolder(event: DragEvent<HTMLButtonElement>, targetFolderId: string) {
    event.preventDefault();

    if (!draggedFolderId || draggedFolderId === targetFolderId) {
      setDraggedFolderId(null);
      return;
    }

    reorderChatFolders(draggedFolderId, targetFolderId);
    setDraggedFolderId(null);
  }

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-9 min-h-9 items-center rounded-lg border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-0 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-4">
        <h2 className="text-base font-medium leading-none sm:text-base">{t("messages")}</h2>
      </div>

      <div className="scrollbar-hidden grid min-h-0 flex-1 content-start gap-2 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
        <div className="scrollbar-hidden mb-1 flex gap-1.5 overflow-x-auto pb-1">
          <FolderFilterButton
            isActive={selectedChatFolderId === archivedChatFolderId}
            onClick={() => setSelectedChatFolderId(archivedChatFolderId)}
            onContextMenu={(event) => event.preventDefault()}
          >
            {t("archive")}
          </FolderFilterButton>
          <span
            aria-hidden="true"
            className="mx-1.5 h-4 w-px shrink-0 self-center rounded-full bg-[#f4f4f5]/35"
          />
          <FolderFilterButton
            isActive={selectedChatFolderId === null}
            onClick={() => setSelectedChatFolderId(null)}
            onContextMenu={(event) => event.preventDefault()}
          >
            {allFolderName}
          </FolderFilterButton>
          {chatFolders.map((folder) => (
            <FolderFilterButton
              color={folder.color}
              draggable
              isActive={selectedChatFolderId === folder.id}
              key={folder.id}
              onClick={() => setSelectedChatFolderId(folder.id)}
              onContextMenu={(event) => openFolderContextMenu(event, folder)}
              onDragEnd={() => setDraggedFolderId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/x-hush-folder", folder.id);
                setDraggedFolderId(folder.id);
              }}
              onDrop={(event) => dropFolder(event, folder.id)}
            >
              {folder.name}
            </FolderFilterButton>
          ))}
          <button
            aria-label={t("newFolder")}
            className="hush-stable-button grid h-8 min-h-8 w-8 shrink-0 place-items-center rounded-lg text-[#a1a1aa] transition hover:bg-[#f4f4f5]/8 hover:text-[#f4f4f5]"
            onClick={openCreateChatFolderDialog}
            title={t("newFolder")}
            type="button"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <path d="M5 12h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M12 5v14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>
        <div className="hush-panel-transition grid content-start gap-2" key={selectedChatFolderId ?? "all"}>
          {isLoadingChats ? (
            <article className="rounded-lg border border-dashed border-[#3f3f46]/40 bg-black/12 px-3 py-3 text-center">
              <p className="text-sm font-medium leading-5">Загружаю чаты...</p>
            </article>
          ) : null}

          {!isLoadingChats && chatProfiles.length === 0 ? (
            <article className="rounded-lg border border-dashed border-[#3f3f46]/40 bg-black/12 px-3 py-3 text-center">
              <p className="text-sm font-medium leading-5">{t("emptyChatsTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-[#a1a1aa]">{t("emptyChatsText")}</p>
            </article>
          ) : null}

          {!isLoadingChats && chatProfiles.map((profile) => {
            const latestProfileMessage = latestVisibleMessageByProfileId.get(profile.user_id);
            const profileUnreadCount = unreadMessagesByUserId.get(profile.user_id) ?? 0;
            const isPinnedChat = pinnedChatProfileIdSet.has(profile.user_id);
            const previewText = latestProfileMessage
              ? getChatPreviewText(latestProfileMessage.text)
              : t("openChat");

            return (
              <button
                className={`hush-chat-list-row flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left sm:gap-3 sm:rounded-2xl sm:p-3 ${
                  profileUnreadCount > 0
                    ? "border-[#f4f4f5]/20 bg-[#f4f4f5]/10"
                    : "border-transparent bg-[#050505]/52"
                }`}
                key={profile.user_id}
                onClick={() => {
                  setSelectedChatUserId(profile.user_id);
                }}
                onContextMenu={(event) => openChatContextMenu(event, profile)}
                type="button"
              >
                <div
                  className="relative h-10 w-10 shrink-0 cursor-pointer sm:h-12 sm:w-12"
                  onClick={(event) => {
                    event.stopPropagation();
                    setViewedProfile({
                      avatarUrl: profile.avatar_url,
                      bio: profile.bio,
                      name: profile.display_name,
                      username: profile.username,
                      updatedAt: profile.updated_at,
                      userId: profile.user_id,
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    setViewedProfile({
                      avatarUrl: profile.avatar_url,
                      bio: profile.bio,
                      name: profile.display_name,
                      username: profile.username,
                      updatedAt: profile.updated_at,
                      userId: profile.user_id,
                    });
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <Avatar
                    alt={`${t("avatarAlt")} ${profile.display_name}`}
                    className="h-full w-full text-sm sm:text-sm"
                    name={profile.display_name}
                    src={profile.avatar_url}
                  />
                  {isProfileOnline(profile.updated_at) ? (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#050505] bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)] sm:h-3.5 sm:w-3.5" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {isPinnedChat ? <PinIcon /> : null}
                      <p className="truncate text-sm font-medium text-[#f4f4f5] sm:text-sm">
                        {profile.display_name}
                      </p>
                    </div>
                    {latestProfileMessage ? (
                      <span className="shrink-0 text-xs font-medium text-[#a1a1aa] sm:text-xs">
                        {formatMessageTime(latestProfileMessage.created_at)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p
                      className={`truncate text-xs sm:text-sm ${
                        profileUnreadCount > 0 ? "font-medium text-[#f4f4f5]" : "text-[#a1a1aa]"
                      }`}
                    >
                      {previewText}
                    </p>
                    {profileUnreadCount > 0 ? (
                      <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-[#f4f4f5] px-2 text-xs font-medium text-[#050505]">
                        {profileUnreadCount > 99 ? "99+" : profileUnreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-[#d4d4d8]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 17v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function FolderFilterButton({
  children,
  color,
  draggable = false,
  isActive,
  onClick,
  onContextMenu,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
}: {
  children: string;
  color?: string;
  draggable?: boolean;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  onDragOver?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop?: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  const coloredStyle = color
    ? {
        backgroundColor: isActive ? color : "transparent",
        borderColor: color,
        color: isActive ? "#050505" : "#f4f4f5",
      }
    : undefined;

  return (
    <button
      className={`hush-stable-button inline-flex min-h-8 shrink-0 cursor-pointer items-center rounded-lg border px-3 text-xs font-medium transition ${
        color
          ? "border-2 hover:bg-[#f4f4f5]/8"
          : isActive
            ? "border-[#f4f4f5]/60 bg-[#f4f4f5] text-[#050505]"
            : "border-[#3f3f46]/35 bg-[#f4f4f5]/10 text-[#f4f4f5] hover:bg-[#f4f4f5]/18"
      }`}
      draggable={draggable}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
      style={coloredStyle}
      type="button"
    >
      {children}
    </button>
  );
}
