import { useEffect, useMemo, useState } from "react";

type MusicTrack = {
  id: string;
  artist: string;
  duration: string;
  genre: string;
  title: string;
};

const savedMusicStorageKey = "twinline-saved-music";

const musicCatalog: MusicTrack[] = [
  {
    id: "midnight-route",
    artist: "Neon Room",
    duration: "3:18",
    genre: "Synthwave",
    title: "Midnight Route",
  },
  {
    id: "quiet-signal",
    artist: "Luma Drift",
    duration: "2:46",
    genre: "Ambient",
    title: "Quiet Signal",
  },
  {
    id: "glass-rhythm",
    artist: "Mira Vale",
    duration: "3:04",
    genre: "Pop",
    title: "Glass Rhythm",
  },
  {
    id: "soft-static",
    artist: "Northline",
    duration: "4:12",
    genre: "Electronic",
    title: "Soft Static",
  },
  {
    id: "late-message",
    artist: "Vektor",
    duration: "2:58",
    genre: "Hip-Hop",
    title: "Late Message",
  },
  {
    id: "afterlight",
    artist: "Sora Lane",
    duration: "3:36",
    genre: "Indie",
    title: "Afterlight",
  },
];

function readSavedTrackIds() {
  if (typeof window === "undefined") {
    return ["midnight-route", "quiet-signal"];
  }

  try {
    const rawValue = window.localStorage.getItem(savedMusicStorageKey);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;

    if (Array.isArray(parsedValue)) {
      return parsedValue.filter((value): value is string => typeof value === "string");
    }
  } catch {
    return ["midnight-route", "quiet-signal"];
  }

  return ["midnight-route", "quiet-signal"];
}

function MusicGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M9 18V5l12-2v13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="m21 21-4.3-4.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function TrackRow({
  actionLabel,
  isSaved,
  onToggle,
  track,
}: {
  actionLabel: string;
  isSaved: boolean;
  onToggle: () => void;
  track: MusicTrack;
}) {
  return (
    <article className="flex min-h-[64px] items-center gap-3 rounded-xl border border-[#3f3f46]/35 bg-[#111111]/70 px-3 py-2.5 shadow-[0_12px_35px_rgba(0,0,0,0.2)] transition hover:border-[#f4f4f5]/20 hover:bg-[#181818]/88 sm:px-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4f4f5]/12 text-[#f4f4f5]">
        <MusicGlyph />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-[#f4f4f5]">
          {track.title}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-[#a1a1aa]">
          {track.artist} · {track.genre}
        </p>
      </div>
      <span className="hidden shrink-0 text-sm font-medium tabular-nums text-[#a1a1aa] sm:inline">
        {track.duration}
      </span>
      <button
        className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-medium transition ${
          isSaved
            ? "border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5] hover:bg-[#f4f4f5]/16"
            : "bg-[#f4f4f5] text-[#050505] hover:bg-[#e5e5e5]"
        }`}
        onClick={onToggle}
        type="button"
      >
        {actionLabel}
      </button>
    </article>
  );
}

export function MusicView() {
  const [query, setQuery] = useState("");
  const [savedTrackIds, setSavedTrackIds] = useState(readSavedTrackIds);

  useEffect(() => {
    window.localStorage.setItem(savedMusicStorageKey, JSON.stringify(savedTrackIds));
  }, [savedTrackIds]);

  const savedTrackIdSet = useMemo(() => new Set(savedTrackIds), [savedTrackIds]);
  const savedTracks = useMemo(
    () => musicCatalog.filter((track) => savedTrackIdSet.has(track.id)),
    [savedTrackIdSet],
  );
  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return musicCatalog;
    }

    return musicCatalog.filter((track) =>
      [track.title, track.artist, track.genre].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query]);

  function toggleTrack(trackId: string) {
    setSavedTrackIds((currentTrackIds) =>
      currentTrackIds.includes(trackId)
        ? currentTrackIds.filter((currentTrackId) => currentTrackId !== trackId)
        : [...currentTrackIds, trackId],
    );
  }

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-[60px] min-h-[60px] items-center rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <h2 className="text-base font-medium text-[#f4f4f5]">Музыка</h2>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#050505]/82 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] [overflow-anchor:none] backdrop-blur-md sm:rounded-2xl sm:p-4">
        <label className="mb-4 flex min-h-11 items-center gap-3 rounded-xl border border-[#3f3f46]/35 bg-[#f4f4f5]/12 px-3 text-[#a1a1aa] transition focus-within:border-[#f4f4f5]/35 focus-within:bg-[#f4f4f5]/16 sm:px-4">
          <SearchGlyph />
          <input
            aria-label="Поиск музыки"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#f4f4f5] outline-none placeholder:text-[#a1a1aa]/70"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти музыку..."
            type="search"
            value={query}
          />
        </label>

        <section>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-[#f4f4f5]">Моя музыка</h3>
              <p className="mt-1 text-sm font-medium text-[#a1a1aa]">
                Треки, которые ты сохранил в этой вкладке.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#f4f4f5]/10 px-3 py-1 text-xs font-medium text-[#e5e5e5]">
              {savedTracks.length}
            </span>
          </div>

          {savedTracks.length > 0 ? (
            <div className="grid gap-2">
              {savedTracks.map((track) => (
                <TrackRow
                  actionLabel="Убрать"
                  isSaved
                  key={track.id}
                  onToggle={() => toggleTrack(track.id)}
                  track={track}
                />
              ))}
            </div>
          ) : (
            <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-5 text-center">
              <div>
                <p className="text-sm font-medium text-[#f4f4f5]">Музыка пока пустая</p>
                <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
                  Найди трек ниже и добавь его к себе.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6">
          <div className="mb-2">
            <h3 className="text-base font-medium text-[#f4f4f5]">Поиск музыки</h3>
            <p className="mt-1 text-sm font-medium text-[#a1a1aa]">
              Ищи по названию, исполнителю или жанру.
            </p>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid gap-2">
              {searchResults.map((track) => {
                const isSaved = savedTrackIdSet.has(track.id);

                return (
                  <TrackRow
                    actionLabel={isSaved ? "В музыке" : "Добавить"}
                    isSaved={isSaved}
                    key={track.id}
                    onToggle={() => toggleTrack(track.id)}
                    track={track}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-5 text-center">
              <div>
                <p className="text-sm font-medium text-[#f4f4f5]">Ничего не найдено</p>
                <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
                  Попробуй другой запрос.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
