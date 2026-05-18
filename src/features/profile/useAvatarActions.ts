import { useEffect } from "react";
import type { ChangeEvent, RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { profileColumns } from "@/shared/constants";
import type { ProfileRow } from "@/shared/types";
import { readStoredStringList } from "@/shared/utils/storage";

type ProfileAvatarTarget = {
  avatarUrl: string | null;
  userId: string | null;
};

type UseAvatarActionsParams = {
  activeUserName: string;
  avatarGalleryIndex: number | null;
  avatarGalleryItems: string[];
  avatarHistory: string[];
  avatarInputRef: RefObject<HTMLInputElement | null>;
  canDeleteAvatarFromGallery: boolean;
  currentProfile: ProfileRow | null;
  isAvatarDeleteDialogOpen: boolean;
  setAvatarGalleryIndex: (value: number | null | ((currentIndex: number | null) => number | null)) => void;
  setAvatarGalleryItems: (items: string[]) => void;
  setAvatarHistory: (items: string[]) => void;
  setCanDeleteAvatarFromGallery: (canDelete: boolean) => void;
  setErrorMessage: (message: string) => void;
  setIsAvatarDeleteDialogOpen: (isOpen: boolean) => void;
  setIsUploadingAvatar: (isUploading: boolean) => void;
  setProfiles: (value: ProfileRow[] | ((currentProfiles: ProfileRow[]) => ProfileRow[])) => void;
  setSelectedImageUrl: (url: string | null) => void;
  user: User | null;
};

function mergeProfile(currentProfiles: ProfileRow[], nextProfile: ProfileRow) {
  const withoutProfile = currentProfiles.filter(
    (profile) => profile.user_id !== nextProfile.user_id,
  );

  return [...withoutProfile, nextProfile];
}

export function useAvatarActions({
  activeUserName,
  avatarGalleryIndex,
  avatarGalleryItems,
  avatarHistory,
  avatarInputRef,
  canDeleteAvatarFromGallery,
  currentProfile,
  isAvatarDeleteDialogOpen,
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
}: UseAvatarActionsParams) {
  const avatarGalleryUrl =
    avatarGalleryIndex !== null ? avatarGalleryItems[avatarGalleryIndex] ?? null : null;
  const isAvatarGalleryOpen = avatarGalleryIndex !== null && Boolean(avatarGalleryUrl);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      if (!user) {
        setAvatarHistory([]);
        setAvatarGalleryItems([]);
        setCanDeleteAvatarFromGallery(false);
        setAvatarGalleryIndex(null);
        return;
      }

      const storedAvatarHistory = readStoredStringList(`hush-avatar-history-${user.id}`);
      const nextAvatarHistory = currentProfile?.avatar_url
        ? [
            currentProfile.avatar_url,
            ...storedAvatarHistory.filter((url) => url !== currentProfile.avatar_url),
          ].slice(0, 20)
        : storedAvatarHistory;

      setAvatarHistory(nextAvatarHistory);
      window.localStorage.setItem(
        `hush-avatar-history-${user.id}`,
        JSON.stringify(nextAvatarHistory),
      );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    currentProfile?.avatar_url,
    setAvatarGalleryIndex,
    setAvatarGalleryItems,
    setAvatarHistory,
    setCanDeleteAvatarFromGallery,
    user,
  ]);

  useEffect(() => {
    if (!isAvatarGalleryOpen || avatarGalleryItems.length < 2 || isAvatarDeleteDialogOpen) {
      return;
    }

    function navigateAvatarGallery(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setAvatarGalleryIndex((currentIndex) => {
        const safeIndex = currentIndex ?? 0;

        return event.key === "ArrowLeft"
          ? (safeIndex - 1 + avatarGalleryItems.length) % avatarGalleryItems.length
          : (safeIndex + 1) % avatarGalleryItems.length;
      });
    }

    window.addEventListener("keydown", navigateAvatarGallery, true);

    return () => {
      window.removeEventListener("keydown", navigateAvatarGallery, true);
    };
  }, [
    avatarGalleryItems.length,
    isAvatarDeleteDialogOpen,
    isAvatarGalleryOpen,
    setAvatarGalleryIndex,
  ]);

  async function updateAvatar(file: File) {
    if (!user) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Аватаркой может быть только изображение.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("Аватарка должна быть меньше 8 МБ.");
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage("");

    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/avatars/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingAvatar(false);
      setErrorMessage("Не получилось загрузить аватарку.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: publicUrlData.publicUrl,
        bio: currentProfile?.bio ?? null,
        display_name: activeUserName,
        name_changed_at: currentProfile?.name_changed_at ?? null,
        updated_at: new Date().toISOString(),
        user_id: user.id,
        username: currentProfile?.username ?? null,
        username_changed_at: currentProfile?.username_changed_at ?? null,
      })
      .select(profileColumns)
      .single();

    setIsUploadingAvatar(false);

    if (error) {
      setErrorMessage("Не получилось сохранить аватарку.");
      return;
    }

    if (data) {
      setProfiles((currentProfiles) => mergeProfile(currentProfiles, data));

      const nextAvatarHistory = [
        data.avatar_url,
        ...avatarHistory.filter((url) => url !== data.avatar_url),
      ].slice(0, 20);

      setAvatarHistory(nextAvatarHistory);
      setAvatarGalleryItems(nextAvatarHistory);
      setCanDeleteAvatarFromGallery(true);
      window.localStorage.setItem(
        `hush-avatar-history-${user.id}`,
        JSON.stringify(nextAvatarHistory),
      );
      setAvatarGalleryIndex(0);
    }

    setErrorMessage("");
  }

  function openAvatarGallery(url: string | null | undefined) {
    if (!url) {
      avatarInputRef.current?.click();
      return;
    }

    const nextAvatarHistory = [
      url,
      ...avatarHistory.filter((avatarUrl) => avatarUrl !== url),
    ].slice(0, 20);

    if (user) {
      window.localStorage.setItem(
        `hush-avatar-history-${user.id}`,
        JSON.stringify(nextAvatarHistory),
      );
    }

    setAvatarHistory(nextAvatarHistory);
    setAvatarGalleryItems(nextAvatarHistory);
    setCanDeleteAvatarFromGallery(true);
    setAvatarGalleryIndex(0);
  }

  async function openProfileAvatarGallery(profile: ProfileAvatarTarget) {
    if (!profile.avatarUrl) {
      return;
    }

    const avatarUrls = [profile.avatarUrl];

    if (profile.userId) {
      const { data } = await supabase.storage
        .from("message-images")
        .list(`${profile.userId}/avatars`, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (data) {
        const storageAvatarUrls = data
          .filter((file) => file.name && !file.name.endsWith("/"))
          .map((file) => {
            const { data: publicUrlData } = supabase.storage
              .from("message-images")
              .getPublicUrl(`${profile.userId}/avatars/${file.name}`);

            return publicUrlData.publicUrl;
          });

        avatarUrls.push(...storageAvatarUrls);
      }
    }

    setAvatarGalleryItems(Array.from(new Set(avatarUrls)).slice(0, 30));
    setCanDeleteAvatarFromGallery(false);
    setAvatarGalleryIndex(0);
    setSelectedImageUrl(null);
  }

  async function deleteAvatarFromGallery() {
    if (!user || !avatarGalleryUrl || !canDeleteAvatarFromGallery) {
      setIsAvatarDeleteDialogOpen(false);
      return;
    }

    const deletedAvatarUrl = avatarGalleryUrl;
    const nextAvatarHistory = avatarGalleryItems.filter((url) => url !== deletedAvatarUrl);
    const shouldUpdateProfileAvatar = currentProfile?.avatar_url === deletedAvatarUrl;
    const nextProfileAvatarUrl = shouldUpdateProfileAvatar
      ? nextAvatarHistory[0] ?? null
      : currentProfile?.avatar_url ?? null;

    setErrorMessage("");

    if (shouldUpdateProfileAvatar) {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          avatar_url: nextProfileAvatarUrl,
          bio: currentProfile?.bio ?? null,
          display_name: activeUserName,
          name_changed_at: currentProfile?.name_changed_at ?? null,
          updated_at: new Date().toISOString(),
          user_id: user.id,
          username: currentProfile?.username ?? null,
          username_changed_at: currentProfile?.username_changed_at ?? null,
        })
        .select(profileColumns)
        .single();

      if (error) {
        setErrorMessage("Не получилось удалить аватарку.");
        return;
      }

      if (data) {
        setProfiles((currentProfiles) => mergeProfile(currentProfiles, data));
      }
    }

    window.localStorage.setItem(
      `hush-avatar-history-${user.id}`,
      JSON.stringify(nextAvatarHistory),
    );
    setAvatarHistory(nextAvatarHistory);
    setAvatarGalleryItems(nextAvatarHistory);
    setIsAvatarDeleteDialogOpen(false);
    setAvatarGalleryIndex((currentIndex) => {
      if (nextAvatarHistory.length === 0) {
        return null;
      }

      return Math.min(currentIndex ?? 0, nextAvatarHistory.length - 1);
    });
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void updateAvatar(file);
    }

    event.target.value = "";
  }

  return {
    avatarGalleryUrl,
    isAvatarGalleryOpen,
    deleteAvatarFromGallery,
    handleAvatarChange,
    openAvatarGallery,
    openProfileAvatarGallery,
  };
}
