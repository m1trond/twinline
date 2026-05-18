import { useState } from "react";

export function useProfileEditorState() {
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [profileUsernameError, setProfileUsernameError] = useState("");
  const [avatarHistory, setAvatarHistory] = useState<string[]>([]);
  const [avatarGalleryItems, setAvatarGalleryItems] = useState<string[]>([]);
  const [avatarGalleryIndex, setAvatarGalleryIndex] = useState<number | null>(null);
  const [canDeleteAvatarFromGallery, setCanDeleteAvatarFromGallery] = useState(false);
  const [isAvatarDeleteDialogOpen, setIsAvatarDeleteDialogOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  return {
    profileName,
    setProfileName,
    profileBio,
    setProfileBio,
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
  };
}
