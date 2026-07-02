import { MouseEvent, useCallback } from "react";
import type { FavoriteItem, MessageRow, ProfileRow } from "@/shared/types";

export type MessageContextMenuState = {
  left: number;
  message: MessageRow;
  top: number;
};

export type FavoriteContextMenuState = {
  item: FavoriteItem;
  left: number;
  top: number;
};

export type ChatContextMenuState = {
  left: number;
  profile: ProfileRow;
  top: number;
};

type UseMessageContextMenusParams = {
  setChatContextMenu: (menu: ChatContextMenuState | null) => void;
  setChatDeleteTargetUserId: (userId: string | null) => void;
  setFavoriteContextMenu: (menu: FavoriteContextMenuState | null) => void;
  setIsChatDeleteDialogOpen: (isOpen: boolean) => void;
  setIsStickerPickerOpen: (isOpen: boolean) => void;
  setMessageContextMenu: (menu: MessageContextMenuState | null) => void;
  userId: string | undefined;
};

function clampMenuPosition({
  clientX,
  clientY,
  menuHeight,
  menuWidth,
}: {
  clientX: number;
  clientY: number;
  menuHeight: number;
  menuWidth: number;
}) {
  return {
    left: Math.max(
      12,
      Math.min(clientX, window.innerWidth - menuWidth - 12),
    ),
    top: Math.max(
      12,
      Math.min(clientY, window.innerHeight - menuHeight - 12),
    ),
  };
}

export function useMessageContextMenus({
  setChatContextMenu,
  setChatDeleteTargetUserId,
  setFavoriteContextMenu,
  setIsChatDeleteDialogOpen,
  setIsStickerPickerOpen,
  setMessageContextMenu,
  userId,
}: UseMessageContextMenusParams) {
  const openMessageContextMenu = useCallback(
    (event: MouseEvent<HTMLElement>, message: MessageRow) => {
      if (!userId) {
        return;
      }

      event.preventDefault();
      setIsStickerPickerOpen(false);

      const { left, top } = clampMenuPosition({
        clientX: event.clientX,
        clientY: event.clientY,
        menuHeight: 306,
        menuWidth: Math.min(220, window.innerWidth - 24),
      });

      setMessageContextMenu({
        left,
        message,
        top,
      });
    },
    [setIsStickerPickerOpen, setMessageContextMenu, userId],
  );

  const openFavoriteContextMenu = useCallback(
    (event: MouseEvent<HTMLElement>, item: FavoriteItem) => {
      event.preventDefault();
      setIsStickerPickerOpen(false);

      const { left, top } = clampMenuPosition({
        clientX: event.clientX,
        clientY: event.clientY,
        menuHeight: 306,
        menuWidth: Math.min(220, window.innerWidth - 24),
      });

      setFavoriteContextMenu({
        item,
        left,
        top,
      });
    },
    [setFavoriteContextMenu, setIsStickerPickerOpen],
  );

  const openChatContextMenu = useCallback(
    (event: MouseEvent<HTMLElement>, profile: ProfileRow) => {
      event.preventDefault();
      setMessageContextMenu(null);
      setFavoriteContextMenu(null);
      setIsStickerPickerOpen(false);

      const { left, top } = clampMenuPosition({
        clientX: event.clientX,
        clientY: event.clientY,
        menuHeight: 280,
        menuWidth: Math.min(286, window.innerWidth - 24),
      });

      setChatContextMenu({
        left,
        profile,
        top,
      });
    },
    [
      setChatContextMenu,
      setFavoriteContextMenu,
      setIsStickerPickerOpen,
      setMessageContextMenu,
    ],
  );

  const requestChatDeleteFromMenu = useCallback(
    (profile: ProfileRow) => {
      setChatDeleteTargetUserId(profile.user_id);
      setChatContextMenu(null);
      setIsChatDeleteDialogOpen(true);
    },
    [setChatContextMenu, setChatDeleteTargetUserId, setIsChatDeleteDialogOpen],
  );

  return {
    openChatContextMenu,
    openFavoriteContextMenu,
    openMessageContextMenu,
    requestChatDeleteFromMenu,
  };
}
