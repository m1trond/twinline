import { useState } from "react";
import type { ActiveView } from "@/shared/types";

export type ViewedProfileState = {
  avatarUrl: string | null;
  bio: string | null;
  name: string;
  username: string | null;
  updatedAt: string | null;
  userId: string | null;
};

export function useNavigationState() {
  const [activeView, setActiveView] = useState<ActiveView>("profile");
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<ViewedProfileState | null>(null);

  return {
    activeView,
    setActiveView,
    selectedChatUserId,
    setSelectedChatUserId,
    selectedImageUrl,
    setSelectedImageUrl,
    viewedProfile,
    setViewedProfile,
  };
}
