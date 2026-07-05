import { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction, ReactNode, FormEvent, ChangeEvent, RefObject } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApp } from "@/shared/context/AppContext";
import { useProfilesState } from "@/features/profile/useProfilesState";
import { useProfileEditorState } from "@/features/profile/useProfileEditorState";
import { useAvatarActions } from "@/features/profile/useAvatarActions";
import type { ProfileAvatarTarget } from "@/features/profile/useAvatarActions";
import { useEmailVerificationState } from "@/features/profile/useEmailVerificationState";
import type { ProfileRow } from "@/shared/types";
import { supabase } from "@/lib/supabase";
import { profileColumns } from "@/shared/constants";
import { getUsernameError, normalizeUsername } from "@/shared/utils/profile";
import { fetchUsernameOwner } from "@/features/messages/queries";

type ProfilesContextType = {
  // Profiles State
  profiles: ProfileRow[];
  setProfiles: Dispatch<SetStateAction<ProfileRow[]>>;
  currentProfile: ProfileRow | null;
  profilesByUserId: Map<string, ProfileRow>;
  activeUserName: string;

  // Profile Editor State
  profileName: string;
  setProfileName: Dispatch<SetStateAction<string>>;
  profileBio: string | null;
  setProfileBio: Dispatch<SetStateAction<string | null>>;
  profileUsername: string | null;
  setProfileUsername: Dispatch<SetStateAction<string | null>>;
  profileUsernameError: string;
  setProfileUsernameError: Dispatch<SetStateAction<string>>;

  // Avatar Actions & History
  avatarHistory: string[];
  setAvatarHistory: Dispatch<SetStateAction<string[]>>;
  avatarGalleryItems: string[];
  setAvatarGalleryItems: Dispatch<SetStateAction<string[]>>;
  avatarGalleryIndex: number | null;
  setAvatarGalleryIndex: Dispatch<SetStateAction<number | null>>;
  canDeleteAvatarFromGallery: boolean;
  setCanDeleteAvatarFromGallery: Dispatch<SetStateAction<boolean>>;
  isAvatarDeleteDialogOpen: boolean;
  setIsAvatarDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  isUploadingAvatar: boolean;
  setIsUploadingAvatar: Dispatch<SetStateAction<boolean>>;
  avatarInputRef: RefObject<HTMLInputElement | null>;

  // Avatar Functions
  avatarGalleryUrl: string | null;
  isAvatarGalleryOpen: boolean;
  deleteAvatarFromGallery: () => Promise<void>;
  handleAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  openAvatarGallery: (url: string | null | undefined) => void;
  openProfileAvatarGallery: (profile: ProfileAvatarTarget) => Promise<void>;

  // Email Verification
  isEmailVerificationModalOpen: boolean;
  isEmailVerifiedInHush: boolean;
  isSendingEmailVerification: boolean;
  sendEmailVerificationLetter: () => Promise<void>;
  setIsEmailVerificationModalOpen: Dispatch<SetStateAction<boolean>>;

  // Profile Update Actions
  updateProfileName: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateProfileBio: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateProfileUsername: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleProfileBioChange: (nextBio: string) => void;
  isProfileBioChanged: boolean;
  isSavingProfileBio: boolean;
  profileBioInputValue: string;
  profileNameInputValue: string;
  profileUsernameInputValue: string;
  profileBioSaveError: string;
  isUsernameChangeAllowed: boolean;
  nextUsernameChangeDate: string | null;
};

const ProfilesContext = createContext<ProfilesContextType | null>(null);

type ProfilesContextProviderProps = {
  children: ReactNode;
  onProfileNameChange?: (userId: string, nextName: string) => void;
};

export function ProfilesContextProvider({
  children,
  onProfileNameChange,
}: ProfilesContextProviderProps) {
  const { user } = useAuth();
  const { setErrorMessage, setSelectedImageUrl, saveUserSyncPatch } = useApp();

  // 1. Profiles State
  const {
    profiles,
    setProfiles,
    currentProfile,
    profilesByUserId,
  } = useProfilesState({
    setErrorMessage,
    user,
  });

  const activeUserName = currentProfile?.display_name ?? user?.email ?? "User";

  // 2. Profile Editor State
  const {
    profileName,
    setProfileName,
    profileUsername,
    setProfileUsername,
    profileUsernameError,
    setProfileUsernameError,
    avatarHistory,
    setAvatarHistory,
    avatarGalleryItems,
    setAvatarGalleryItems,
    avatarGalleryIndex,
    setAvatarGalleryIndex,
    canDeleteAvatarFromGallery,
    setCanDeleteAvatarFromGallery,
    isAvatarDeleteDialogOpen,
    setIsAvatarDeleteDialogOpen,
    isUploadingAvatar,
    setIsUploadingAvatar,
  } = useProfileEditorState();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // 3. Avatar Actions Hook
  const {
    avatarGalleryUrl,
    isAvatarGalleryOpen,
    deleteAvatarFromGallery,
    handleAvatarChange,
    openAvatarGallery,
    openProfileAvatarGallery,
  } = useAvatarActions({
    activeUserName,
    avatarGalleryIndex,
    avatarGalleryItems,
    avatarHistory,
    avatarInputRef,
    canDeleteAvatarFromGallery,
    currentProfile,
    isAvatarDeleteDialogOpen,
    saveUserSyncPatch,
    setAvatarGalleryIndex,
    setAvatarGalleryItems,
    setAvatarHistory,
    setCanDeleteAvatarFromGallery,
    setErrorMessage,
    setIsAvatarDeleteDialogOpen,
    setIsUploadingAvatar,
    setProfiles,
    setSelectedImageUrl,
    user,
  });

  // 4. Email Verification State Hook
  const {
    isEmailVerificationModalOpen,
    isEmailVerifiedInHush,
    isSendingEmailVerification,
    sendEmailVerificationLetter,
    setIsEmailVerificationModalOpen,
  } = useEmailVerificationState({
    setErrorMessage,
    user,
  });

  // Local state for profile form fields
  const [profileNameInputValue, setProfileNameInputValue] = useState("");
  const [profileUsernameInputValue, setProfileUsernameInputValue] = useState("");
  const [profileBioInputValue, setProfileBioInputValue] = useState("");
  const [profileBioSavedValue, setProfileBioSavedValue] = useState("");
  const [profileBioSavedSnapshot, setProfileBioSavedSnapshot] = useState<{
    bio: string;
    userId: string;
  } | null>(null);

  const [isSavingProfileBio, setIsSavingProfileBio] = useState(false);
  const [profileBioSaveError, setProfileBioSaveError] = useState("");

  const isSavingProfileBioRef = useRef(false);

  // Initialize values when currentProfile loads
  useEffect(() => {
    if (!currentProfile) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setProfileNameInputValue(currentProfile.display_name);
      setProfileUsernameInputValue(currentProfile.username ?? "");
      setProfileBioInputValue(currentProfile.bio ?? "");
      setProfileBioSavedValue(currentProfile.bio ?? "");
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentProfile]);

  useEffect(() => {
    if (!user || !currentProfile || profileBioSavedSnapshot?.userId === user.id) {
      return;
    }

    const savedBio = currentProfile.bio ?? "";
    const frameId = window.requestAnimationFrame(() => {
      setProfileBioSavedSnapshot((currentSnapshot) => {
        if (currentSnapshot?.userId === user.id) {
          return currentSnapshot;
        }

        return { bio: savedBio, userId: user.id };
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentProfile, user, profileBioSavedSnapshot]);

  const isProfileBioChanged = profileBioInputValue !== profileBioSavedValue;

  const isUsernameChangeAllowed = true;
  const nextUsernameChangeDate = null;

  // Actions
  const updateProfileName = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const nextName = profileNameInputValue.trim();
    if (!nextName || nextName === activeUserName) return;

    if (nextName.length < 2 || nextName.length > 24) {
      setErrorMessage("Имя должно быть от 2 до 24 символов.");
      return;
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        bio: currentProfile?.bio ?? null,
        display_name: nextName,
        name_changed_at: currentProfile?.name_changed_at ?? null,
        updated_at: updatedAt,
        user_id: user.id,
        username: currentProfile?.username ?? null,
        username_changed_at: currentProfile?.username_changed_at ?? null,
      })
      .select(profileColumns)
      .single();

    if (error) {
      setErrorMessage("Не получилось изменить имя.");
      return;
    }

    if (data) {
      setProfiles((currentProfiles) => {
        const withoutProfile = currentProfiles.filter((p) => p.user_id !== data.user_id);
        return [...withoutProfile, data];
      });
      if (onProfileNameChange) {
        onProfileNameChange(user.id, nextName);
      }
    }

    await supabase.auth.updateUser({
      data: { display_name: nextName },
    });

    setProfileName("");
    setErrorMessage("");
  }, [user, profileNameInputValue, activeUserName, currentProfile, setErrorMessage, setProfileName, setProfiles, onProfileNameChange]);

  const saveProfileBio = useCallback(async () => {
    if (!user || isSavingProfileBioRef.current) return;

    const nextBio = profileBioInputValue.trim();
    if (nextBio.length > 100) {
      setProfileBioSaveError("Описание должно быть не длиннее 100 символов.");
      return;
    }

    if (nextBio === profileBioSavedValue.trim()) return;

    const updatedAt = new Date().toISOString();
    isSavingProfileBioRef.current = true;
    setIsSavingProfileBio(true);

    const previousSavedSnapshot = profileBioSavedSnapshot;
    setProfileBioSavedSnapshot({ bio: nextBio, userId: user.id });
    setProfileBioSavedValue(nextBio);

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        bio: nextBio,
        display_name: activeUserName,
        name_changed_at: currentProfile?.name_changed_at ?? null,
        updated_at: updatedAt,
        user_id: user.id,
        username: currentProfile?.username ?? null,
        username_changed_at: currentProfile?.username_changed_at ?? null,
      })
      .select(profileColumns)
      .single();

    isSavingProfileBioRef.current = false;
    setIsSavingProfileBio(false);

    if (error) {
      setProfileBioInputValue(nextBio);
      setProfileBioSavedSnapshot(previousSavedSnapshot);
      const bioErrorMessage = error.message.includes("bio")
        ? "В Supabase не применена колонка bio. Запусти SQL из supabase/add-profile-bio.sql."
        : `Не получилось сохранить описание: ${error.message}`;

      setProfileBioSaveError(bioErrorMessage);
      setErrorMessage(bioErrorMessage);
      return;
    }

    if (data) {
      setProfiles((currentProfiles) => {
        const withoutProfile = currentProfiles.filter((p) => p.user_id !== data.user_id);
        return [...withoutProfile, data];
      });
    }

    setErrorMessage("");
    setProfileBioSaveError("");
  }, [user, profileBioInputValue, profileBioSavedValue, profileBioSavedSnapshot, currentProfile, activeUserName, setErrorMessage, setProfiles]);

  const updateProfileBio = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveProfileBio();
  }, [saveProfileBio]);

  const updateProfileUsername = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setProfileUsernameError("");
    const nextUsername = normalizeUsername(profileUsernameInputValue);
    const usernameValidationError = getUsernameError(nextUsername);

    if (usernameValidationError) {
      setProfileUsernameError(usernameValidationError);
      return;
    }

    if (nextUsername === currentProfile?.username) return;

    if (!isUsernameChangeAllowed) {
      setProfileUsernameError(`Ник снова можно будет изменить ${nextUsernameChangeDate ?? "позже"}.`);
      return;
    }

    const usernameOwner = await fetchUsernameOwner(nextUsername);
    if (usernameOwner.error) {
      setProfileUsernameError("Сначала нужно добавить колонку username в Supabase.");
      return;
    }

    if (usernameOwner.data && usernameOwner.data.user_id !== user.id) {
      setProfileUsernameError("Такой ник уже занят.");
      return;
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        bio: currentProfile?.bio ?? null,
        display_name: activeUserName,
        name_changed_at: updatedAt,
        updated_at: updatedAt,
        user_id: user.id,
        username: nextUsername,
        username_changed_at: updatedAt,
      })
      .select(profileColumns)
      .single();

    if (error) {
      setProfileUsernameError("Не получилось сохранить ник.");
      return;
    }

    if (data) {
      setProfiles((currentProfiles) => {
        const withoutProfile = currentProfiles.filter((p) => p.user_id !== data.user_id);
        return [...withoutProfile, data];
      });
    }

    await supabase.auth.updateUser({
      data: { username: nextUsername },
    });

    setProfileUsername(null);
    setErrorMessage("");
  }, [user, profileUsernameInputValue, currentProfile, isUsernameChangeAllowed, nextUsernameChangeDate, activeUserName, setErrorMessage, setProfiles, setProfileUsernameError, setProfileUsername]);

  const handleProfileBioChange = useCallback((nextBio: string) => {
    setProfileBioInputValue(nextBio);
  }, []);

  return (
    <ProfilesContext.Provider
      value={{
        profiles,
        setProfiles,
        currentProfile,
        profilesByUserId,
        activeUserName,

        profileName,
        setProfileName: setProfileNameInputValue,
        profileBio: profileBioInputValue,
        setProfileBio: (value) => {
          if (typeof value === "function") {
            setProfileBioInputValue((prev) => {
              const res = (value as (prev: string | null) => string | null)(prev);
              return res === null ? "" : res;
            });
          } else {
            setProfileBioInputValue(value === null ? "" : value);
          }
        },
        profileUsername,
        setProfileUsername: (value) => {
          if (typeof value === "function") {
            setProfileUsernameInputValue((prev) => {
              const res = (value as (prev: string | null) => string | null)(prev);
              return res === null ? "" : res;
            });
          } else {
            setProfileUsernameInputValue(value === null ? "" : value);
          }
        },
        profileUsernameError,
        setProfileUsernameError,

        avatarHistory,
        setAvatarHistory,
        avatarGalleryItems,
        setAvatarGalleryItems,
        avatarGalleryIndex,
        setAvatarGalleryIndex,
        canDeleteAvatarFromGallery,
        setCanDeleteAvatarFromGallery,
        isAvatarDeleteDialogOpen,
        setIsAvatarDeleteDialogOpen,
        isUploadingAvatar,
        setIsUploadingAvatar,
        avatarInputRef,

        avatarGalleryUrl,
        isAvatarGalleryOpen,
        deleteAvatarFromGallery,
        handleAvatarChange,
        openAvatarGallery,
        openProfileAvatarGallery,

        isEmailVerificationModalOpen,
        isEmailVerifiedInHush,
        isSendingEmailVerification,
        sendEmailVerificationLetter,
        setIsEmailVerificationModalOpen,

        updateProfileName,
        updateProfileBio,
        updateProfileUsername,
        handleProfileBioChange,
        isProfileBioChanged,
        isSavingProfileBio,
        profileBioInputValue,
        profileNameInputValue,
        profileUsernameInputValue,
        profileBioSaveError,
        isUsernameChangeAllowed,
        nextUsernameChangeDate,
      }}
    >
      {children}
    </ProfilesContext.Provider>
  );
}

export function useProfiles() {
  const context = useContext(ProfilesContext);
  if (!context) {
    throw new Error("useProfiles must be used within a ProfilesContextProvider");
  }
  return context;
}
