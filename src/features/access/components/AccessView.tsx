import { useEffect, useMemo, useState } from "react";
import { deleteAccessProfile, fetchAccessProfiles } from "@/features/access/queries";
import type { AccessProfileRow } from "@/shared/types";

type AccessViewProps = {
  canViewAccess: boolean;
  currentUserId: string;
};

function formatAccessDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getProfileLabel(profile: AccessProfileRow) {
  return profile.display_name?.trim() || profile.email || profile.phone || "Пользователь";
}

export function AccessView({ canViewAccess, currentUserId }: AccessViewProps) {
  const [profiles, setProfiles] = useState<AccessProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [detailsUserId, setDetailsUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const userCountText = useMemo(() => {
    const count = profiles.filter((profile) => profile.user_id !== currentUserId).length;

    if (count % 10 === 1 && count % 100 !== 11) {
      return `${count} пользователь`;
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return `${count} пользователя`;
    }

    return `${count} пользователей`;
  }, [currentUserId, profiles]);
  const visibleProfiles = useMemo(
    () => profiles.filter((profile) => profile.user_id !== currentUserId),
    [currentUserId, profiles],
  );

  async function loadProfiles() {
    setIsLoading(true);
    const { data, error } = await fetchAccessProfiles();

    if (error) {
      setErrorMessage("Не получилось загрузить пользователей. Проверь SQL-функцию get_access_profiles.");
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

    function closeDetailsOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDetailsUserId(null);
      }
    }

    async function syncProfiles() {
      setIsLoading(true);
      const { data, error } = await fetchAccessProfiles();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить пользователей. Проверь SQL-функцию get_access_profiles.");
        setProfiles([]);
      } else {
        setErrorMessage("");
        setProfiles(data ?? []);
      }

      setIsLoading(false);
    }

    syncProfiles();
    window.addEventListener("keydown", closeDetailsOnEscape);

    const intervalId = window.setInterval(syncProfiles, 30_000);

    return () => {
      isMounted = false;
      window.removeEventListener("keydown", closeDetailsOnEscape);
      window.clearInterval(intervalId);
    };
  }, [canViewAccess]);

  async function removeProfile(profile: AccessProfileRow) {
    const label = profile.email || profile.username || profile.display_name || profile.user_id;
    const shouldDelete = window.confirm(
      `Удалить аккаунт ${label}? Он сможет зарегистрироваться снова.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingUserId(profile.user_id);
    setErrorMessage("");

    const { data, error } = await deleteAccessProfile(profile.user_id);

    if (error || data !== true) {
      setErrorMessage("Не получилось удалить аккаунт. Проверь SQL-функцию delete_access_profile.");
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
          Недостаточно прав для просмотра доступа.
        </p>
      </div>
    );
  }

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-[50px] min-h-[50px] items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-[#f4f4f5]">Доступ</h2>
          <p className="text-xs font-medium leading-4 text-[#a1a1aa]">
            {isLoading ? "Загружаю пользователей..." : userCountText}
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
            <p className="text-sm font-medium text-[#f4f4f5]">Пользователей пока нет</p>
          </div>
        ) : null}

        {visibleProfiles.length > 0 ? (
          <div className="grid gap-1.5">
            {visibleProfiles.map((profile) => {
              const isDeleting = deletingUserId === profile.user_id;

              return (
                <article
                  className="grid gap-2 rounded-xl border border-[#3f3f46]/35 bg-black/22 px-3 py-2 text-sm sm:grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(170px,1fr)_minmax(120px,auto)_auto] sm:items-center"
                  key={profile.user_id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-5 text-[#f4f4f5]">
                      {getProfileLabel(profile)}
                    </p>
                    <p className="truncate text-xs font-medium leading-4 text-[#a1a1aa]">
                      {profile.username ? `@${profile.username}` : "@ник не задан"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase leading-4 tracking-[0.16em] text-[#a1a1aa]">
                      Email
                    </p>
                    <p className="truncate text-sm font-medium leading-5 text-[#f4f4f5]">
                      {profile.email || "Не указан"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase leading-4 tracking-[0.16em] text-[#a1a1aa]">
                      Телефон
                    </p>
                    <p className="truncate text-sm font-medium leading-5 text-[#f4f4f5]">
                      {profile.phone || "Не указан"}
                    </p>
                  </div>
                  <div className="min-w-0 sm:text-right">
                    <p className="text-[10px] font-medium uppercase leading-4 tracking-[0.16em] text-[#a1a1aa]">
                      Регистрация
                    </p>
                    <p className="text-sm font-medium leading-5 text-[#f4f4f5]">
                      {formatAccessDate(profile.created_at)}
                    </p>
                  </div>
                  <div className="relative flex items-center gap-1.5 justify-self-start sm:justify-self-end">
                    <button
                      aria-expanded={detailsUserId === profile.user_id}
                      aria-label={`Показать данные аккаунта ${profile.email || profile.username || profile.display_name || profile.user_id}`}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-[#3f3f46]/35 bg-[#f4f4f5]/10 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18"
                      onClick={() =>
                        setDetailsUserId((currentUserId) =>
                          currentUserId === profile.user_id ? null : profile.user_id,
                        )
                      }
                      title="Данные"
                      type="button"
                    >
                      <KeyIcon />
                    </button>
                    <button
                      aria-label={`Удалить аккаунт ${profile.email || profile.username || profile.display_name || profile.user_id}`}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-100 transition hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={isDeleting}
                      onClick={() => removeProfile(profile)}
                      title="Удалить"
                      type="button"
                    >
                      {isDeleting ? (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <TrashIcon />
                      )}
                    </button>
                    {detailsUserId === profile.user_id ? (
                      <>
                        <button
                          aria-label="Закрыть данные аккаунта"
                          className="fixed inset-0 z-[75] cursor-default bg-transparent"
                          onClick={() => setDetailsUserId(null)}
                          type="button"
                        />
                        <div className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[min(300px,calc(100vw-32px))] rounded-2xl border border-[#3f3f46]/55 bg-[#111111]/98 p-3 text-left shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[#e5e5e5]">
                            Данные аккаунта
                          </p>
                          <AccessDetail label="Ник" value={profile.username ? `@${profile.username}` : "Не задан"} />
                          <AccessDetail label="Почта" value={profile.email || "Не указана"} />
                          <AccessDetail label="Телефон" value={profile.phone || "Не указан"} />
                          <AccessDetail label="Пароль" value="Недоступен" />
                        </div>
                      </>
                    ) : null}
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

function AccessDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[#3f3f46]/35 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[10px] font-medium uppercase leading-4 tracking-[0.16em] text-[#a1a1aa]">
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm font-medium leading-5 text-[#f4f4f5]">
        {value}
      </p>
    </div>
  );
}

function KeyIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m21 2-9.6 9.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="7.5" cy="15.5" r="5.5" stroke="currentColor" strokeWidth="2" />
    </svg>
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
