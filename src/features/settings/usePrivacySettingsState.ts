import { useEffect, useState } from "react";
import type { MutedProfileUntil } from "@/shared/types";
import {
  pruneMutedProfiles,
  readStoredBoolean,
  readStoredMutedProfiles,
  readStoredStringList,
  writeStoredMutedProfiles,
} from "@/shared/utils/storage";

export function usePrivacySettingsState() {
  const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const storedValue =
      window.localStorage.getItem("hush-notifications") ??
      window.localStorage.getItem("twinline-notifications");

    if (storedValue !== null) {
      window.localStorage.setItem("hush-notifications", storedValue);
    }

    return storedValue === "enabled";
  });
  const [isOnlineStatusVisible, setIsOnlineStatusVisible] = useState(() =>
    readStoredBoolean("hush-settings-online-status-visible", true),
  );
  const [isProfileSearchable, setIsProfileSearchable] = useState(() =>
    readStoredBoolean("hush-settings-profile-searchable", true),
  );
  const [areSoftEffectsEnabled, setAreSoftEffectsEnabled] = useState(() =>
    readStoredBoolean("hush-settings-soft-effects", true),
  );
  const [isLightThemeEnabled, setIsLightThemeEnabled] = useState(() =>
    readStoredBoolean("hush-settings-light-theme", false),
  );
  const [mutedProfiles, setMutedProfiles] = useState<MutedProfileUntil>(() =>
    readStoredMutedProfiles(),
  );
  const [localBlockedProfileIds, setLocalBlockedProfileIds] = useState<string[]>(() =>
    readStoredStringList("hush-blocked-profiles", "twinline-blocked-profiles"),
  );

  useEffect(() => {
    const mutedProfilesCleanupInterval = window.setInterval(() => {
      setMutedProfiles((currentMutedProfiles) => {
        const nextMutedProfiles = pruneMutedProfiles(currentMutedProfiles);

        if (Object.keys(nextMutedProfiles).length === Object.keys(currentMutedProfiles).length) {
          return currentMutedProfiles;
        }

        writeStoredMutedProfiles(nextMutedProfiles);
        return nextMutedProfiles;
      });
    }, 60_000);

    return () => {
      window.clearInterval(mutedProfilesCleanupInterval);
    };
  }, []);

  return {
    areNotificationsEnabled,
    setAreNotificationsEnabled,
    isOnlineStatusVisible,
    setIsOnlineStatusVisible,
    isProfileSearchable,
    setIsProfileSearchable,
    areSoftEffectsEnabled,
    setAreSoftEffectsEnabled,
    isLightThemeEnabled,
    setIsLightThemeEnabled,
    mutedProfiles,
    setMutedProfiles,
    localBlockedProfileIds,
    setLocalBlockedProfileIds,
  };
}
