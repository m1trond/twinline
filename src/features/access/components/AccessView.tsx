import { useEffect, useMemo, useState } from "react";
import { fetchAccessProfiles } from "@/features/access/queries";
import type { AccessProfileRow } from "@/shared/types";

type AccessViewProps = {
  canViewAccess: boolean;
};

function formatAccessDate(value: string | null) {
  if (!value) {
    return "—";
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

export function AccessView({ canViewAccess }: AccessViewProps) {
  const [profiles, setProfiles] = useState<AccessProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const userCountText = useMemo(() => {
    const count = profiles.length;

    if (count % 10 === 1 && count % 100 !== 11) {
      return `${count} пользователь`;
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return `${count} пользователя`;
    }

    return `${count} пользователей`;
  }, [profiles.length]);

  useEffect(() => {
    if (!canViewAccess) {
      return;
    }

    let isMounted = true;

    async function loadProfiles() {
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

    loadProfiles();

    const intervalId = window.setInterval(loadProfiles, 30_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [canViewAccess]);

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
      <div className="mb-2 flex h-[60px] min-h-[60px] items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-[#f4f4f5]">Доступ</h2>
          <p className="mt-0.5 text-xs font-medium text-[#a1a1aa]">
            {isLoading ? "Загружаю пользователей..." : userCountText}
          </p>
        </div>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
        {errorMessage ? (
          <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && profiles.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-5 text-center sm:rounded-2xl">
            <p className="text-sm font-medium text-[#f4f4f5]">Пользователей пока нет</p>
          </div>
        ) : null}

        {profiles.length > 0 ? (
          <div className="grid gap-2">
            {profiles.map((profile) => (
              <article
                className="grid gap-3 rounded-xl border border-[#3f3f46]/35 bg-black/22 px-3 py-3 text-sm sm:grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(170px,1fr)_minmax(120px,auto)] sm:items-center sm:rounded-2xl"
                key={profile.user_id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#f4f4f5]">
                    {getProfileLabel(profile)}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-[#a1a1aa]">
                    {profile.username ? `@${profile.username}` : "@ник не задан"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">
                    Email
                  </p>
                  <p className="mt-0.5 truncate font-medium text-[#f4f4f5]">
                    {profile.email || "Не указан"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">
                    Телефон
                  </p>
                  <p className="mt-0.5 truncate font-medium text-[#f4f4f5]">
                    {profile.phone || "Не указан"}
                  </p>
                </div>
                <div className="min-w-0 sm:text-right">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">
                    Регистрация
                  </p>
                  <p className="mt-0.5 font-medium text-[#f4f4f5]">
                    {formatAccessDate(profile.created_at)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
