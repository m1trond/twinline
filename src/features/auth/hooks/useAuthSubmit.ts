import { useCallback, type FormEvent } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApp } from "@/shared/context/AppContext";
import { useProfiles } from "@/features/profile/ProfilesContext";
import { supabase } from "@/lib/supabase";
import { getUsernameError, normalizeUsername, getDisplayName } from "@/shared/utils/profile";
import { fetchUsernameOwner } from "@/features/messages/queries";
import type { ProfileRow } from "@/shared/types";

export function useAuthSubmit() {
  const {
    authMode,
    authUsername,
    authEmail,
    authPassword,
    setAuthUsernameError,
    setAuthPassword,
    setAuthUsername,
    setAuthEmail,
  } = useAuth();

  const {
    setErrorMessage,
    setActiveView,
    setSelectedChatUserId,
  } = useApp();

  const {
    currentProfile,
    setProfiles,
    setProfileName,
    setProfileUsername,
  } = useProfiles();

  const handleAuth = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setAuthUsernameError("");

    if (authMode === "sign-up") {
      const nextUsername = normalizeUsername(authUsername);
      const usernameValidationError = getUsernameError(nextUsername);

      if (usernameValidationError) {
        setAuthUsernameError(usernameValidationError);
        return;
      }

      const usernameOwner = await fetchUsernameOwner(nextUsername);

      if (usernameOwner.error) {
        setAuthUsernameError("Не получилось проверить ник. Попробуй ещё раз.");
        return;
      }

      if (usernameOwner.data) {
        setAuthUsernameError("Такой ник уже занят.");
        return;
      }

      const profileDisplayName = nextUsername;
      const emailRedirectTo =
        typeof window === "undefined" ? undefined : `${window.location.origin}/auth/confirm`;
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            display_name: profileDisplayName,
            username: nextUsername,
          },
          emailRedirectTo,
        },
      });

      if (error) {
        setErrorMessage("Не получилось зарегистрироваться.");
      } else {
        const signedUpUser = data.user;

        if (!data.session) {
          setErrorMessage("Supabase сейчас блокирует вход до подтверждения. Для сценария с красной кнопкой в профиле выключи Confirm sign up и используй подтверждение из профиля.");
          setAuthPassword("");
          return;
        }

        if (signedUpUser) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            display_name: profileDisplayName,
            username: nextUsername,
            username_changed_at: null,
            user_id: signedUpUser.id,
          });

          if (profileError) {
            setErrorMessage("Аккаунт создан, но профиль не сохранился. Проверь права INSERT/UPDATE для profiles в Supabase.");
            return;
          }

          const nextProfile: ProfileRow = {
            avatar_url: null,
            bio: null,
            display_name: profileDisplayName,
            name_changed_at: null,
            updated_at: new Date().toISOString(),
            user_id: signedUpUser.id,
            username: nextUsername,
            username_changed_at: null,
          };

          setProfiles((currentProfiles) =>
            currentProfiles.some((profile) => profile.user_id === nextProfile.user_id)
              ? currentProfiles.map((profile) =>
                  profile.user_id === nextProfile.user_id ? nextProfile : profile,
                )
              : [...currentProfiles, nextProfile],
          );
          setProfileName(profileDisplayName);
          setProfileUsername(nextUsername);
        }

        setErrorMessage("");
        setAuthUsername("");
        setAuthEmail("");
        setAuthPassword("");
        setActiveView("profile");
        setSelectedChatUserId(null);
      }

      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setErrorMessage("Не получилось войти. Проверь email и пароль.");
      return;
    }

    const signedInUser = data.user;

    if (!signedInUser) {
      return;
    }

    const { data: signedInProfile, error: signedInProfileError } = await supabase
      .from("profiles")
      .select("user_id, username")
      .eq("user_id", signedInUser.id)
      .maybeSingle();

    if (signedInProfileError) {
      await supabase.auth.signOut();
      setErrorMessage("Не получилось проверить профиль аккаунта.");
      return;
    }

    if (!signedInProfile) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        display_name: getDisplayName(signedInUser),
        user_id: signedInUser.id,
      });

      if (profileError) {
        await supabase.auth.signOut();
        setErrorMessage("Не получилось подготовить профиль аккаунта.");
      }
    }
  }, [
    authMode,
    authUsername,
    authEmail,
    authPassword,
    setErrorMessage,
    setAuthEmail,
    setAuthPassword,
    setAuthUsernameError,
    setAuthUsername,
    setProfiles,
    setProfileName,
    setProfileUsername,
    setActiveView,
    setSelectedChatUserId,
    currentProfile?.avatar_url,
  ]);

  return {
    handleAuth,
  };
}
