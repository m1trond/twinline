import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode, MouseEvent, Dispatch, SetStateAction } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApp } from "@/shared/context/AppContext";
import { useFavoritesState } from "@/features/messages/hooks/useFavoritesState";
import type { FavoriteItem } from "@/shared/types";

type FavoritesContextType = {
  favoriteItems: FavoriteItem[];
  pinnedFavoriteItem: FavoriteItem | null;
  setPinnedFavoriteItem: Dispatch<SetStateAction<FavoriteItem | null>>;
  saveFavoriteItems: (items: FavoriteItem[]) => void;
  isFavoriteSelectionMode: boolean;
  selectedFavoriteItems: FavoriteItem[];
  selectedFavoriteIdSet: Set<number>;
  handleFavoriteSelectionClick: (event: MouseEvent<HTMLElement>, item: FavoriteItem) => void;
  removeSelectedFavoriteItems: () => void;
  toggleSelectedFavoriteItem: (item: FavoriteItem) => void;
  clearFavoriteSelection: () => void;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeView, setErrorMessage, saveUserSyncPatch } = useApp();

  const {
    favoriteItems,
    pinnedFavoriteItem,
    setPinnedFavoriteItem,
    saveFavoriteItems,
  } = useFavoritesState(user?.id, saveUserSyncPatch);

  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState<number[]>([]);
  const selectedFavoriteIdSet = useMemo(() => new Set(selectedFavoriteIds), [selectedFavoriteIds]);

  const selectedFavoriteItems = useMemo(() => {
    return favoriteItems.filter((item) => selectedFavoriteIdSet.has(item.id));
  }, [favoriteItems, selectedFavoriteIdSet]);

  const isFavoriteSelectionMode = activeView === "favorites" && selectedFavoriteItems.length > 0;

  const toggleSelectedFavoriteItem = useCallback((item: FavoriteItem) => {
    setSelectedFavoriteIds((currentIds) =>
      currentIds.includes(item.id) ? currentIds.filter((id) => id !== item.id) : [...currentIds, item.id]
    );
    setErrorMessage("");
  }, [setErrorMessage]);

  const clearFavoriteSelection = useCallback(() => {
    setSelectedFavoriteIds([]);
  }, []);

  const handleFavoriteSelectionClick = useCallback((
    event: MouseEvent<HTMLElement>,
    item: FavoriteItem,
  ) => {
    if (!isFavoriteSelectionMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleSelectedFavoriteItem(item);
  }, [isFavoriteSelectionMode, toggleSelectedFavoriteItem]);

  const removeSelectedFavoriteItems = useCallback(() => {
    if (selectedFavoriteItems.length === 0) {
      return;
    }

    const idSet = new Set(selectedFavoriteItems.map((item) => item.id));

    saveFavoriteItems(
      favoriteItems.filter((favoriteItem) => !idSet.has(favoriteItem.id)),
    );
    setPinnedFavoriteItem((currentPinnedItem) =>
      currentPinnedItem && idSet.has(currentPinnedItem.id)
        ? null
        : currentPinnedItem,
    );
    setSelectedFavoriteIds([]);
    setErrorMessage("");
  }, [selectedFavoriteItems, saveFavoriteItems, favoriteItems, setPinnedFavoriteItem, setErrorMessage]);

  const value = useMemo(() => ({
    favoriteItems,
    pinnedFavoriteItem,
    setPinnedFavoriteItem,
    saveFavoriteItems,
    isFavoriteSelectionMode,
    selectedFavoriteItems,
    selectedFavoriteIdSet,
    handleFavoriteSelectionClick,
    removeSelectedFavoriteItems,
    toggleSelectedFavoriteItem,
    clearFavoriteSelection,
  }), [
    favoriteItems,
    pinnedFavoriteItem,
    setPinnedFavoriteItem,
    saveFavoriteItems,
    isFavoriteSelectionMode,
    selectedFavoriteItems,
    selectedFavoriteIdSet,
    handleFavoriteSelectionClick,
    removeSelectedFavoriteItems,
    toggleSelectedFavoriteItem,
    clearFavoriteSelection,
  ]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesContextProvider");
  }
  return context;
}
