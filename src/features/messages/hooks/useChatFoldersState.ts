import React, { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  type FolderContextMenuState,
  type FolderDialogState,
} from "@/features/messages/components/FolderMenus";
import { parseStringArray } from "@/features/sync/payload";
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
  | "allChatFolderName"
  | "archivedChatProfileIds"
  | "chatFolderAssignments"
  | "chatFolders"
  | "chatFoldersUpdatedAt"
  | "pinnedChatProfileIds"
>;

type ChatFoldersStateParams = {
  interfaceLanguage: InterfaceLanguage;
  saveUserSyncPatch: (patch: UserSyncPayload) => void;
  setChatContextMenu: (menu: null) => void;
  setErrorMessage: (message: string) => void;
  showToast?: (message: ReactNode) => void;
  user: User | null;
};

export function useChatFoldersState({
  interfaceLanguage,
  saveUserSyncPatch,
  setChatContextMenu,
  setErrorMessage,
  showToast,
  user,
}: ChatFoldersStateParams) {
  const [chatFolders, setChatFolders] = useState<ChatFolder[]>([]);
  const [chatFolderAssignments, setChatFolderAssignments] = useState<Record<string, string[]>>({});
  const [allChatFolderName, setAllChatFolderName] = useState("");
  const [archivedChatProfileIds, setArchivedChatProfileIds] = useState<string[]>([]);
  const [pinnedChatProfileIds, setPinnedChatProfileIds] = useState<string[]>([]);
  const [folderContextMenu, setFolderContextMenu] = useState<FolderContextMenuState | null>(null);
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<ChatFolder | null>(null);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [selectedChatFolderId, setSelectedChatFolderId] = useState<string | null>(null);

  function getChatFoldersUpdatedAtKey(syncUserId: string) {
    return `hush-chat-folders-updated-at-${syncUserId}`;
  }

  function readChatFoldersUpdatedAt(syncUserId: string) {
    return (
      window.localStorage.getItem(getChatFoldersUpdatedAtKey(syncUserId)) ??
      "1970-01-01T00:00:00.000Z"
    );
  }

  function writeChatFoldersUpdatedAt(syncUserId: string, updatedAt: string) {
    window.localStorage.setItem(getChatFoldersUpdatedAtKey(syncUserId), updatedAt);
  }

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
    setPinnedChatProfileIds([]);
    setSelectedChatFolderId(null);
  }

  function applyChatFoldersSyncPayload(payload: UserSyncPayload, syncUserId: string) {
    const nextChatFoldersUpdatedAt =
      typeof payload.chatFoldersUpdatedAt === "string"
        ? payload.chatFoldersUpdatedAt
        : "1970-01-01T00:00:00.000Z";
    const localChatFoldersUpdatedAt = readChatFoldersUpdatedAt(syncUserId);

    if (localChatFoldersUpdatedAt > nextChatFoldersUpdatedAt) {
      return;
    }

    const nextAllChatFolderName =
      typeof payload.allChatFolderName === "string" && payload.allChatFolderName.trim()
        ? payload.allChatFolderName
        : translations[interfaceLanguage].allChats;
    const nextArchivedChatProfileIds = parseStringArray(payload.archivedChatProfileIds);
    const nextChatFolderAssignments = parseFolderAssignments(payload.chatFolderAssignments);
    const nextChatFolders = parseChatFolders(payload.chatFolders);
    const nextPinnedChatProfileIds = parseStringArray(payload.pinnedChatProfileIds);

    setAllChatFolderName(nextAllChatFolderName);
    setChatFolders(nextChatFolders);
    setChatFolderAssignments(nextChatFolderAssignments);
    setArchivedChatProfileIds(nextArchivedChatProfileIds);
    setPinnedChatProfileIds(nextPinnedChatProfileIds);
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
    window.localStorage.setItem(
      `hush-chat-pinned-profiles-${syncUserId}`,
      JSON.stringify(nextPinnedChatProfileIds),
    );
    writeChatFoldersUpdatedAt(syncUserId, nextChatFoldersUpdatedAt);
  }

  function readLocalChatFoldersSyncPayload(syncUserId: string): ChatFoldersSyncPayload {
    const storedFolders = window.localStorage.getItem(`hush-chat-folders-${syncUserId}`);
    const storedAssignments = window.localStorage.getItem(`hush-chat-folder-assignments-${syncUserId}`);
    const storedAllFolderName = window.localStorage.getItem(`hush-chat-all-folder-name-${syncUserId}`);
    const storedArchivedChatProfileIds = window.localStorage.getItem(
      `hush-chat-archived-profiles-${syncUserId}`,
    );
    const storedPinnedChatProfileIds = window.localStorage.getItem(
      `hush-chat-pinned-profiles-${syncUserId}`,
    );
    const parsedFolders = storedFolders ? JSON.parse(storedFolders) : [];
    const parsedAssignments = storedAssignments ? JSON.parse(storedAssignments) : {};
    const parsedArchivedChatProfileIds = storedArchivedChatProfileIds
      ? JSON.parse(storedArchivedChatProfileIds)
      : [];
    const parsedPinnedChatProfileIds = storedPinnedChatProfileIds
      ? JSON.parse(storedPinnedChatProfileIds)
      : [];

    return {
      allChatFolderName: storedAllFolderName?.trim() || translations[interfaceLanguage].allChats,
      archivedChatProfileIds: parseStringArray(parsedArchivedChatProfileIds),
      chatFolderAssignments: parseFolderAssignments(parsedAssignments),
      chatFolders: parseChatFolders(parsedFolders),
      chatFoldersUpdatedAt: readChatFoldersUpdatedAt(syncUserId),
      pinnedChatProfileIds: parseStringArray(parsedPinnedChatProfileIds),
    };
  }

  function saveChatFolders(nextFolders: ChatFolder[]) {
    if (!user) {
      return;
    }

    const updatedAt = new Date().toISOString();

    setChatFolders(nextFolders);
    window.localStorage.setItem(
      `hush-chat-folders-${user.id}`,
      JSON.stringify(nextFolders),
    );
    writeChatFoldersUpdatedAt(user.id, updatedAt);
    saveUserSyncPatch({ chatFolders: nextFolders, chatFoldersUpdatedAt: updatedAt });
  }

  function saveChatFolderAssignments(nextAssignments: Record<string, string[]>) {
    if (!user) {
      return;
    }

    const updatedAt = new Date().toISOString();

    setChatFolderAssignments(nextAssignments);
    window.localStorage.setItem(
      `hush-chat-folder-assignments-${user.id}`,
      JSON.stringify(nextAssignments),
    );
    writeChatFoldersUpdatedAt(user.id, updatedAt);
    saveUserSyncPatch({
      chatFolderAssignments: nextAssignments,
      chatFoldersUpdatedAt: updatedAt,
    });
  }

  function saveChatFoldersAndAssignments(
    nextFolders: ChatFolder[],
    nextAssignments: Record<string, string[]>,
  ) {
    if (!user) {
      return;
    }

    const updatedAt = new Date().toISOString();

    setChatFolders(nextFolders);
    setChatFolderAssignments(nextAssignments);
    window.localStorage.setItem(`hush-chat-folders-${user.id}`, JSON.stringify(nextFolders));
    window.localStorage.setItem(
      `hush-chat-folder-assignments-${user.id}`,
      JSON.stringify(nextAssignments),
    );
    writeChatFoldersUpdatedAt(user.id, updatedAt);
    saveUserSyncPatch({
      chatFolderAssignments: nextAssignments,
      chatFolders: nextFolders,
      chatFoldersUpdatedAt: updatedAt,
    });
  }

  function saveArchivedChatProfileIds(nextProfileIds: string[]) {
    if (!user) {
      return;
    }

    const normalizedProfileIds = Array.from(new Set(nextProfileIds));
    const updatedAt = new Date().toISOString();

    setArchivedChatProfileIds(normalizedProfileIds);
    window.localStorage.setItem(
      `hush-chat-archived-profiles-${user.id}`,
      JSON.stringify(normalizedProfileIds),
    );
    writeChatFoldersUpdatedAt(user.id, updatedAt);
    saveUserSyncPatch({
      archivedChatProfileIds: normalizedProfileIds,
      chatFoldersUpdatedAt: updatedAt,
    });
  }

  function savePinnedChatProfileIds(nextProfileIds: string[]) {
    if (!user) {
      return;
    }

    const normalizedProfileIds = Array.from(new Set(nextProfileIds));
    const updatedAt = new Date().toISOString();

    setPinnedChatProfileIds(normalizedProfileIds);
    window.localStorage.setItem(
      `hush-chat-pinned-profiles-${user.id}`,
      JSON.stringify(normalizedProfileIds),
    );
    writeChatFoldersUpdatedAt(user.id, updatedAt);
    saveUserSyncPatch({
      chatFoldersUpdatedAt: updatedAt,
      pinnedChatProfileIds: normalizedProfileIds,
    });
  }

  function togglePinnedChatProfile(profile: ProfileRow) {
    const isPinned = pinnedChatProfileIds.includes(profile.user_id);
    const nextPinnedProfileIds = isPinned
      ? pinnedChatProfileIds.filter((profileId) => profileId !== profile.user_id)
      : [profile.user_id, ...pinnedChatProfileIds];

    savePinnedChatProfileIds(nextPinnedProfileIds);
    setChatContextMenu(null);
    setErrorMessage(
      isPinned
        ? `Чат с ${profile.display_name} откреплен.`
        : `Чат с ${profile.display_name} закреплен.`,
    );
  }

  function saveAllChatFolderName(nextName: string) {
    if (!user) {
      return;
    }

    const updatedAt = new Date().toISOString();

    setAllChatFolderName(nextName);
    window.localStorage.setItem(`hush-chat-all-folder-name-${user.id}`, nextName);
    writeChatFoldersUpdatedAt(user.id, updatedAt);
    saveUserSyncPatch({ allChatFolderName: nextName, chatFoldersUpdatedAt: updatedAt });
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

    if (folderDialog?.profileUserId) {
      const currentFolderIds = chatFolderAssignments[folderDialog.profileUserId] ?? [];
      saveChatFoldersAndAssignments(nextFolders, {
        ...chatFolderAssignments,
        [folderDialog.profileUserId]: Array.from(new Set([...currentFolderIds, folder.id])),
      });
    } else {
      saveChatFolders(nextFolders);
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

    if (showToast) {
      const usernameOrName = profile.username || profile.display_name;
      const toastMessage = isAlreadyAssigned ? (
        interfaceLanguage === "en" ? (
          React.createElement("span", null,
            "You removed ",
            React.createElement("strong", { className: "font-bold text-[#f4f4f5]" }, usernameOrName),
            ` from folder "${folder.name}"`
          )
        ) : (
          React.createElement("span", null,
            "Вы убрали ",
            React.createElement("strong", { className: "font-bold text-[#f4f4f5]" }, usernameOrName),
            ` из папки «${folder.name}»`
          )
        )
      ) : (
        interfaceLanguage === "en" ? (
          React.createElement("span", null,
            "You added ",
            React.createElement("strong", { className: "font-bold text-[#f4f4f5]" }, usernameOrName),
            ` to folder "${folder.name}"`
          )
        ) : (
          React.createElement("span", null,
            "Вы добавили ",
            React.createElement("strong", { className: "font-bold text-[#f4f4f5]" }, usernameOrName),
            ` в папку «${folder.name}»`
          )
        )
      );
      showToast(toastMessage);
    } else {
      setErrorMessage(
        isAlreadyAssigned
          ? `Чат убран из папки «${folder.name}».`
          : `Чат добавлен в папку «${folder.name}».`
      );
    }
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
    if (!user) {
      return;
    }

    const nextFolders = chatFolders.filter((folder) => folder.id !== folderId);
    const nextAssignments = Object.fromEntries(
      Object.entries(chatFolderAssignments)
        .map(([profileUserId, folderIds]) => [
          profileUserId,
          folderIds.filter((currentFolderId) => currentFolderId !== folderId),
        ] as const)
        .filter(([, folderIds]) => folderIds.length > 0),
    );
    const updatedAt = new Date().toISOString();

    setChatFolders(nextFolders);
    setChatFolderAssignments(nextAssignments);
    window.localStorage.setItem(`hush-chat-folders-${user.id}`, JSON.stringify(nextFolders));
    window.localStorage.setItem(
      `hush-chat-folder-assignments-${user.id}`,
      JSON.stringify(nextAssignments),
    );
    writeChatFoldersUpdatedAt(user.id, updatedAt);
    saveUserSyncPatch({
      chatFolderAssignments: nextAssignments,
      chatFolders: nextFolders,
      chatFoldersUpdatedAt: updatedAt,
    });

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
    pinnedChatProfileIds,
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
    togglePinnedChatProfile,
    unarchiveChatProfile,
    updateChatFolderColor,
  };
}
