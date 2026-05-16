import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isActiveView } from "@/shared/constants";
import type { ActiveView, StoredNavigationState } from "@/shared/types";

type UseAuthSessionStateParams = {
  activeView: ActiveView;
  onAuthUserChange: () => void;
  selectedChatUserId: string | null;
  setActiveView: (view: ActiveView) => void;
  setSelectedChatUserId: (userId: string | null) => void;
};

export function useAuthSessionState({
  activeView,
  onAuthUserChange,
  selectedChatUserId,
  setActiveView,
  setSelectedChatUserId,
}: UseAuthSessionStateParams) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasRestoredNavigationRef = useRef(false);
  const restoredNavigationUserIdRef = useRef<string | null>(null);

  const restoreNavigationForUser = useCallback(
    (nextUser: User | null) => {
      if (!nextUser) {
        hasRestoredNavigationRef.current = false;
        restoredNavigationUserIdRef.current = null;
        setActiveView("profile");
        setSelectedChatUserId(null);
        return;
      }

      if (
        hasRestoredNavigationRef.current &&
        restoredNavigationUserIdRef.current === nextUser.id
      ) {
        return;
      }

      hasRestoredNavigationRef.current = false;
      restoredNavigationUserIdRef.current = nextUser.id;

      const storedNavigation = window.localStorage.getItem(
        `hush-navigation-${nextUser.id}`,
      );

      if (!storedNavigation) {
        hasRestoredNavigationRef.current = true;
        return;
      }

      try {
        const parsedNavigation = JSON.parse(storedNavigation) as StoredNavigationState;
        const restoredView = isActiveView(parsedNavigation.activeView)
          ? parsedNavigation.activeView
          : "profile";
        const restoredChatUserId =
          typeof parsedNavigation.selectedChatUserId === "string"
            ? parsedNavigation.selectedChatUserId
            : null;

        flushSync(() => {
          setActiveView(restoredView);
          setSelectedChatUserId(
            restoredView === "messages" ? restoredChatUserId : null,
          );
        });
      } catch {
        flushSync(() => {
          setActiveView("profile");
          setSelectedChatUserId(null);
        });
      } finally {
        hasRestoredNavigationRef.current = true;
      }
    },
    [setActiveView, setSelectedChatUserId],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;

      restoreNavigationForUser(sessionUser);
      setUser(sessionUser);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;

      restoreNavigationForUser(sessionUser);
      setUser(sessionUser);
      onAuthUserChange();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onAuthUserChange, restoreNavigationForUser]);

  useEffect(() => {
    if (!user || !hasRestoredNavigationRef.current) {
      return;
    }

    window.localStorage.setItem(
      `hush-navigation-${user.id}`,
      JSON.stringify({
        activeView,
        selectedChatUserId: activeView === "messages" ? selectedChatUserId : null,
      }),
    );
  }, [activeView, selectedChatUserId, user]);

  return {
    user,
    isAuthLoading,
    isSigningOut,
    setIsSigningOut,
  };
}
