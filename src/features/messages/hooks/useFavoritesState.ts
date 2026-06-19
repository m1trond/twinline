import { useCallback, useEffect, useState } from "react";
import type { UserSyncPayload } from "@/features/sync/queries";
import type { FavoriteItem } from "@/shared/types";

function isStoredFavoriteItem(item: unknown): item is FavoriteItem {
  const favoriteItem = item as FavoriteItem;

  return (
    favoriteItem !== null &&
    typeof favoriteItem === "object" &&
    Number.isInteger(favoriteItem.id) &&
    typeof favoriteItem.author === "string" &&
    typeof favoriteItem.text === "string" &&
    typeof favoriteItem.created_at === "string" &&
    typeof favoriteItem.saved_at === "string"
  );
}

function sortFavoriteItems(favoriteItems: FavoriteItem[]) {
  return [...favoriteItems].sort((firstItem, secondItem) =>
    firstItem.created_at.localeCompare(secondItem.created_at),
  );
}

function getFavoritesUpdatedAtKey(userId: string) {
  return `hush-favorites-updated-at-${userId}`;
}

function getLatestFavoriteItemTimestamp(favoriteItems: FavoriteItem[]) {
  return favoriteItems.reduce<string | null>((latestTimestamp, item) => {
    const itemTimestamp = item.saved_at || item.created_at;

    return !latestTimestamp || itemTimestamp > latestTimestamp
      ? itemTimestamp
      : latestTimestamp;
  }, null);
}

function getPayloadFavoritesUpdatedAt(payload: UserSyncPayload, favoriteItems: FavoriteItem[]) {
  return typeof payload.favoriteItemsUpdatedAt === "string"
    ? payload.favoriteItemsUpdatedAt
    : getLatestFavoriteItemTimestamp(favoriteItems);
}

function parseFavoriteItems(value: unknown, userId: string): FavoriteItem[] {
  return Array.isArray(value)
    ? sortFavoriteItems(
        value
          .filter(isStoredFavoriteItem)
          .map((item) => ({
            ...item,
            edited_at: item.edited_at ?? null,
            recipient_id: item.recipient_id ?? userId,
            user_id: item.user_id ?? userId,
          })),
      )
    : [];
}

function readStoredFavoritesUpdatedAt(userId: string, favoriteItems: FavoriteItem[]) {
  return (
    window.localStorage.getItem(getFavoritesUpdatedAtKey(userId)) ??
    getLatestFavoriteItemTimestamp(favoriteItems) ??
    "1970-01-01T00:00:00.000Z"
  );
}

function readStoredFavoriteItems(userId: string) {
  try {
    const storedFavoriteItems = window.localStorage.getItem(`hush-favorites-${userId}`);

    return storedFavoriteItems
      ? parseFavoriteItems(JSON.parse(storedFavoriteItems), userId)
      : [];
  } catch {
    return [];
  }
}

function writeStoredFavorites(
  userId: string,
  favoriteItems: FavoriteItem[],
  updatedAt: string,
) {
  try {
    window.localStorage.setItem(
      `hush-favorites-${userId}`,
      JSON.stringify(favoriteItems),
    );
    window.localStorage.setItem(getFavoritesUpdatedAtKey(userId), updatedAt);
  } catch {
  }
}

export function useFavoritesState(
  userId: string | null | undefined,
  saveUserSyncPatch?: (patch: UserSyncPayload) => void,
) {
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [pinnedFavoriteItem, setPinnedFavoriteItem] = useState<FavoriteItem | null>(null);

  const applyFavoritesSyncPayload = useCallback(
    (payload: UserSyncPayload, syncUserId: string) => {
      if (!("favoriteItems" in payload)) {
        return false;
      }

      const nextFavoriteItems = parseFavoriteItems(payload.favoriteItems, syncUserId);
      const nextFavoritesUpdatedAt =
        getPayloadFavoritesUpdatedAt(payload, nextFavoriteItems) ??
        "1970-01-01T00:00:00.000Z";
      const localFavoriteItems = readStoredFavoriteItems(syncUserId);
      const localFavoritesUpdatedAt = readStoredFavoritesUpdatedAt(
        syncUserId,
        localFavoriteItems,
      );

      if (localFavoritesUpdatedAt > nextFavoritesUpdatedAt) {
        return false;
      }

      setFavoriteItems(nextFavoriteItems);
      setPinnedFavoriteItem((currentPinnedItem) =>
        currentPinnedItem &&
        nextFavoriteItems.some((item) => item.id === currentPinnedItem.id)
          ? currentPinnedItem
          : null,
      );

      writeStoredFavorites(syncUserId, nextFavoriteItems, nextFavoritesUpdatedAt);

      return true;
    },
    [],
  );

  const readLocalFavoritesSyncPayload = useCallback((syncUserId: string) => {
    try {
      const localFavoriteItems = readStoredFavoriteItems(syncUserId);

      return {
        favoriteItems: localFavoriteItems,
        favoriteItemsUpdatedAt: readStoredFavoritesUpdatedAt(
          syncUserId,
          localFavoriteItems,
        ),
      };
    } catch {
      return {
        favoriteItems: [],
        favoriteItemsUpdatedAt: "1970-01-01T00:00:00.000Z",
      };
    }
  }, []);

  useEffect(() => {
    let frameId = 0;

    if (!userId) {
      frameId = window.requestAnimationFrame(() => {
        setFavoriteItems([]);
        setPinnedFavoriteItem(null);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      const storedFavoriteItems = window.localStorage.getItem(
        `hush-favorites-${userId}`,
      );

      if (!storedFavoriteItems) {
        setFavoriteItems([]);
        setPinnedFavoriteItem(null);
        return;
      }

      try {
        const parsedFavoriteItems = JSON.parse(storedFavoriteItems);
        const nextFavoriteItems = parseFavoriteItems(parsedFavoriteItems, userId);
        const nextFavoritesUpdatedAt = readStoredFavoritesUpdatedAt(
          userId,
          nextFavoriteItems,
        );

        setFavoriteItems(nextFavoriteItems);
        writeStoredFavorites(userId, nextFavoriteItems, nextFavoritesUpdatedAt);
        setPinnedFavoriteItem((currentPinnedItem) =>
          currentPinnedItem &&
          nextFavoriteItems.some((item) => item.id === currentPinnedItem.id)
            ? currentPinnedItem
            : null,
        );
      } catch {
        setFavoriteItems([]);
        setPinnedFavoriteItem(null);
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [userId]);

  const saveFavoriteItems = useCallback(
    (nextFavoriteItems: FavoriteItem[]) => {
      const sortedFavoriteItems = sortFavoriteItems(nextFavoriteItems);
      const favoritesUpdatedAt = new Date().toISOString();

      setFavoriteItems(sortedFavoriteItems);

      if (userId) {
        writeStoredFavorites(userId, sortedFavoriteItems, favoritesUpdatedAt);

        saveUserSyncPatch?.({
          favoriteItems: sortedFavoriteItems,
          favoriteItemsUpdatedAt: favoritesUpdatedAt,
        });
      }
    },
    [saveUserSyncPatch, userId],
  );

  return {
    applyFavoritesSyncPayload,
    favoriteItems,
    pinnedFavoriteItem,
    readLocalFavoritesSyncPayload,
    setFavoriteItems,
    setPinnedFavoriteItem,
    saveFavoriteItems,
  };
}
