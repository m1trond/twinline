import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type EmailVerificationStateParams = {
  setErrorMessage: (message: string) => void;
  user: User | null;
};

function isSupabaseEmailVerified(user: User | null) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

let activeUserPromise: Promise<{ data: { user: User | null } }> | null = null;

async function getDeduplicatedUser(): Promise<{ data: { user: User | null } }> {
  if (activeUserPromise) {
    return activeUserPromise!;
  }
  const promise = supabase.auth.getUser() as unknown as Promise<{ data: { user: User | null } }>;
  activeUserPromise = promise;
  try {
    const result = await promise;
    return result;
  } catch (error) {
    console.warn("Supabase auth getUser error caught:", error);
    return { data: { user: null } };
  } finally {
    activeUserPromise = null;
  }
}

export function useEmailVerificationState({
  setErrorMessage,
  user,
}: EmailVerificationStateParams) {
  const [isEmailVerificationModalOpen, setIsEmailVerificationModalOpen] = useState(false);
  const [isSendingEmailVerification, setIsSendingEmailVerification] = useState(false);
  const [isEmailVerifiedInHush, setIsEmailVerifiedInHush] = useState(false);

  useEffect(() => {
    let clearFrameId = 0;

    if (!user) {
      clearFrameId = window.requestAnimationFrame(() => {
        setIsEmailVerifiedInHush(false);
        setIsEmailVerificationModalOpen(false);
      });

      return () => window.cancelAnimationFrame(clearFrameId);
    }

    let isMounted = true;

    async function syncEmailVerification() {
      const { data } = await getDeduplicatedUser();
      const nextUser = data.user ?? user;
      const isVerified = isSupabaseEmailVerified(nextUser);

      if (!isMounted) {
        return;
      }

      setIsEmailVerifiedInHush(isVerified);

      if (isVerified) {
        setIsEmailVerificationModalOpen(false);
      }
    }

    clearFrameId = window.requestAnimationFrame(() => {
      setIsEmailVerifiedInHush(isSupabaseEmailVerified(user));
    });
    void syncEmailVerification();

    const verificationInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncEmailVerification();
      }
    }, 15_000);

    function syncOnFocus() {
      void syncEmailVerification();
    }

    window.addEventListener("focus", syncOnFocus);
    document.addEventListener("visibilitychange", syncOnFocus);

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(clearFrameId);
      window.clearInterval(verificationInterval);
      window.removeEventListener("focus", syncOnFocus);
      document.removeEventListener("visibilitychange", syncOnFocus);
    };
  }, [user]);

  const sendEmailVerificationLetter = useCallback(async () => {
    if (!user?.email || isSendingEmailVerification) {
      return;
    }

    setIsSendingEmailVerification(true);
    setErrorMessage("");

    const emailRedirectTo =
      typeof window === "undefined" ? undefined : `${window.location.origin}/auth/confirm`;
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: {
        emailRedirectTo,
        shouldCreateUser: false,
      },
    });

    setIsSendingEmailVerification(false);

    if (error) {
      setErrorMessage("Не получилось отправить письмо подтверждения.");
      return;
    }

    setIsEmailVerificationModalOpen(true);
  }, [isSendingEmailVerification, setErrorMessage, user]);

  return {
    isEmailVerificationModalOpen,
    isEmailVerifiedInHush,
    isSendingEmailVerification,
    sendEmailVerificationLetter,
    setIsEmailVerificationModalOpen,
  };
}
