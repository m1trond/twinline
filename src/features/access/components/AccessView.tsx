import { useEffect, useMemo, useState } from "react";
import { deleteAccessProfile, fetchAccessProfiles } from "@/features/access/queries";
import { useI18n } from "@/shared/i18n-context";
import type { AccessProfileRow } from "@/shared/types";

type AccessViewProps = {
  canViewAccess: boolean;
  currentUserId: string;
};

function formatAccessDate(value: string | null, language: "en" | "ru") {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ru", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getProfileLabel(profile: AccessProfileRow, fallback: string) {
  return profile.display_name?.trim() || profile.email || profile.phone || fallback;
}

const accessGridClass =
  "sm:grid-cols-[minmax(180px,1fr)_minmax(260px,1fr)_minmax(150px,0.7fr)_minmax(120px,0.7fr)_40px]";

export function AccessView({ canViewAccess, currentUserId }: AccessViewProps) {
  const { language, t } = useI18n();
  const [profiles, setProfiles] = useState<AccessProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const deleteAccountErrorText = t("deleteAccountError");
  const loadUsersErrorText = t("loadUsersError");
  const userCountText = useMemo(() => {
    const count = profiles.filter((profile) => profile.user_id !== currentUserId).length;

    if (language === "en") {
      return `${count} ${count === 1 ? t("usersCountOne") : t("usersCountMany")}`;
    }

    if (count % 10 === 1 && count % 100 !== 11) {
      return `${count} ${t("usersCountOne")}`;
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return `${count} ${t("usersCountFew")}`;
    }

    return `${count} ${t("usersCountMany")}`;
  }, [currentUserId, language, profiles, t]);
  const visibleProfiles = useMemo(
    () => profiles.filter((profile) => profile.user_id !== currentUserId),
    [currentUserId, profiles],
  );

  async function loadProfiles() {
    setIsLoading(true);
    const { data, error } = await fetchAccessProfiles();

    if (error) {
      setErrorMessage(loadUsersErrorText);
      setProfiles([]);
    } else {
      setErrorMessage("");
      setProfiles(data ?? []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    if (!canViewAccess) {
      return;
    }

    let isMounted = true;

    async function syncProfiles() {
      setIsLoading(true);
      const { data, error } = await fetchAccessProfiles();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(loadUsersErrorText);
        setProfiles([]);
      } else {
        setErrorMessage("");
        setProfiles(data ?? []);
      }

      setIsLoading(false);
    }

    syncProfiles();

    const intervalId = window.setInterval(syncProfiles, 30_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [canViewAccess, loadUsersErrorText]);

  async function removeProfile(profile: AccessProfileRow) {
    const label = profile.email || profile.username || profile.display_name || profile.user_id;
    const shouldDelete = window.confirm(
      `${t("deleteAccountConfirm")} ${label}? ${t("deleteAccountConfirmSuffix")}`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingUserId(profile.user_id);
    setErrorMessage("");

    const { data, error } = await deleteAccessProfile(profile.user_id);

    if (error || data !== true) {
      setErrorMessage(deleteAccountErrorText);
    } else {
      setProfiles((currentProfiles) =>
        currentProfiles.filter((currentProfile) => currentProfile.user_id !== profile.user_id),
      );
    }

    setDeletingUserId(null);
    await loadProfiles();
  }

  if (!canViewAccess) {
    return (
      <div className="hush-panel-transition grid min-h-0 place-items-center rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl">
        <p className="text-sm font-medium text-[#f4f4f5]">
          {t("insufficientAccess")}
        </p>
      </div>
    );
  }

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-[50px] min-h-[50px] items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-[#f4f4f5]">{t("access")}</h2>
          <p className="text-xs font-medium leading-4 text-[#a1a1aa]">
            {isLoading ? t("loadingUsers") : userCountText}
          </p>
        </div>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-3">
        {errorMessage ? (
          <div className="mb-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && visibleProfiles.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-5 text-center sm:rounded-2xl">
            <p className="text-sm font-medium text-[#f4f4f5]">{t("noUsers")}</p>
          </div>
        ) : null}

        {visibleProfiles.length > 0 ? (
          <div className="grid gap-1.5">
            <div className={`hidden px-3 text-[10px] font-medium uppercase leading-4 tracking-[0.16em] text-[#a1a1aa] sm:grid ${accessGridClass} sm:items-center sm:gap-3`}>
              <span className="text-left">{t("nameAndUsername")}</span>
              <span className="text-left">{t("email")}</span>
              <span className="text-left">{t("phone")}</span>
              <span className="text-left">{language === "en" ? "Registration" : "Регистрация"}</span>
              <span className="sr-only">{t("actions")}</span>
            </div>
            {visibleProfiles.map((profile) => {
              const isDeleting = deletingUserId === profile.user_id;

              return (
                <article
                  className={`grid gap-2 rounded-xl border border-[#3f3f46]/35 bg-black/22 px-3 py-2 text-sm sm:grid ${accessGridClass} sm:items-center sm:gap-3`}
                  key={profile.user_id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-5 text-[#f4f4f5]">
                      {getProfileLabel(profile, t("user"))}
                    </p>
                    <p className="truncate text-xs font-medium leading-4 text-[#a1a1aa]">
                      {profile.username ? `@${profile.username}` : t("nicknameNotSet")}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-5 text-[#f4f4f5]">
                      {profile.email || t("notSpecified")}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-5 text-[#f4f4f5]">
                      {profile.phone || t("notSpecified")}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5 text-[#f4f4f5]">
                      {formatAccessDate(profile.created_at, language)}
                    </p>
                  </div>
                  <div className="flex items-center justify-self-start sm:justify-self-end">
                    <button
                      aria-label={`${t("deleteAccountConfirm")} ${profile.email || profile.username || profile.display_name || profile.user_id}`}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-100 transition hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={isDeleting}
                      onClick={() => removeProfile(profile)}
                      title={t("delete")}
                      type="button"
                    >
                      {isDeleting ? (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <TrashIcon />
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 6h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
