import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import type { Dispatch, SetStateAction, ReactNode, RefObject } from "react";
import { useNavigationState } from "@/features/navigation/useNavigationState";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";
import { defaultInterfaceLanguage, interfaceLanguageStorageKey, isInterfaceLanguage } from "@/shared/i18n";
import type { InterfaceLanguage } from "@/shared/i18n";
import type { ActiveView } from "@/shared/types";
import { I18nProvider } from "@/shared/i18n-context";
import type { UserSyncPayload } from "@/features/sync/queries";

type AppContextType = {
  interfaceLanguage: InterfaceLanguage;
  setInterfaceLanguage: Dispatch<SetStateAction<InterfaceLanguage>>;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedChatUserId: string | null;
  setSelectedChatUserId: (userId: string | null) => void;
  selectedImageUrl: string | null;
  setSelectedImageUrl: (url: string | null) => void;
  viewedProfile: ViewedProfileState | null;
  setViewedProfile: Dispatch<SetStateAction<ViewedProfileState | null>>;
  errorMessage: string;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  saveUserSyncPatch: (patch: UserSyncPayload) => void;
  saveUserSyncPatchRef: RefObject<((patch: UserSyncPayload) => void) | null>;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [errorMessage, setErrorMessage] = useState("");
  const saveUserSyncPatchRef = useRef<((patch: UserSyncPayload) => void) | null>(null);
  const saveUserSyncPatch = useCallback((patch: UserSyncPayload) => {
    if (saveUserSyncPatchRef.current) {
      saveUserSyncPatchRef.current(patch);
    }
  }, []);

  const [interfaceLanguage, setInterfaceLanguage] = useState<InterfaceLanguage>(() => {
    if (typeof window === "undefined") {
      return defaultInterfaceLanguage;
    }
    const storedLanguage = window.localStorage.getItem(interfaceLanguageStorageKey);
    return isInterfaceLanguage(storedLanguage) ? storedLanguage : defaultInterfaceLanguage;
  });

  useEffect(() => {
    window.localStorage.setItem(interfaceLanguageStorageKey, interfaceLanguage);
    document.documentElement.lang = interfaceLanguage;
  }, [interfaceLanguage]);

  const {
    activeView,
    setActiveView,
    selectedChatUserId,
    setSelectedChatUserId,
    selectedImageUrl,
    setSelectedImageUrl,
    viewedProfile,
    setViewedProfile,
  } = useNavigationState();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Handle query parameter (?hushChat=...)
    const params = new URLSearchParams(window.location.search);
    const hushChat = params.get("hushChat");
    if (hushChat) {
      setActiveView("messages");
      setSelectedChatUserId(hushChat);

      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }

    // 2. Handle service worker postMessage
    if ("serviceWorker" in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "hush-open-chat") {
          const userId = event.data.userId;
          setActiveView("messages");
          setSelectedChatUserId(userId);
        }
      };

      navigator.serviceWorker.addEventListener("message", handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      };
    }
  }, [setActiveView, setSelectedChatUserId]);

  return (
    <AppContext.Provider
      value={{
        interfaceLanguage,
        setInterfaceLanguage,
        activeView,
        setActiveView,
        selectedChatUserId,
        setSelectedChatUserId,
        selectedImageUrl,
        setSelectedImageUrl,
        viewedProfile,
        setViewedProfile,
        errorMessage,
        setErrorMessage,
        saveUserSyncPatch,
        saveUserSyncPatchRef,
      }}
    >
      <I18nProvider language={interfaceLanguage} setLanguage={setInterfaceLanguage}>
        {children}
      </I18nProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppContextProvider");
  }
  return context;
}
