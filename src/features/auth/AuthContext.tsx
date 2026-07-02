import { createContext, useContext, useCallback } from "react";
import type { Dispatch, SetStateAction, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuthFormState } from "@/features/auth/useAuthFormState";
import { useAuthSessionState } from "@/features/auth/useAuthSessionState";
import { useApp } from "@/shared/context/AppContext";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  isAuthLoading: boolean;
  isSigningOut: boolean;
  setIsSigningOut: Dispatch<SetStateAction<boolean>>;
  authMode: "sign-in" | "sign-up";
  setAuthMode: Dispatch<SetStateAction<"sign-in" | "sign-up">>;
  authUsername: string;
  setAuthUsername: Dispatch<SetStateAction<string>>;
  authUsernameError: string;
  setAuthUsernameError: Dispatch<SetStateAction<string>>;
  authEmail: string;
  setAuthEmail: Dispatch<SetStateAction<string>>;
  authPassword: string;
  setAuthPassword: Dispatch<SetStateAction<string>>;
  handleSignOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const {
    activeView,
    setActiveView,
    selectedChatUserId,
    setSelectedChatUserId,
  } = useApp();

  const {
    authMode,
    setAuthMode,
    authUsername,
    setAuthUsername,
    authUsernameError,
    setAuthUsernameError,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
  } = useAuthFormState();

  const handleAuthUserChange = useCallback(() => {}, []);

  const {
    user,
    isAuthLoading,
    isSigningOut,
    setIsSigningOut,
  } = useAuthSessionState({
    activeView,
    onAuthUserChange: handleAuthUserChange,
    selectedChatUserId,
    setActiveView,
    setSelectedChatUserId,
  });

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setIsSigningOut(false);
    }
  }, [setIsSigningOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        isSigningOut,
        setIsSigningOut,
        authMode,
        setAuthMode,
        authUsername,
        setAuthUsername,
        authUsernameError,
        setAuthUsernameError,
        authEmail,
        setAuthEmail,
        authPassword,
        setAuthPassword,
        handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
}
