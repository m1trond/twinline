import { useState } from "react";
import type { FavoriteItem, MessageRow, ProfileRow } from "@/shared/types";

export function useFloatingUiState() {
  const [messageContextMenu, setMessageContextMenu] = useState<{
    left: number;
    message: MessageRow;
    top: number;
  } | null>(null);
  const [favoriteContextMenu, setFavoriteContextMenu] = useState<{
    item: FavoriteItem;
    left: number;
    top: number;
  } | null>(null);
  const [chatContextMenu, setChatContextMenu] = useState<{
    left: number;
    profile: ProfileRow;
    top: number;
  } | null>(null);
  const [profileNotificationMenuUserId, setProfileNotificationMenuUserId] = useState<string | null>(null);
  const [blockConfirmation, setBlockConfirmation] = useState<{
    action: "block" | "unblock";
    targetLabel: string;
    userId: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  return {
    messageContextMenu,
    setMessageContextMenu,
    favoriteContextMenu,
    setFavoriteContextMenu,
    chatContextMenu,
    setChatContextMenu,
    profileNotificationMenuUserId,
    setProfileNotificationMenuUserId,
    blockConfirmation,
    setBlockConfirmation,
    errorMessage,
    setErrorMessage,
  };
}
