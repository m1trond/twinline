import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type EmailVerificationStateParams = {
  setErrorMessage: (message: string) => void;
  user: User | null;
};

export function useEmailVerificationState({
  setErrorMessage,
  user,
}: EmailVerificationStateParams) {
  const [isEmailVerificationModalOpen, setIsEmailVerificationModalOpen] = useState(false);
  const [isSendingEmailVerification, setIsSendingEmailVerification] = useState(false);
  const [isEmailVerifiedInHush, setIsEmailVerifiedInHush] = useState(false);

  useEffect(() => {
    let frameId = 0;

    if (!user) {
      frameId = window.requestAnimationFrame(() => {
        setIsEmailVerifiedInHush(false);
        setIsEmailVerificationModalOpen(false);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    frameId = window.requestAnimationFrame(() => {
      const storedValue = window.localStorage.getItem(`hush-email-verified-${user.id}`);

      setIsEmailVerifiedInHush(storedValue === "true");
    });

    return () => window.cancelAnimationFrame(frameId);
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
    setIsEmailVerifiedInHush,
    setIsEmailVerificationModalOpen,
  };
}
