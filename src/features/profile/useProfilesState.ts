import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { fetchProfiles } from "@/features/messages/queries";
import type { ProfileRow } from "@/shared/types";
import { getDisplayName, normalizeUsername } from "@/shared/utils/profile";

type UseProfilesStateParams = {
  setErrorMessage: (message: string) => void;
  user: User | null;
};

function mergeProfile(currentProfiles: ProfileRow[], nextProfile: ProfileRow) {
  const currentProfile = currentProfiles.find(
    (profile) => profile.user_id === nextProfile.user_id,
  );

  if (currentProfile && areProfilesEqual([currentProfile], [nextProfile])) {
    return currentProfiles;
  }

  const withoutProfile = currentProfiles.filter(
    (profile) => profile.user_id !== nextProfile.user_id,
  );

  return [...withoutProfile, nextProfile];
}

function areProfilesEqual(firstProfiles: ProfileRow[], secondProfiles: ProfileRow[]) {
  if (firstProfiles.length !== secondProfiles.length) {
    return false;
  }

  return firstProfiles.every((firstProfile, profileIndex) => {
    const secondProfile = secondProfiles[profileIndex];

    return (
      firstProfile.user_id === secondProfile.user_id &&
      firstProfile.display_name === secondProfile.display_name &&
      firstProfile.username === secondProfile.username &&
      firstProfile.username_changed_at === secondProfile.username_changed_at &&
      firstProfile.avatar_url === secondProfile.avatar_url &&
      firstProfile.name_changed_at === secondProfile.name_changed_at &&
      firstProfile.updated_at === secondProfile.updated_at
    );
  });
}

export function useProfilesState({
  setErrorMessage,
  user,
}: UseProfilesStateParams) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const currentProfile = useMemo(() => {
    return profiles.find((profile) => profile.user_id === user?.id) ?? null;
  }, [profiles, user?.id]);
  const currentProfileRef = useRef<ProfileRow | null>(null);

  useEffect(() => {
    currentProfileRef.current = currentProfile;
  }, [currentProfile]);

  const profilesByUserId = useMemo(() => {
    const nextProfilesByUserId = new Map<string, ProfileRow>();

    for (const profile of profiles) {
      nextProfilesByUserId.set(profile.user_id, profile);
    }

    return nextProfilesByUserId;
  }, [profiles]);

  useEffect(() => {
    let clearFrameId = 0;

    if (!user) {
      clearFrameId = window.requestAnimationFrame(() => {
        setProfiles([]);
      });

      return () => {
        window.cancelAnimationFrame(clearFrameId);
      };
    }

    const signedInUser = user;
    let isUpdatingPresence = false;

    async function updatePresence() {
      if (document.visibilityState !== "visible" || isUpdatingPresence) {
        return;
      }

      isUpdatingPresence = true;
      const updatedAt = new Date().toISOString();

      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.user_id === signedInUser.id
            ? { ...profile, updated_at: updatedAt }
            : profile,
        ),
      );

      const { error } = await supabase
        .from("profiles")
        .update({ updated_at: updatedAt })
        .eq("user_id", signedInUser.id);

      if (error && currentProfileRef.current === null) {
        await supabase.from("profiles").upsert({
          avatar_url: null,
          display_name: getDisplayName(signedInUser),
          name_changed_at: null,
          updated_at: updatedAt,
          user_id: signedInUser.id,
          username:
            typeof signedInUser.user_metadata?.username === "string"
              ? normalizeUsername(signedInUser.user_metadata.username)
              : null,
          username_changed_at: null,
        });
      }

      isUpdatingPresence = false;
    }

    updatePresence();
    const presenceInterval = window.setInterval(updatePresence, 60_000);

    document.addEventListener("visibilitychange", updatePresence);
    window.addEventListener("focus", updatePresence);

    return () => {
      window.clearInterval(presenceInterval);
      document.removeEventListener("visibilitychange", updatePresence);
      window.removeEventListener("focus", updatePresence);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    async function syncProfiles() {
      const { data, error } = await fetchProfiles();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить профили.");
        return;
      }

      const nextProfiles = data ?? [];

      setProfiles((currentProfiles) =>
        areProfilesEqual(currentProfiles, nextProfiles) ? currentProfiles : nextProfiles,
      );
    }

    syncProfiles();

    const profilesInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncProfiles();
      }
    }, 5000);

    const channel = supabase
      .channel("profiles-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          setProfiles((currentProfiles) =>
            mergeProfile(currentProfiles, payload.new as ProfileRow),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          setProfiles((currentProfiles) =>
            mergeProfile(currentProfiles, payload.new as ProfileRow),
          );
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(profilesInterval);
      supabase.removeChannel(channel);
    };
  }, [setErrorMessage, user]);

  return {
    profiles,
    setProfiles,
    currentProfile,
    profilesByUserId,
  };
}
