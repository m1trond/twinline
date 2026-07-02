import { createContext, useContext } from "react";
import type { ReactNode, MouseEvent } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApp } from "@/shared/context/AppContext";
import { useChatFoldersState } from "@/features/messages/hooks/useChatFoldersState";
import type { ChatFolder, ProfileRow } from "@/shared/types";
import type { FolderContextMenuState, FolderDialogState } from "@/features/messages/components/FolderMenus";

type FoldersContextType = {
  allChatFolderName: string;
  chatFolders: ChatFolder[];
  chatFolderAssignments: Record<string, string[]>;
  selectedChatFolderId: string | null;
  setSelectedChatFolderId: (id: string | null) => void;
  folderContextMenu: FolderContextMenuState | null;
  setFolderContextMenu: (val: FolderContextMenuState | null) => void;
  folderDeleteTarget: ChatFolder | null;
  setFolderDeleteTarget: (val: ChatFolder | null) => void;
  folderDialog: FolderDialogState | null;
  setFolderDialog: (val: FolderDialogState | null) => void;
  folderNameDraft: string;
  setFolderNameDraft: (val: string) => void;
  openCreateChatFolderDialog: (profile: ProfileRow) => void;
  openCreateEmptyChatFolderDialog: () => void;
  openFolderContextMenu: (event: MouseEvent<HTMLElement>, folder: ChatFolder | null) => void;
  openRenameFolderDialog: (folder: ChatFolder | null) => void;
  requestDeleteChatFolder: (folder: ChatFolder) => void;
  deleteChatFolder: (folderId: string) => void;
  submitFolderDialog: () => void;
  toggleChatFolderFromMenu: (profile: ProfileRow, folderId: string) => void;
  updateChatFolderColor: (folderId: string, color: string) => void;
  reorderChatFolders: (draggedFolderId: string, targetFolderId: string) => void;
  archiveChatProfile: (profile: ProfileRow) => void;
  archivedChatProfileIds: string[];
  pinnedChatProfileIds: string[];
  togglePinnedChatProfile: (profile: ProfileRow) => void;
  unarchiveChatProfile: (profile: ProfileRow) => void;
};

const FoldersContext = createContext<FoldersContextType | null>(null);

export function FoldersContextProvider({
  children,
  setChatContextMenu = () => {},
}: {
  children: ReactNode;
  setChatContextMenu?: (menu: null) => void;
}) {
  const { user } = useAuth();
  const { interfaceLanguage, setErrorMessage, saveUserSyncPatch } = useApp();

  const foldersState = useChatFoldersState({
    user,
    interfaceLanguage,
    setErrorMessage,
    saveUserSyncPatch,
    setChatContextMenu,
  });

  return (
    <FoldersContext.Provider value={foldersState}>
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders() {
  const context = useContext(FoldersContext);
  if (!context) {
    throw new Error("useFolders must be used within a FoldersContextProvider");
  }
  return context;
}
