import type { FavoriteItem } from "@/shared/types";
import type { TranslationKey } from "@/shared/i18n";

type FavoriteSelectionToolbarProps = {
  isFavoriteSelectionMode: boolean;
  selectedFavoriteItems: FavoriteItem[];
  forwardSelectedMessages: () => void;
  removeSelectedFavoriteItems: () => void;
  t: (key: TranslationKey) => string;
};

export function FavoriteSelectionToolbar({
  isFavoriteSelectionMode,
  selectedFavoriteItems,
  forwardSelectedMessages,
  removeSelectedFavoriteItems,
  t,
}: FavoriteSelectionToolbarProps) {
  if (!isFavoriteSelectionMode) {
    return null;
  }

  return (
    <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/88 px-3 py-2 text-[#f4f4f5] shadow-[0_12px_35px_rgba(0,0,0,0.25)] backdrop-blur-md sm:mb-3">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#d4d4d8]">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505]">
          {selectedFavoriteItems.length}
        </span>
        <span className="truncate">{t("selectedMessages")}</span>
      </div>
      <div className="flex flex-1 justify-end gap-2 sm:flex-none">
        <button
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#3f3f46]/55 bg-[#f4f4f5]/10 px-3 text-sm font-medium text-[#f4f4f5] transition hover:bg-[#f4f4f5]/16 sm:flex-none"
          onClick={forwardSelectedMessages}
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path
              d="m15 14 5-5-5-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M4 20v-7a4 4 0 0 1 4-4h12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          {t("forward")}
        </button>
        <button
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#3f3f46]/55 bg-[#f4f4f5]/10 px-3 text-sm font-medium text-[#f4f4f5] transition hover:bg-[#f4f4f5]/16 sm:flex-none"
          onClick={removeSelectedFavoriteItems}
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path
              d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          {t("delete")}
        </button>
      </div>
    </div>
  );
}
