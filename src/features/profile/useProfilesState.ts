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

const profilesCacheKeyPrefix = "hush-profiles-cache";

function getProfilesCacheKey(userId: string) {
  return `${profilesCacheKeyPrefix}-${userId}`;
}

function isProfileRow(item: unknown): item is ProfileRow {
  if (!item || typeof item !== "object") {
    return false;
  }

  const profile = item as ProfileRow;

  return (
    typeof profile.user_id === "string" &&
    typeof profile.display_name === "string" &&
    (typeof profile.username === "string" || profile.username === null) &&
    (typeof profile.bio === "string" || profile.bio === null) &&
    (typeof profile.username_changed_at === "string" ||
      profile.username_changed_at === null) &&
    (typeof profile.avatar_url === "string" || profile.avatar_url === null) &&
    (typeof profile.name_changed_at === "string" ||
      profile.name_changed_at === null) &&
    typeof profile.updated_at === "string"
  );
}

function readStoredProfiles(userId: string | null | undefined) {
  if (!userId || typeof window === "undefined") {
    return [];
  }

  try {
    const storedProfiles = window.localStorage.getItem(getProfilesCacheKey(userId));

    if (!storedProfiles) {
      return [];
    }

    const parsedProfiles: unknown = JSON.parse(storedProfiles);

    return Array.isArray(parsedProfiles)
      ? parsedProfiles.filter(isProfileRow)
      : [];
  } catch {
    return [];
  }
}

function writeStoredProfiles(userId: string, profiles: ProfileRow[]) {
  try {
    window.localStorage.setItem(getProfilesCacheKey(userId), JSON.stringify(profiles));
  } catch {
  }
}

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

  const secondProfilesByUserId = new Map(
    secondProfiles.map((profile) => [profile.user_id, profile]),
  );

  return firstProfiles.every((firstProfile) => {
    const secondProfile = secondProfilesByUserId.get(firstProfile.user_id);

    if (!secondProfile) {
      return false;
    }

    return (
      firstProfile.user_id === secondProfile.user_id &&
      firstProfile.display_name === secondProfile.display_name &&
      firstProfile.username === secondProfile.username &&
      firstProfile.bio === secondProfile.bio &&
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
  const [profiles, setProfiles] = useState<ProfileRow[]>(() =>
    readStoredProfiles(user?.id),
  );
  const storedProfiles = useMemo(() => readStoredProfiles(user?.id), [user?.id]);
  const effectiveProfiles = profiles.length > 0 ? profiles : storedProfiles;
  const currentProfile = useMemo(() => {
    return effectiveProfiles.find((profile) => profile.user_id === user?.id) ?? null;
  }, [effectiveProfiles, user?.id]);
  const currentProfileRef = useRef<ProfileRow | null>(null);

  useEffect(() => {
    currentProfileRef.current = currentProfile;
  }, [currentProfile]);

  useEffect(() => {
    if (!user || profiles.length === 0) {
      return;
    }

    writeStoredProfiles(user.id, profiles);
  }, [profiles, user]);

  const profilesByUserId = useMemo(() => {
    const nextProfilesByUserId = new Map<string, ProfileRow>();

    for (const profile of effectiveProfiles) {
      nextProfilesByUserId.set(profile.user_id, profile);
    }

    return nextProfilesByUserId;
  }, [effectiveProfiles]);

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
          bio: null,
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
    }, 30_000);

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
    profiles: effectiveProfiles,
    setProfiles,
    currentProfile,
    profilesByUserId,
  };
}
