import type { DragEvent, MouseEvent } from "react";
import { useState } from "react";
import { useI18n } from "@/shared/i18n-context";
import { archivedChatFolderId } from "@/shared/constants";
import type { ChatFolder, MessageRow, ProfileRow } from "@/shared/types";
import { formatMessageTime } from "@/shared/utils/format";
import { getChatPreviewText } from "@/shared/utils/messages";
import { isProfileOnline } from "@/shared/utils/profile";

type ChatListViewProps = {
  allFolderName: string;
  chatFolders: ChatFolder[];
  chatProfiles: ProfileRow[];
  latestVisibleMessageByProfileId: Map<string, MessageRow>;
  openFolderContextMenu: (
    event: MouseEvent<HTMLElement>,
    folder: ChatFolder | null,
  ) => void;
  openChatContextMenu: (event: MouseEvent<HTMLElement>, profile: ProfileRow) => void;
  openCreateChatFolderDialog: () => void;
  reorderChatFolders: (draggedFolderId: string, targetFolderId: string) => void;
  selectedChatFolderId: string | null;
  setSelectedChatFolderId: (folderId: string | null) => void;
  setSelectedChatUserId: (userId: string) => void;
  setUnreadMessageCount: (count: number) => void;
  unreadMessagesByUserId: Map<string, number>;
};

export function ChatListView({
  allFolderName,
  chatFolders,
  chatProfiles,
  latestVisibleMessageByProfileId,
  openFolderContextMenu,
  openChatContextMenu,
  openCreateChatFolderDialog,
  reorderChatFolders,
  selectedChatFolderId,
  setSelectedChatFolderId,
  setSelectedChatUserId,
  setUnreadMessageCount,
  unreadMessagesByUserId,
}: ChatListViewProps) {
  const { t } = useI18n();
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);

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
      <div className="mb-2 flex h-[50px] min-h-[50px] items-center rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <h2 className="text-base font-medium sm:text-base">{t("messages")}</h2>
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
                event.dataTransfer.setData("text/plain", folder.id);
                setDraggedFolderId(folder.id);
              }}
              onDrop={(event) => dropFolder(event, folder.id)}
            >
              {folder.name}
            </FolderFilterButton>
          ))}
          <button
            aria-label={t("newFolder")}
            className="grid h-8 min-h-8 w-8 shrink-0 place-items-center rounded-lg text-[#a1a1aa] transition hover:bg-[#f4f4f5]/8 hover:text-[#f4f4f5]"
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
          {chatProfiles.length === 0 ? (
            <article className="rounded-xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-4 text-center sm:rounded-2xl sm:p-6">
              <p className="text-sm font-medium">{t("emptyChatsTitle")}</p>
              <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">{t("emptyChatsText")}</p>
            </article>
          ) : null}

          {chatProfiles.map((profile) => {
            const latestProfileMessage = latestVisibleMessageByProfileId.get(profile.user_id);
            const profileUnreadCount = unreadMessagesByUserId.get(profile.user_id) ?? 0;
            const previewText = latestProfileMessage
              ? getChatPreviewText(latestProfileMessage.text)
              : t("openChat");

            return (
              <button
                className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition hover:border-[#3f3f46]/55 hover:bg-[#f4f4f5]/8 sm:gap-3 sm:rounded-2xl sm:p-3 ${
                  profileUnreadCount > 0
                    ? "border-[#f4f4f5]/20 bg-[#f4f4f5]/10"
                    : "border-transparent bg-[#050505]/52"
                }`}
                key={profile.user_id}
                onClick={() => {
                  setSelectedChatUserId(profile.user_id);
                  setUnreadMessageCount(0);
                }}
                onContextMenu={(event) => openChatContextMenu(event, profile)}
                type="button"
              >
                <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                  <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-sm font-medium text-[#050505] sm:text-sm">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`${t("avatarAlt")} ${profile.display_name}`}
                        className="h-full w-full object-cover"
                        src={profile.avatar_url}
                      />
                    ) : (
                      profile.display_name[0]?.toUpperCase()
                    )}
                  </div>
                  {isProfileOnline(profile.updated_at) ? (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#050505] bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)] sm:h-3.5 sm:w-3.5" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-[#f4f4f5] sm:text-sm">
                      {profile.display_name}
                    </p>
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
                    {profileUnreadCount > 0
                        ? `${t("unreadFrom")} ${profile.display_name}: ${previewText}`
                        : previewText}
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
      className={`inline-flex min-h-8 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition ${
        color
          ? "border-2 hover:bg-[#f4f4f5]/8"
          : isActive
            ? "border-[#f4f4f5]/60 bg-[#f4f4f5] text-[#050505]"
            : "border-[#3f3f46]/35 bg-[#f4f4f5]/10 text-[#f4f4f5] hover:bg-[#f4f4f5]/18"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
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
