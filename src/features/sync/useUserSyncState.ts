import type { SetStateAction } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  defaultInterfaceLanguage,
  interfaceLanguageStorageKey,
  isInterfaceLanguage,
  translations,
  type InterfaceLanguage,
} from "@/shared/i18n";
import type {
  ChatFolder,
  FavoriteItem,
  MutedProfileUntil,
  PinnedMessageIdsByChat,
} from "@/shared/types";
import {
  pruneMutedProfiles,
  writeStoredBoolean,
  writeStoredMutedProfiles,
  writeStoredPinnedMessageIds,
  writeStoredStringList,
} from "@/shared/utils/storage";
import {
  fetchUserSyncState,
  upsertUserSyncState,
  type UserSyncPayload,
} from "@/features/sync/queries";
import {
  parseMutedProfiles,
  parseNumberArray,
  parsePinnedMessageIdsByChat,
  parseStringArray,
  parseSyncedSettings,
} from "@/features/sync/payload";

type SaveUserSyncPatchRef = {
  current: (patch: UserSyncPayload) => void;
};

type UserSyncStateParams = {
  allChatFolderName: string;
  applyChatFoldersSyncPayload: (payload: UserSyncPayload, syncUserId: string) => void;
  applyFavoritesSyncPayload: (payload: UserSyncPayload, syncUserId: string) => void;
  archivedChatProfileIds: string[];
  areSoftEffectsEnabled: boolean;
  avatarHistory: string[];
  chatFolderAssignments: Record<string, string[]>;
  chatFolders: ChatFolder[];
  favoriteItems: FavoriteItem[];
  hiddenMessageIds: number[];
  interfaceLanguage: InterfaceLanguage;
  isLightThemeEnabled: boolean;
  isOnlineStatusVisible: boolean;
  isProfileSearchable: boolean;
  localBlockedProfileIds: string[];
  mutedProfiles: MutedProfileUntil;
  pinnedChatProfileIds: string[];
  pinnedMessageIdsByChat: PinnedMessageIdsByChat;
  readLocalChatFoldersSyncPayload: (syncUserId: string) => UserSyncPayload;
  readLocalFavoritesSyncPayload: (syncUserId: string) => UserSyncPayload;
  resetChatFoldersState: () => void;
  saveUserSyncPatchRef: SaveUserSyncPatchRef;
  setAreSoftEffectsEnabled: (value: boolean) => void;
  setAvatarHistory: (history: string[]) => void;
  setErrorMessage: (message: string) => void;
  setHiddenMessageIds: (ids: number[]) => void;
  setInterfaceLanguage: (language: InterfaceLanguage) => void;
  setIsLightThemeEnabled: (value: boolean) => void;
  setIsOnlineStatusVisible: (value: boolean) => void;
  setIsProfileSearchable: (value: boolean) => void;
  setLocalBlockedProfileIds: (ids: string[]) => void;
  setMutedProfiles: (profiles: MutedProfileUntil) => void;
  setPinnedMessageIdsByChat: (idsByChat: PinnedMessageIdsByChat) => void;
  setProfileNotificationMenuUserId: (userId: string | null) => void;
  user: User | null;
};

function getSyncPayloadStringValue(payload: UserSyncPayload, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value : "1970-01-01T00:00:00.000Z";
}

function areSyncPayloadsEqual(
  firstPayload: UserSyncPayload,
  secondPayload: UserSyncPayload,
) {
  try {
    return JSON.stringify(firstPayload) === JSON.stringify(secondPayload);
  } catch {
    return false;
  }
}

function createSyncClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sync-client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useUserSyncState({
  allChatFolderName,
  applyChatFoldersSyncPayload,
  applyFavoritesSyncPayload,
  archivedChatProfileIds,
  areSoftEffectsEnabled,
  avatarHistory,
  chatFolderAssignments,
  chatFolders,
  favoriteItems,
  hiddenMessageIds,
  interfaceLanguage,
  isLightThemeEnabled,
  isOnlineStatusVisible,
  isProfileSearchable,
  localBlockedProfileIds,
  mutedProfiles,
  pinnedChatProfileIds,
  pinnedMessageIdsByChat,
  readLocalChatFoldersSyncPayload,
  readLocalFavoritesSyncPayload,
  resetChatFoldersState,
  saveUserSyncPatchRef,
  setAreSoftEffectsEnabled,
  setAvatarHistory,
  setErrorMessage,
  setHiddenMessageIds,
  setInterfaceLanguage,
  setIsLightThemeEnabled,
  setIsOnlineStatusVisible,
  setIsProfileSearchable,
  setLocalBlockedProfileIds,
  setMutedProfiles,
  setPinnedMessageIdsByChat,
  setProfileNotificationMenuUserId,
  user,
}: UserSyncStateParams) {
  const userSyncPayloadRef = useRef<UserSyncPayload>({});
  const userSyncChannelRef = useRef<RealtimeChannel | null>(null);
  const userSyncClientIdRef = useRef<string | null>(null);
  const isApplyingRemoteSyncRef = useRef(false);

  const getUserSyncClientId = useCallback(() => {
    if (!userSyncClientIdRef.current) {
      userSyncClientIdRef.current = createSyncClientId();
    }

    return userSyncClientIdRef.current;
  }, []);

  const broadcastUserSyncPayload = useCallback(
    (payload: UserSyncPayload) => {
      void userSyncChannelRef.current?.send({
        event: "sync-payload",
        payload: {
          originId: getUserSyncClientId(),
          payload,
        },
        type: "broadcast",
      });
    },
    [getUserSyncClientId],
  );

  const saveUserSyncPatch = useCallback(
    (patch: UserSyncPayload) => {
      if (!user || isApplyingRemoteSyncRef.current) {
        return;
      }

      const nextPayload: UserSyncPayload = {
        ...userSyncPayloadRef.current,
        allChatFolderName,
        archivedChatProfileIds,
        avatarHistory,
        blockedProfileIds: localBlockedProfileIds,
        chatFolderAssignments,
        chatFolders,
        favoriteItems,
        hiddenMessageIds,
        interfaceLanguage,
        mutedProfiles,
        pinnedChatProfileIds,
        pinnedMessageIdsByChat,
        settings: {
          areSoftEffectsEnabled,
          isLightThemeEnabled,
          isOnlineStatusVisible,
          isProfileSearchable,
        },
        ...patch,
      };

      userSyncPayloadRef.current = nextPayload;
      broadcastUserSyncPayload(nextPayload);
      void upsertUserSyncState(user.id, nextPayload);
    },
    [
      allChatFolderName,
      archivedChatProfileIds,
      areSoftEffectsEnabled,
      avatarHistory,
      broadcastUserSyncPayload,
      chatFolderAssignments,
      chatFolders,
      favoriteItems,
      hiddenMessageIds,
      interfaceLanguage,
      isLightThemeEnabled,
      isOnlineStatusVisible,
      isProfileSearchable,
      localBlockedProfileIds,
      mutedProfiles,
      pinnedChatProfileIds,
      pinnedMessageIdsByChat,
      user,
    ],
  );

  useLayoutEffect(() => {
    saveUserSyncPatchRef.current = saveUserSyncPatch;
  }, [saveUserSyncPatch, saveUserSyncPatchRef]);

  const setSyncedInterfaceLanguage = useCallback(
    (nextLanguageValue: SetStateAction<InterfaceLanguage>) => {
      const nextLanguage =
        typeof nextLanguageValue === "function"
          ? nextLanguageValue(interfaceLanguage)
          : nextLanguageValue;

      setInterfaceLanguage(nextLanguage);
      window.localStorage.setItem(interfaceLanguageStorageKey, nextLanguage);
      saveUserSyncPatch({ interfaceLanguage: nextLanguage });
    },
    [interfaceLanguage, saveUserSyncPatch, setInterfaceLanguage],
  );

  const saveHiddenMessageIds = useCallback(
    (nextIds: number[]) => {
      if (!user) {
        return;
      }

      const normalizedIds = parseNumberArray(nextIds);

      setHiddenMessageIds(normalizedIds);
      window.localStorage.setItem(`hush-hidden-messages-${user.id}`, JSON.stringify(normalizedIds));
      saveUserSyncPatch({ hiddenMessageIds: normalizedIds });
    },
    [saveUserSyncPatch, setHiddenMessageIds, user],
  );

  const savePinnedMessageIdsByChat = useCallback(
    (nextPinnedMessageIdsByChat: PinnedMessageIdsByChat) => {
      if (!user) {
        return;
      }

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
      saveUserSyncPatch({ pinnedMessageIdsByChat: nextPinnedMessageIdsByChat });
    },
    [saveUserSyncPatch, setPinnedMessageIdsByChat, user],
  );

  const toggleStoredBooleanSetting = useCallback(
    (
      key: string,
      setter: (value: boolean) => void,
      currentValue: boolean,
    ) => {
      const nextValue = !currentValue;

      setter(nextValue);
      writeStoredBoolean(key, nextValue);
      saveUserSyncPatch({
        settings: {
          areSoftEffectsEnabled: key === "hush-settings-soft-effects" ? nextValue : areSoftEffectsEnabled,
          isLightThemeEnabled: key === "hush-settings-light-theme" ? nextValue : isLightThemeEnabled,
          isOnlineStatusVisible:
            key === "hush-settings-online-status-visible" ? nextValue : isOnlineStatusVisible,
          isProfileSearchable:
            key === "hush-settings-profile-searchable" ? nextValue : isProfileSearchable,
        },
      });
      setErrorMessage("");
    },
    [
      areSoftEffectsEnabled,
      isLightThemeEnabled,
      isOnlineStatusVisible,
      isProfileSearchable,
      saveUserSyncPatch,
      setErrorMessage,
    ],
  );

  const muteProfileNotifications = useCallback(
    (profileUserId: string, durationMs: number | null) => {
      if (!profileUserId) {
        return;
      }

      const nextMutedProfiles = pruneMutedProfiles({
        ...mutedProfiles,
        [profileUserId]: durationMs === null ? null : Date.now() + durationMs,
      });

      setMutedProfiles(nextMutedProfiles);
      writeStoredMutedProfiles(nextMutedProfiles);
      saveUserSyncPatch({ mutedProfiles: nextMutedProfiles });
      setProfileNotificationMenuUserId(null);
      setErrorMessage("");
    },
    [
      mutedProfiles,
      saveUserSyncPatch,
      setErrorMessage,
      setMutedProfiles,
      setProfileNotificationMenuUserId,
    ],
  );

  const unmuteProfileNotifications = useCallback(
    (profileUserId: string) => {
      const nextMutedProfiles = { ...mutedProfiles };

      delete nextMutedProfiles[profileUserId];

      setMutedProfiles(nextMutedProfiles);
      writeStoredMutedProfiles(nextMutedProfiles);
      saveUserSyncPatch({ mutedProfiles: nextMutedProfiles });
      setProfileNotificationMenuUserId(null);
    },
    [
      mutedProfiles,
      saveUserSyncPatch,
      setMutedProfiles,
      setProfileNotificationMenuUserId,
    ],
  );

  useEffect(() => {
    if (!user) {
      const frameId = window.requestAnimationFrame(() => {
        resetChatFoldersState();
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    let isMounted = true;
    const syncUserId = user.id;

    function applySyncPayload(payload: UserSyncPayload) {
      const syncedSettings = parseSyncedSettings(payload.settings);
      const nextAvatarHistory = parseStringArray(payload.avatarHistory);
      const nextHiddenMessageIds = parseNumberArray(payload.hiddenMessageIds);
      const nextInterfaceLanguage = isInterfaceLanguage(payload.interfaceLanguage)
        ? payload.interfaceLanguage
        : null;
      const nextMutedProfiles = parseMutedProfiles(payload.mutedProfiles);
      const nextPinnedMessageIdsByChat = parsePinnedMessageIdsByChat(payload.pinnedMessageIdsByChat);
      const nextBlockedProfileIds = parseStringArray(payload.blockedProfileIds);

      isApplyingRemoteSyncRef.current = true;
      userSyncPayloadRef.current = payload;

      applyChatFoldersSyncPayload(payload, syncUserId);
      applyFavoritesSyncPayload(payload, syncUserId);
      setAvatarHistory(nextAvatarHistory);
      setHiddenMessageIds(nextHiddenMessageIds);
      setMutedProfiles(nextMutedProfiles);
      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      setLocalBlockedProfileIds(nextBlockedProfileIds);
      window.localStorage.setItem(`hush-avatar-history-${syncUserId}`, JSON.stringify(nextAvatarHistory));
      window.localStorage.setItem(`hush-hidden-messages-${syncUserId}`, JSON.stringify(nextHiddenMessageIds));
      writeStoredMutedProfiles(nextMutedProfiles);
      writeStoredPinnedMessageIds(syncUserId, nextPinnedMessageIdsByChat);
      writeStoredStringList("hush-blocked-profiles", nextBlockedProfileIds);

      if (nextInterfaceLanguage) {
        setInterfaceLanguage(nextInterfaceLanguage);
        window.localStorage.setItem(interfaceLanguageStorageKey, nextInterfaceLanguage);
      }

      if (typeof syncedSettings.isOnlineStatusVisible === "boolean") {
        setIsOnlineStatusVisible(syncedSettings.isOnlineStatusVisible);
        writeStoredBoolean("hush-settings-online-status-visible", syncedSettings.isOnlineStatusVisible);
      }

      if (typeof syncedSettings.isProfileSearchable === "boolean") {
        setIsProfileSearchable(syncedSettings.isProfileSearchable);
        writeStoredBoolean("hush-settings-profile-searchable", syncedSettings.isProfileSearchable);
      }

      if (typeof syncedSettings.areSoftEffectsEnabled === "boolean") {
        setAreSoftEffectsEnabled(syncedSettings.areSoftEffectsEnabled);
        writeStoredBoolean("hush-settings-soft-effects", syncedSettings.areSoftEffectsEnabled);
      }

      if (typeof syncedSettings.isLightThemeEnabled === "boolean") {
        setIsLightThemeEnabled(syncedSettings.isLightThemeEnabled);
        writeStoredBoolean("hush-settings-light-theme", syncedSettings.isLightThemeEnabled);
      }

      window.requestAnimationFrame(() => {
        isApplyingRemoteSyncRef.current = false;
      });
    }

    function readLocalSyncPayload(): UserSyncPayload {
      try {
        return {
          avatarHistory,
          blockedProfileIds: localBlockedProfileIds,
          hiddenMessageIds,
          interfaceLanguage,
          ...readLocalFavoritesSyncPayload(syncUserId),
          ...readLocalChatFoldersSyncPayload(syncUserId),
          mutedProfiles,
          pinnedMessageIdsByChat,
          settings: {
            areSoftEffectsEnabled,
            isLightThemeEnabled,
            isOnlineStatusVisible,
            isProfileSearchable,
          },
        };
      } catch {
        return {
          allChatFolderName: translations[interfaceLanguage]?.allChats ?? translations[defaultInterfaceLanguage].allChats,
          archivedChatProfileIds: [],
          avatarHistory,
          blockedProfileIds: localBlockedProfileIds,
          chatFolderAssignments: {},
          chatFolders: [],
          chatFoldersUpdatedAt: "1970-01-01T00:00:00.000Z",
          favoriteItems: [],
          favoriteItemsUpdatedAt: "1970-01-01T00:00:00.000Z",
          hiddenMessageIds,
          interfaceLanguage,
          mutedProfiles,
          pinnedChatProfileIds: [],
          pinnedMessageIdsByChat,
          settings: {
            areSoftEffectsEnabled,
            isLightThemeEnabled,
            isOnlineStatusVisible,
            isProfileSearchable,
          },
        };
      }
    }

    function mergeNewerLocalFavorites(remotePayload: UserSyncPayload) {
      const localFavoritesPayload = readLocalFavoritesSyncPayload(syncUserId);
      const localFavoritesUpdatedAt = getSyncPayloadStringValue(
        localFavoritesPayload,
        "favoriteItemsUpdatedAt",
      );
      const remoteFavoritesUpdatedAt = getSyncPayloadStringValue(
        remotePayload,
        "favoriteItemsUpdatedAt",
      );

      if (localFavoritesUpdatedAt <= remoteFavoritesUpdatedAt) {
        return remotePayload;
      }

      return {
        ...remotePayload,
        favoriteItems: localFavoritesPayload.favoriteItems,
        favoriteItemsUpdatedAt: localFavoritesPayload.favoriteItemsUpdatedAt,
      };
    }

    function mergeNewerLocalChatFolders(remotePayload: UserSyncPayload) {
      const localChatFoldersPayload = readLocalChatFoldersSyncPayload(syncUserId);
      const localChatFoldersUpdatedAt = getSyncPayloadStringValue(
        localChatFoldersPayload,
        "chatFoldersUpdatedAt",
      );
      const remoteChatFoldersUpdatedAt = getSyncPayloadStringValue(
        remotePayload,
        "chatFoldersUpdatedAt",
      );

      if (localChatFoldersUpdatedAt <= remoteChatFoldersUpdatedAt) {
        return remotePayload;
      }

      return {
        ...remotePayload,
        allChatFolderName: localChatFoldersPayload.allChatFolderName,
        archivedChatProfileIds: localChatFoldersPayload.archivedChatProfileIds,
        chatFolderAssignments: localChatFoldersPayload.chatFolderAssignments,
        chatFolders: localChatFoldersPayload.chatFolders,
        chatFoldersUpdatedAt: localChatFoldersPayload.chatFoldersUpdatedAt,
        pinnedChatProfileIds: localChatFoldersPayload.pinnedChatProfileIds,
      };
    }

    function applyRemoteSyncPayload(remotePayload: UserSyncPayload) {
      const nextPayload = mergeNewerLocalFavorites(
        mergeNewerLocalChatFolders(remotePayload),
      );

      if (areSyncPayloadsEqual(userSyncPayloadRef.current, nextPayload)) {
        return;
      }

      applySyncPayload(nextPayload);

      if (nextPayload !== remotePayload) {
        userSyncPayloadRef.current = nextPayload;
        broadcastUserSyncPayload(nextPayload);
        void upsertUserSyncState(syncUserId, nextPayload);
      }
    }

    const frameId = window.requestAnimationFrame(() => {
      const localPayload = readLocalSyncPayload();

      void fetchUserSyncState().then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (!error && data?.payload && typeof data.payload === "object") {
          const remotePayload = data.payload as UserSyncPayload;
          const localBackfillPayload: UserSyncPayload = {};

          for (const key of [
            "allChatFolderName",
            "archivedChatProfileIds",
            "avatarHistory",
            "blockedProfileIds",
            "chatFolderAssignments",
            "chatFolders",
            "chatFoldersUpdatedAt",
            "favoriteItems",
            "favoriteItemsUpdatedAt",
            "hiddenMessageIds",
            "interfaceLanguage",
            "mutedProfiles",
            "pinnedChatProfileIds",
            "pinnedMessageIdsByChat",
            "settings",
          ]) {
            if (!(key in remotePayload) && key in localPayload) {
              localBackfillPayload[key] = localPayload[key];
            }
          }

          const nextPayload =
            Object.keys(localBackfillPayload).length > 0
              ? { ...remotePayload, ...localBackfillPayload }
              : remotePayload;

          applyRemoteSyncPayload(nextPayload);

          if (nextPayload !== remotePayload) {
            userSyncPayloadRef.current = nextPayload;
            broadcastUserSyncPayload(nextPayload);
            void upsertUserSyncState(syncUserId, nextPayload);
          }

          return;
        }

        if (error) {
          return;
        }

        applySyncPayload(localPayload);
        userSyncPayloadRef.current = localPayload;
        broadcastUserSyncPayload(localPayload);
        void upsertUserSyncState(syncUserId, localPayload);
      });
    });

    const syncChannel = supabase
      .channel(`user-sync-state-${syncUserId}`, {
        config: {
          broadcast: {
            ack: true,
            self: false,
          },
        },
      })
      .on(
        "broadcast",
        { event: "sync-payload" },
        (event) => {
          const broadcastPayload = event.payload;

          if (!broadcastPayload || typeof broadcastPayload !== "object") {
            return;
          }

          const {
            originId,
            payload: nextPayload,
          } = broadcastPayload as {
            originId?: unknown;
            payload?: unknown;
          };

          if (originId === userSyncClientIdRef.current) {
            return;
          }

          if (nextPayload && typeof nextPayload === "object") {
            applyRemoteSyncPayload(nextPayload as UserSyncPayload);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_sync_states",
          filter: `user_id=eq.${syncUserId}`,
        },
        (payload) => {
          if (!isMounted || !payload.new || !("payload" in payload.new)) {
            return;
          }

          const nextPayload = payload.new.payload;

          if (nextPayload && typeof nextPayload === "object") {
            applyRemoteSyncPayload(nextPayload as UserSyncPayload);
          }
        },
      )
      .subscribe();

    userSyncChannelRef.current = syncChannel;

    function fetchRemoteSyncState() {
      if (document.visibilityState !== "visible") {
        return;
      }

      void fetchUserSyncState().then(({ data, error }) => {
        if (
          !isMounted ||
          error ||
          !data?.payload ||
          typeof data.payload !== "object"
        ) {
          return;
        }

        applyRemoteSyncPayload(data.payload as UserSyncPayload);
      });
    }

    const syncFallbackInterval = window.setInterval(fetchRemoteSyncState, 5_000);

    window.addEventListener("focus", fetchRemoteSyncState);
    document.addEventListener("visibilitychange", fetchRemoteSyncState);

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(frameId);
      window.clearInterval(syncFallbackInterval);
      window.removeEventListener("focus", fetchRemoteSyncState);
      document.removeEventListener("visibilitychange", fetchRemoteSyncState);
      if (userSyncChannelRef.current === syncChannel) {
        userSyncChannelRef.current = null;
      }
      void supabase.removeChannel(syncChannel);
    };
    // Remote sync is loaded only when the account changes. Setting/folder writes go through saveUserSyncPatch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    muteProfileNotifications,
    saveHiddenMessageIds,
    savePinnedMessageIdsByChat,
    setSyncedInterfaceLanguage,
    toggleStoredBooleanSetting,
    unmuteProfileNotifications,
  };
}
