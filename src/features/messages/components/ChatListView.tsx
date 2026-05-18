import type { MouseEvent } from "react";
import type { MessageRow, ProfileRow } from "@/shared/types";
import { formatMessageTime } from "@/shared/utils/format";
import { getChatPreviewText } from "@/shared/utils/messages";
import { isProfileOnline } from "@/shared/utils/profile";

const messagesTitle = "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f";
const emptyChatsTitle = "\u0414\u0438\u0430\u043b\u043e\u0433\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442";
const emptyChatsText =
  "\u041d\u0430\u0439\u0434\u0438 \u0447\u0435\u043b\u043e\u0432\u0435\u043a\u0430 \u043f\u043e @\u043d\u0438\u043a\u0443 \u0438 \u043d\u0430\u0447\u043d\u0438 \u043f\u0435\u0440\u0435\u043f\u0438\u0441\u043a\u0443";
const openChatText = "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0435\u0440\u0435\u043f\u0438\u0441\u043a\u0443";
const avatarAltPrefix = "\u0410\u0432\u0430\u0442\u0430\u0440";
const unreadPrefix = "\u041d\u0435\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u043e\u0435 \u043e\u0442";

type ChatListViewProps = {
  chatProfiles: ProfileRow[];
  latestVisibleMessageByProfileId: Map<string, MessageRow>;
  openChatContextMenu: (event: MouseEvent<HTMLElement>, profile: ProfileRow) => void;
  setSelectedChatUserId: (userId: string) => void;
  setUnreadMessageCount: (count: number) => void;
  unreadMessagesByUserId: Map<string, number>;
};

export function ChatListView({
  chatProfiles,
  latestVisibleMessageByProfileId,
  openChatContextMenu,
  setSelectedChatUserId,
  setUnreadMessageCount,
  unreadMessagesByUserId,
}: ChatListViewProps) {
  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-[60px] min-h-[60px] items-center rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <h2 className="text-base font-medium sm:text-base">{messagesTitle}</h2>
      </div>

      <div className="scrollbar-hidden grid min-h-0 flex-1 content-start gap-2 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
        {chatProfiles.length === 0 ? (
          <article className="rounded-xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-4 text-center sm:rounded-2xl sm:p-6">
            <p className="text-sm font-medium">{emptyChatsTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">{emptyChatsText}</p>
          </article>
        ) : null}

        {chatProfiles.map((profile) => {
          const latestProfileMessage = latestVisibleMessageByProfileId.get(profile.user_id);
          const profileUnreadCount = unreadMessagesByUserId.get(profile.user_id) ?? 0;
          const previewText = latestProfileMessage
            ? getChatPreviewText(latestProfileMessage.text)
            : openChatText;

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
                      alt={`${avatarAltPrefix} ${profile.display_name}`}
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
                      ? `${unreadPrefix} ${profile.display_name}: ${previewText}`
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
  );
}
