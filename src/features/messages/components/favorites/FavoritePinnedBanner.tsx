import type { FavoriteItem } from "@/shared/types";
import type { TranslationKey } from "@/shared/i18n";

type FavoritePinnedBannerProps = {
  pinnedFavoriteItem: FavoriteItem | null;
  setPinnedFavoriteItem: (item: FavoriteItem | null) => void;
  getReadableMessageText: (text: string) => string;
  t: (key: TranslationKey) => string;
};

export function FavoritePinnedBanner({
  pinnedFavoriteItem,
  setPinnedFavoriteItem,
  getReadableMessageText,
  t,
}: FavoritePinnedBannerProps) {
  if (!pinnedFavoriteItem) {
    return null;
  }

  return (
    <article className="mb-2 flex shrink-0 items-center gap-2.5 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 px-3 py-2.5 text-left shadow-[0_14px_45px_rgba(0,0,0,0.22)] backdrop-blur-md sm:mb-3 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4f4f5]/18 text-[#e5e5e5] sm:h-9 sm:w-9 sm:rounded-xl">
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 17v5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-medium uppercase tracking-[0.16em] text-[#e5e5e5]">
          {t("pinned")}
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-[#f4f4f5]">
          {getReadableMessageText(pinnedFavoriteItem.text)}
        </span>
      </div>
      <button
        className="min-h-9 shrink-0 rounded-lg border border-[#3f3f46]/35 px-2.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10 sm:min-h-10 sm:rounded-xl sm:px-4"
        onClick={() => setPinnedFavoriteItem(null)}
        type="button"
      >
        {t("unpin")}
      </button>
    </article>
  );
}
