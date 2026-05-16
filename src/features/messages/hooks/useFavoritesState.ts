import { useCallback, useEffect, useState } from "react";
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

export function useFavoritesState(userId: string | null | undefined) {
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [pinnedFavoriteItem, setPinnedFavoriteItem] = useState<FavoriteItem | null>(null);

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
        const nextFavoriteItems = Array.isArray(parsedFavoriteItems)
          ? sortFavoriteItems(
              parsedFavoriteItems
                .filter(isStoredFavoriteItem)
                .map((item) => ({
                  ...item,
                  recipient_id: item.recipient_id ?? userId,
                  user_id: item.user_id ?? userId,
                })),
            )
          : [];

        setFavoriteItems(nextFavoriteItems);
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

      setFavoriteItems(sortedFavoriteItems);

      if (userId) {
        window.localStorage.setItem(
          `hush-favorites-${userId}`,
          JSON.stringify(sortedFavoriteItems),
        );
      }
    },
    [userId],
  );

  return {
    favoriteItems,
    setFavoriteItems,
    pinnedFavoriteItem,
    setPinnedFavoriteItem,
    saveFavoriteItems,
  };
}
