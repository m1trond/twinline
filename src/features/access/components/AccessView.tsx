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
  return profile.display_name?.trim() || profile.email || fallback;
}

const accessGridClass =
  "sm:grid-cols-[minmax(180px,1fr)_minmax(260px,1fr)_minmax(120px,0.7fr)_40px]";

export function AccessView({ canViewAccess, currentUserId }: AccessViewProps) {
  const { language, t } = useI18n();
  const [profiles, setProfiles] = useState<AccessProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteTargetProfile, setDeleteTargetProfile] = useState<AccessProfileRow | null>(null);
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
    setDeletingUserId(profile.user_id);
    setErrorMessage("");

    const { data, error } = await deleteAccessProfile(profile.user_id);

    if (error || data !== true) {
      setErrorMessage(deleteAccountErrorText);
    } else {
      setDeleteTargetProfile(null);
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
      <div className="mb-2 flex h-9 min-h-9 items-center rounded-lg border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-0 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-4">
        <div className="inline-flex min-w-0 items-center gap-3 leading-none">
          <h2 className="text-base font-medium leading-none text-[#f4f4f5]">{t("access")}</h2>
          <span aria-hidden="true" className="h-4 w-px shrink-0 self-center rounded-full bg-[#f4f4f5]/35" />
        </div>
        <p className="ml-3 min-w-0 truncate text-xs font-medium leading-none text-[#a1a1aa]">
          {isLoading ? t("loadingUsers") : userCountText}
        </p>
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
                    <p className="text-sm font-medium leading-5 text-[#f4f4f5]">
                      {formatAccessDate(profile.created_at, language)}
                    </p>
                  </div>
                  <div className="flex items-center justify-self-start sm:justify-self-end">
                    <button
                      aria-label={`${t("deleteAccountConfirm")} ${profile.email || profile.username || profile.display_name || profile.user_id}`}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-[#3f3f46]/45 bg-[#f4f4f5]/8 text-[#f4f4f5] transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={isDeleting}
                      onClick={() => setDeleteTargetProfile(profile)}
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
      {deleteTargetProfile ? (
        <AccessDeleteDialog
          isDeleting={deletingUserId === deleteTargetProfile.user_id}
          label={deleteTargetProfile.email || deleteTargetProfile.username || deleteTargetProfile.display_name || deleteTargetProfile.user_id}
          onCancel={() => setDeleteTargetProfile(null)}
          onConfirm={() => void removeProfile(deleteTargetProfile)}
        />
      ) : null}
    </div>
  );
}

function AccessDeleteDialog({
  isDeleting,
  label,
  onCancel,
  onConfirm,
}: {
  isDeleting: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { language, t } = useI18n();

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[115] bg-black/62 backdrop-blur-md"
        onClick={onCancel}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[116] max-h-[calc(100dvh-24px)] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:rounded-3xl sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
            <TrashIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium leading-tight text-[#f4f4f5]">
              {t("deleteAccountConfirm")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
              {language === "en"
                ? `Delete account ${label}? They will be able to sign up again.`
                : `Удалить аккаунт ${label}? Он сможет зарегистрироваться снова.`}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? t("loadingUsers") : t("yes")}
          </button>
          <button
            className="min-h-11 rounded-xl border border-[#3f3f46]/35 bg-white/[0.03] px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
          >
            {t("no")}
          </button>
        </div>
      </section>
    </>
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
