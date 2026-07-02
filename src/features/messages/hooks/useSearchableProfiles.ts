import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfiles } from "@/features/profile/ProfilesContext";
import { useChat } from "@/features/messages/contexts/ChatContext";

export function useSearchableProfiles() {
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { chatSearchQuery } = useChat();

  return useMemo(() => {
    const query = chatSearchQuery.trim().replace(/^@+/, "").toLowerCase();

    if (query.length < 2) {
      return [];
    }

    return profiles
      .filter((profile) => {
        if (profile.user_id === user?.id) {
          return false;
        }

        const username = profile.username?.toLowerCase() ?? "";

        return username.includes(query);
      })
      .sort((firstProfile, secondProfile) => {
        const firstUsername = firstProfile.username?.toLowerCase() ?? "";
        const secondUsername = secondProfile.username?.toLowerCase() ?? "";
        const firstStartsWithQuery = firstUsername.startsWith(query) ? 0 : 1;
        const secondStartsWithQuery = secondUsername.startsWith(query) ? 0 : 1;

        if (firstStartsWithQuery !== secondStartsWithQuery) {
          return firstStartsWithQuery - secondStartsWithQuery;
        }

        return firstProfile.display_name.localeCompare(secondProfile.display_name, "ru");
      })
      .slice(0, 8);
  }, [chatSearchQuery, profiles, user?.id]);
}
