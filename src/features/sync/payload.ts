import type { MutedProfileUntil, PinnedMessageIdsByChat } from "@/shared/types";
import { pruneMutedProfiles } from "@/shared/utils/storage";

export type SyncedSettings = {
  areSoftEffectsEnabled?: boolean;
  isLightThemeEnabled?: boolean;
  isOnlineStatusVisible?: boolean;
  isProfileSearchable?: boolean;
};

export function parseStringArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === "string")))
    : [];
}

export function parseNumberArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is number => Number.isInteger(item))))
    : [];
}

export function parsePinnedMessageIdsByChat(value: unknown): PinnedMessageIdsByChat {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, unknown] => typeof entry[0] === "string")
      .map(([chatUserId, ids]) => [chatUserId, parseNumberArray(ids)])
      .filter(([, ids]) => ids.length > 0),
  );
}

export function parseMutedProfiles(value: unknown): MutedProfileUntil {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return pruneMutedProfiles(
    Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, number | null] => {
        const [profileId, muteUntil] = entry;

        return typeof profileId === "string" && (muteUntil === null || typeof muteUntil === "number");
      }),
    ),
  );
}

export function parseSyncedSettings(value: unknown): SyncedSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const settings = value as SyncedSettings;

  return {
    areSoftEffectsEnabled:
      typeof settings.areSoftEffectsEnabled === "boolean" ? settings.areSoftEffectsEnabled : undefined,
    isLightThemeEnabled:
      typeof settings.isLightThemeEnabled === "boolean" ? settings.isLightThemeEnabled : undefined,
    isOnlineStatusVisible:
      typeof settings.isOnlineStatusVisible === "boolean" ? settings.isOnlineStatusVisible : undefined,
    isProfileSearchable:
      typeof settings.isProfileSearchable === "boolean" ? settings.isProfileSearchable : undefined,
  };
}
