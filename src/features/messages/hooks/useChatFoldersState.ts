import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  type FolderContextMenuState,
  type FolderDialogState,
} from "@/features/messages/components/FolderMenus";
import type { UserSyncPayload } from "@/features/sync/queries";
import { translations, type InterfaceLanguage } from "@/shared/i18n";
import { archivedChatFolderId } from "@/shared/constants";
import type { ChatFolder, ProfileRow } from "@/shared/types";

function parseChatFolders(value: unknown): ChatFolder[] {
  return Array.isArray(value)
    ? value
        .filter((folder): folder is ChatFolder => {
          return (
            folder !== null &&
            typeof folder === "object" &&
            typeof (folder as ChatFolder).id === "string" &&
            typeof (folder as ChatFolder).name === "string" &&
            typeof (folder as ChatFolder).createdAt === "string"
          );
        })
        .map((folder) => ({
          ...folder,
          color: typeof folder.color === "string" ? folder.color : undefined,
        }))
    : [];
}

function parseStringArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === "string")))
    : [];
}

function parseFolderAssignments(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string | string[]] => {
        return (
          typeof entry[0] === "string" &&
          (typeof entry[1] === "string" ||
            (Array.isArray(entry[1]) && entry[1].every((folderId) => typeof folderId === "string")))
        );
      })
      .map(([profileUserId, folderIds]) => [
        profileUserId,
        Array.isArray(folderIds) ? Array.from(new Set(folderIds)) : [folderIds],
      ]),
  );
}

type ChatFoldersSyncPayload = Pick<
  UserSyncPayload,
  "allChatFolderName" | "archivedChatProfileIds" | "chatFolderAssignments" | "chatFolders"
>;

type ChatFoldersStateParams = {
  interfaceLanguage: InterfaceLanguage;
  saveUserSyncPatch: (patch: UserSyncPayload) => void;
  setChatContextMenu: (menu: null) => void;
  setErrorMessage: (message: string) => void;
  user: User | null;
};

export function useChatFoldersState({
  interfaceLanguage,
  saveUserSyncPatch,
  setChatContextMenu,
  setErrorMessage,
  user,
}: ChatFoldersStateParams) {
  const [chatFolders, setChatFolders] = useState<ChatFolder[]>([]);
  const [chatFolderAssignments, setChatFolderAssignments] = useState<Record<string, string[]>>({});
  const [allChatFolderName, setAllChatFolderName] = useState("");
  const [archivedChatProfileIds, setArchivedChatProfileIds] = useState<string[]>([]);
  const [folderContextMenu, setFolderContextMenu] = useState<FolderContextMenuState | null>(null);
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<ChatFolder | null>(null);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [selectedChatFolderId, setSelectedChatFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChatFolderId) {
      return;
    }

    if (selectedChatFolderId === archivedChatFolderId) {
      return;
    }

    if (!chatFolders.some((folder) => folder.id === selectedChatFolderId)) {
      window.requestAnimationFrame(() => {
        setSelectedChatFolderId(null);
      });
    }
  }, [chatFolders, selectedChatFolderId]);

  function resetChatFoldersState() {
    setChatFolders([]);
    setChatFolderAssignments({});
    setAllChatFolderName("");
    setArchivedChatProfileIds([]);
    setSelectedChatFolderId(null);
  }

  function applyChatFoldersSyncPayload(payload: UserSyncPayload, syncUserId: string) {
    const nextAllChatFolderName =
      typeof payload.allChatFolderName === "string" && payload.allChatFolderName.trim()
        ? payload.allChatFolderName
        : translations[interfaceLanguage].allChats;
    const nextArchivedChatProfileIds = parseStringArray(payload.archivedChatProfileIds);
    const nextChatFolderAssignments = parseFolderAssignments(payload.chatFolderAssignments);
    const nextChatFolders = parseChatFolders(payload.chatFolders);

    setAllChatFolderName(nextAllChatFolderName);
    setChatFolders(nextChatFolders);
    setChatFolderAssignments(nextChatFolderAssignments);
    setArchivedChatProfileIds(nextArchivedChatProfileIds);
    window.localStorage.setItem(`hush-chat-all-folder-name-${syncUserId}`, nextAllChatFolderName);
    window.localStorage.setItem(`hush-chat-folders-${syncUserId}`, JSON.stringify(nextChatFolders));
    window.localStorage.setItem(
      `hush-chat-folder-assignments-${syncUserId}`,
      JSON.stringify(nextChatFolderAssignments),
    );
    window.localStorage.setItem(
      `hush-chat-archived-profiles-${syncUserId}`,
      JSON.stringify(nextArchivedChatProfileIds),
    );
  }

  function readLocalChatFoldersSyncPayload(syncUserId: string): ChatFoldersSyncPayload {
    const storedFolders = window.localStorage.getItem(`hush-chat-folders-${syncUserId}`);
    const storedAssignments = window.localStorage.getItem(`hush-chat-folder-assignments-${syncUserId}`);
    const storedAllFolderName = window.localStorage.getItem(`hush-chat-all-folder-name-${syncUserId}`);
    const storedArchivedChatProfileIds = window.localStorage.getItem(
      `hush-chat-archived-profiles-${syncUserId}`,
    );
    const parsedFolders = storedFolders ? JSON.parse(storedFolders) : [];
    const parsedAssignments = storedAssignments ? JSON.parse(storedAssignments) : {};
    const parsedArchivedChatProfileIds = storedArchivedChatProfileIds
      ? JSON.parse(storedArchivedChatProfileIds)
      : [];

    return {
      allChatFolderName: storedAllFolderName?.trim() || translations[interfaceLanguage].allChats,
      archivedChatProfileIds: parseStringArray(parsedArchivedChatProfileIds),
      chatFolderAssignments: parseFolderAssignments(parsedAssignments),
      chatFolders: parseChatFolders(parsedFolders),
    };
  }

  function saveChatFolders(nextFolders: ChatFolder[]) {
    if (!user) {
      return;
    }

    setChatFolders(nextFolders);
    window.localStorage.setItem(
      `hush-chat-folders-${user.id}`,
      JSON.stringify(nextFolders),
    );
    saveUserSyncPatch({ chatFolders: nextFolders });
  }

  function saveChatFolderAssignments(nextAssignments: Record<string, string[]>) {
    if (!user) {
      return;
    }

    setChatFolderAssignments(nextAssignments);
    window.localStorage.setItem(
      `hush-chat-folder-assignments-${user.id}`,
      JSON.stringify(nextAssignments),
    );
    saveUserSyncPatch({ chatFolderAssignments: nextAssignments });
  }

  function saveArchivedChatProfileIds(nextProfileIds: string[]) {
    if (!user) {
      return;
    }

    const normalizedProfileIds = Array.from(new Set(nextProfileIds));

    setArchivedChatProfileIds(normalizedProfileIds);
    window.localStorage.setItem(
      `hush-chat-archived-profiles-${user.id}`,
      JSON.stringify(normalizedProfileIds),
    );
    saveUserSyncPatch({ archivedChatProfileIds: normalizedProfileIds });
  }

  function saveAllChatFolderName(nextName: string) {
    if (!user) {
      return;
    }

    setAllChatFolderName(nextName);
    window.localStorage.setItem(`hush-chat-all-folder-name-${user.id}`, nextName);
    saveUserSyncPatch({ allChatFolderName: nextName });
  }

  function archiveChatProfile(profile: ProfileRow) {
    saveArchivedChatProfileIds([...archivedChatProfileIds, profile.user_id]);
    setChatContextMenu(null);
    setErrorMessage(`Чат с ${profile.display_name} отправлен в архив.`);
  }

  function unarchiveChatProfile(profile: ProfileRow) {
    saveArchivedChatProfileIds(
      archivedChatProfileIds.filter((profileId) => profileId !== profile.user_id),
    );
    setChatContextMenu(null);
    setErrorMessage(`Чат с ${profile.display_name} возвращен из архива.`);
  }

  function openFolderContextMenu(event: MouseEvent<HTMLElement>, folder: ChatFolder | null) {
    event.preventDefault();
    setFolderContextMenu({
      folder,
      left: event.clientX,
      top: event.clientY,
    });
  }

  function openCreateChatFolderDialog(profile: ProfileRow) {
    setFolderNameDraft("");
    setFolderDialog({
      folder: null,
      mode: "create",
      profileUserId: profile.user_id,
    });
    setChatContextMenu(null);
  }

  function openCreateEmptyChatFolderDialog() {
    setFolderNameDraft("");
    setFolderDialog({
      folder: null,
      mode: "create",
    });
    setFolderContextMenu(null);
    setChatContextMenu(null);
  }

  function openRenameFolderDialog(folder: ChatFolder | null) {
    setFolderNameDraft(folder?.name ?? allChatFolderName);
    setFolderDialog({
      folder,
      mode: "rename",
    });
    setFolderContextMenu(null);
  }

  function submitFolderDialog() {
    const nextFolderName = folderNameDraft.trim().slice(0, 28);

    if (!nextFolderName) {
      return;
    }

    if (folderDialog?.mode === "rename") {
      if (!folderDialog.folder) {
        saveAllChatFolderName(nextFolderName);
      } else {
        saveChatFolders(
          chatFolders.map((folder) =>
            folder.id === folderDialog.folder?.id ? { ...folder, name: nextFolderName } : folder,
          ),
        );
      }

      setFolderDialog(null);
      setErrorMessage(translations[interfaceLanguage].folderSaved);
      return;
    }

    const existingFolder = chatFolders.find(
      (folder) => folder.name.toLowerCase() === nextFolderName.toLowerCase(),
    );
    const folder =
      existingFolder ??
      {
        createdAt: new Date().toISOString(),
        id: `folder-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: nextFolderName.slice(0, 28),
        color: "#f4f4f5",
      };
    const nextFolders = existingFolder ? chatFolders : [...chatFolders, folder];

    saveChatFolders(nextFolders);
    if (folderDialog?.profileUserId) {
      const currentFolderIds = chatFolderAssignments[folderDialog.profileUserId] ?? [];
      saveChatFolderAssignments({
        ...chatFolderAssignments,
        [folderDialog.profileUserId]: Array.from(new Set([...currentFolderIds, folder.id])),
      });
    }
    const wasAssignedToProfile = Boolean(folderDialog?.profileUserId);

    setFolderDialog(null);
    setErrorMessage(
      wasAssignedToProfile
        ? `Чат добавлен в папку «${folder.name}».`
        : `Папка «${folder.name}» создана.`,
    );
  }

  function toggleChatFolderFromMenu(profile: ProfileRow, folderId: string) {
    const folder = chatFolders.find((currentFolder) => currentFolder.id === folderId);

    if (!folder) {
      setErrorMessage(translations[interfaceLanguage].folderNotFound);
      setChatContextMenu(null);
      return;
    }

    const currentFolderIds = chatFolderAssignments[profile.user_id] ?? [];
    const isAlreadyAssigned = currentFolderIds.includes(folder.id);
    const nextFolderIds = isAlreadyAssigned
      ? currentFolderIds.filter((currentFolderId) => currentFolderId !== folder.id)
      : Array.from(new Set([...currentFolderIds, folder.id]));
    const nextAssignments = { ...chatFolderAssignments };

    if (nextFolderIds.length > 0) {
      nextAssignments[profile.user_id] = nextFolderIds;
    } else {
      delete nextAssignments[profile.user_id];
    }

    saveChatFolderAssignments(nextAssignments);
    setChatContextMenu(null);
    setErrorMessage(
      isAlreadyAssigned
        ? `Чат убран из папки «${folder.name}».`
        : `Чат добавлен в папку «${folder.name}».`,
    );
  }

  function updateChatFolderColor(folderId: string, color: string) {
    saveChatFolders(
      chatFolders.map((folder) => (folder.id === folderId ? { ...folder, color } : folder)),
    );
    setFolderContextMenu(null);
  }

  function reorderChatFolders(draggedFolderId: string, targetFolderId: string) {
    const draggedIndex = chatFolders.findIndex((folder) => folder.id === draggedFolderId);
    const targetIndex = chatFolders.findIndex((folder) => folder.id === targetFolderId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return;
    }

    const nextFolders = [...chatFolders];
    const [draggedFolder] = nextFolders.splice(draggedIndex, 1);
    nextFolders.splice(targetIndex, 0, draggedFolder);
    saveChatFolders(nextFolders);
  }

  function requestDeleteChatFolder(folder: ChatFolder) {
    setFolderDeleteTarget(folder);
    setFolderContextMenu(null);
  }

  function deleteChatFolder(folderId: string) {
    saveChatFolders(chatFolders.filter((folder) => folder.id !== folderId));
    saveChatFolderAssignments(
      Object.fromEntries(
        Object.entries(chatFolderAssignments)
          .map(([profileUserId, folderIds]) => [
            profileUserId,
            folderIds.filter((currentFolderId) => currentFolderId !== folderId),
          ] as const)
          .filter(([, folderIds]) => folderIds.length > 0),
      ),
    );

    if (selectedChatFolderId === folderId) {
      setSelectedChatFolderId(null);
    }

    setFolderContextMenu(null);
    setFolderDeleteTarget(null);
  }

  return {
    allChatFolderName,
    applyChatFoldersSyncPayload,
    archiveChatProfile,
    archivedChatProfileIds,
    chatFolderAssignments,
    chatFolders,
    deleteChatFolder,
    folderContextMenu,
    folderDeleteTarget,
    folderDialog,
    folderNameDraft,
    openCreateChatFolderDialog,
    openCreateEmptyChatFolderDialog,
    openFolderContextMenu,
    openRenameFolderDialog,
    readLocalChatFoldersSyncPayload,
    reorderChatFolders,
    requestDeleteChatFolder,
    resetChatFoldersState,
    selectedChatFolderId,
    setFolderContextMenu,
    setFolderDeleteTarget,
    setFolderDialog,
    setFolderNameDraft,
    setSelectedChatFolderId,
    submitFolderDialog,
    toggleChatFolderFromMenu,
    unarchiveChatProfile,
    updateChatFolderColor,
  };
}
