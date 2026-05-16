import { useState } from "react";
import type { MutedProfileUntil } from "@/shared/types";
import {
  readStoredBoolean,
  readStoredMutedProfiles,
  readStoredStringList,
} from "@/shared/utils/storage";

export function usePrivacySettingsState() {
  const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("twinline-notifications") === "enabled";
  });
  const [isOnlineStatusVisible, setIsOnlineStatusVisible] = useState(() =>
    readStoredBoolean("hush-settings-online-status-visible", true),
  );
  const [isPhoneVisible, setIsPhoneVisible] = useState(() =>
    readStoredBoolean("hush-settings-phone-visible", false),
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
    readStoredStringList("twinline-blocked-profiles"),
  );

  return {
    areNotificationsEnabled,
    setAreNotificationsEnabled,
    isOnlineStatusVisible,
    setIsOnlineStatusVisible,
    isPhoneVisible,
    setIsPhoneVisible,
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
