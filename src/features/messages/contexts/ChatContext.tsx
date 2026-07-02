import { useState, useMemo, type ReactNode } from "react";
import { FoldersContextProvider, useFolders } from "./FoldersContext";
import { FavoritesContextProvider, useFavorites } from "./FavoritesContext";
import { MessagesContextProvider, useMessages } from "./MessagesContext";
import { BlockContextProvider, useBlock } from "@/features/profile/contexts/BlockContext";
import type { ChatContextMenuState } from "@/features/messages/hooks/useMessageContextMenus";

// Define a bridge component to pass block values from MessagesContext to BlockContext
function BlockContextProviderBridge({ children }: { children: ReactNode }) {
  const messages = useMessages();
  const blockValue = useMemo(() => ({
    blockedByMeProfiles: messages.blockedByMeProfiles,
    blockedByMeProfileIds: messages.blockedByMeProfileIds,
    blockedMeProfileIds: messages.blockedMeProfileIds,
    blockedProfileIds: messages.blockedProfileIds,
    blockedProfileIdsRef: messages.blockedProfileIdsRef,
    confirmBlockChange: messages.confirmBlockChange,
    requestBlockChange: messages.requestBlockChange,
    blockConfirmation: messages.blockConfirmation,
    setBlockConfirmation: messages.setBlockConfirmation,
    profileNotificationMenuUserId: messages.profileNotificationMenuUserId,
    setProfileNotificationMenuUserId: messages.setProfileNotificationMenuUserId,
    isSelectedChatBlocked: messages.isSelectedChatBlocked,
    isSelectedChatBlockedByMe: messages.isSelectedChatBlockedByMe,
    isSelectedChatBlockingMe: messages.isSelectedChatBlockingMe,
  }), [
    messages.blockedByMeProfiles,
    messages.blockedByMeProfileIds,
    messages.blockedMeProfileIds,
    messages.blockedProfileIds,
    messages.blockedProfileIdsRef,
    messages.confirmBlockChange,
    messages.requestBlockChange,
    messages.blockConfirmation,
    messages.setBlockConfirmation,
    messages.profileNotificationMenuUserId,
    messages.setProfileNotificationMenuUserId,
    messages.isSelectedChatBlocked,
    messages.isSelectedChatBlockedByMe,
    messages.isSelectedChatBlockingMe,
  ]);

  return (
    <BlockContextProvider value={blockValue}>
      {children}
    </BlockContextProvider>
  );
}

// Parent ChatContextProvider that chains all sub-contexts
type ChatContextProviderProps = {
  children: ReactNode;
  showToast: (msg: ReactNode) => void;
};

export function ChatContextProvider({ children, showToast }: ChatContextProviderProps) {
  const [chatContextMenu, setChatContextMenu] = useState<ChatContextMenuState | null>(null);

  return (
    <FoldersContextProvider setChatContextMenu={setChatContextMenu}>
      <FavoritesContextProvider>
        <MessagesContextProvider
          showToast={showToast}
          chatContextMenu={chatContextMenu}
          setChatContextMenu={setChatContextMenu}
        >
          <BlockContextProviderBridge>
            {children}
          </BlockContextProviderBridge>
        </MessagesContextProvider>
      </FavoritesContextProvider>
    </FoldersContextProvider>
  );
}

// useChat facade that returns the merged properties of all contexts
export function useChat() {
  const folders = useFolders();
  const favorites = useFavorites();
  const messages = useMessages();
  const block = useBlock();

  // Return the merged contexts
  return useMemo(() => ({
    ...folders,
    ...favorites,
    ...messages,
    ...block,
  }), [folders, favorites, messages, block]);
}
