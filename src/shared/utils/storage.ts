import type { MutedProfileUntil, PinnedMessageIdsByChat } from "../types";

export function readStoredStringList(key: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeStoredStringList(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private or restricted browser modes.
  }
}

export function readStoredBoolean(key: string, defaultValue: boolean) {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  const storedValue = window.localStorage.getItem(key);

  if (storedValue === "true") {
    return true;
  }

  if (storedValue === "false") {
    return false;
  }

  return defaultValue;
}

export function writeStoredBoolean(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Local storage can be unavailable in private or restricted browser modes.
  }
}

export function pruneMutedProfiles(value: MutedProfileUntil) {
  const now = Date.now();

  return Object.fromEntries(
    Object.entries(value).filter(([, muteUntil]) => {
      return muteUntil === null || muteUntil > now;
    }),
  );
}

export function isProfileMuted(mutedProfiles: MutedProfileUntil, profileId: string) {
  const muteUntil = mutedProfiles[profileId];

  return muteUntil === null || (typeof muteUntil === "number" && muteUntil > Date.now());
}

export function readStoredMutedProfiles() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem("twinline-muted-profiles");
    const parsedValue = storedValue ? JSON.parse(storedValue) : {};

    if (Array.isArray(parsedValue)) {
      return Object.fromEntries(
        parsedValue
          .filter((item): item is string => typeof item === "string")
          .map((profileId) => [profileId, null]),
      );
    }

    if (!parsedValue || typeof parsedValue !== "object") {
      return {};
    }

    return pruneMutedProfiles(Object.fromEntries(
      Object.entries(parsedValue).filter((entry): entry is [string, number | null] => {
        const [profileId, muteUntil] = entry;

        return (
          typeof profileId === "string" &&
          (muteUntil === null || typeof muteUntil === "number")
        );
      }),
    ));
  } catch {
    return {};
  }
}

export function writeStoredMutedProfiles(value: MutedProfileUntil) {
  try {
    window.localStorage.setItem("twinline-muted-profiles", JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private or restricted browser modes.
  }
}

export function readStoredPinnedMessageIds(userId: string) {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(`hush-pinned-messages-${userId}`);
    const parsedValue = storedValue ? JSON.parse(storedValue) : {};

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).map(([chatUserId, ids]) => [
        chatUserId,
        Array.isArray(ids)
          ? ids.filter((id): id is number => Number.isInteger(id))
          : [],
      ]),
    );
  } catch {
    return {};
  }
}

export function writeStoredPinnedMessageIds(userId: string, value: PinnedMessageIdsByChat) {
  try {
    window.localStorage.setItem(`hush-pinned-messages-${userId}`, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private or restricted browser modes.
  }
}
