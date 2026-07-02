import { createContext, useContext, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction, ReactNode } from "react";
import { usePrivacySettingsState } from "@/features/settings/usePrivacySettingsState";
import type { MutedProfileUntil } from "@/shared/types";
import { useApp } from "@/shared/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import { registerHushServiceWorker } from "@/shared/utils/notifications";

type SettingsContextType = {
  areNotificationsEnabled: boolean;
  setAreNotificationsEnabled: Dispatch<SetStateAction<boolean>>;
  isOnlineStatusVisible: boolean;
  setIsOnlineStatusVisible: Dispatch<SetStateAction<boolean>>;
  isProfileSearchable: boolean;
  setIsProfileSearchable: Dispatch<SetStateAction<boolean>>;
  areSoftEffectsEnabled: boolean;
  setAreSoftEffectsEnabled: Dispatch<SetStateAction<boolean>>;
  isLightThemeEnabled: boolean;
  setIsLightThemeEnabled: Dispatch<SetStateAction<boolean>>;
  mutedProfiles: MutedProfileUntil;
  setMutedProfiles: Dispatch<SetStateAction<MutedProfileUntil>>;
  localBlockedProfileIds: string[];
  setLocalBlockedProfileIds: Dispatch<SetStateAction<string[]>>;
  toggleNotifications: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsContextProvider({ children }: { children: ReactNode }) {
  const settingsState = usePrivacySettingsState();
  const { setErrorMessage } = useApp();
  const { user } = useAuth();
  const {
    areNotificationsEnabled,
    setAreNotificationsEnabled,
  } = settingsState;

  // Notifications registration on mount/auth-change
  useEffect(() => {
    if (user?.id) {
      void registerHushServiceWorker();
    }
  }, [user]);

  const toggleNotifications = useCallback(async () => {
    const nextValue = !areNotificationsEnabled;

    if (nextValue && "Notification" in window) {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setErrorMessage("Браузер не разрешил уведомления.");
        return;
      }

      const serviceWorkerRegistration = await registerHushServiceWorker();

      if (!serviceWorkerRegistration) {
        setErrorMessage("Браузер не смог подключить уведомления Hush.");
        return;
      }
    }

    setAreNotificationsEnabled(nextValue);
    window.localStorage.setItem(
      "hush-notifications",
      nextValue ? "enabled" : "disabled",
    );
    setErrorMessage("");
  }, [areNotificationsEnabled, setAreNotificationsEnabled, setErrorMessage]);

  return (
    <SettingsContext.Provider value={{ ...settingsState, toggleNotifications }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsContextProvider");
  }
  return context;
}
