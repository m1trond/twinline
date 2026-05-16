import type { Dispatch, SetStateAction } from "react";

type AvatarGalleryOverlayProps = {
  avatarGalleryIndex: number | null;
  avatarGalleryItems: string[];
  avatarGalleryUrl: string | null;
  canDeleteAvatarFromGallery: boolean;
  onClose: () => void;
  setAvatarGalleryIndex: Dispatch<SetStateAction<number | null>>;
  setIsAvatarDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export function AvatarGalleryOverlay({
  avatarGalleryIndex,
  avatarGalleryItems,
  avatarGalleryUrl,
  canDeleteAvatarFromGallery,
  onClose,
  setAvatarGalleryIndex,
  setIsAvatarDeleteDialogOpen,
}: AvatarGalleryOverlayProps) {
  if (!avatarGalleryUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[125] flex flex-col bg-black/72 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <div
        className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/82 px-3 py-2 text-[#f4f4f5] shadow-[0_14px_45px_rgba(0,0,0,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">
            Аватарки
          </p>
          <p className="mt-0.5 text-xs text-[#a1a1aa]">
            {(avatarGalleryIndex ?? 0) + 1} / {avatarGalleryItems.length}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canDeleteAvatarFromGallery ? (
            <button
              className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-2 text-[13px] font-medium text-red-100 transition hover:bg-red-500/18"
              onClick={() => setIsAvatarDeleteDialogOpen(true)}
              type="button"
            >
              Удалить
            </button>
          ) : null}
          <button
            className="rounded-xl border border-[#3f3f46]/45 px-4 py-2 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            Закрыть
          </button>
        </div>
      </div>

      <div
        className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-2xl border border-[#3f3f46]/35 bg-[#050505]/72 p-3"
        onClick={(event) => event.stopPropagation()}
      >
        {avatarGalleryItems.length > 1 ? (
          <>
            <button
              aria-label="Previous avatar"
              className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#3f3f46]/45 bg-[#111111]/88 text-[#f4f4f5] shadow-[0_12px_34px_rgba(0,0,0,0.35)] transition hover:bg-[#f4f4f5] hover:text-[#050505]"
              onClick={() =>
                setAvatarGalleryIndex((currentIndex) =>
                  currentIndex === null
                    ? 0
                    : (currentIndex - 1 + avatarGalleryItems.length) % avatarGalleryItems.length,
                )
              }
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="m15 18-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
            <button
              aria-label="Next avatar"
              className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#3f3f46]/45 bg-[#111111]/88 text-[#f4f4f5] shadow-[0_12px_34px_rgba(0,0,0,0.35)] transition hover:bg-[#f4f4f5] hover:text-[#050505]"
              onClick={() =>
                setAvatarGalleryIndex((currentIndex) =>
                  currentIndex === null ? 0 : (currentIndex + 1) % avatarGalleryItems.length,
                )
              }
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Avatar preview"
          className="h-auto max-h-[calc(100dvh-220px)] w-auto max-w-[calc(100vw-120px)] rounded-2xl object-contain shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
          src={avatarGalleryUrl}
        />
      </div>

      {avatarGalleryItems.length > 1 ? (
        <div
          className="scrollbar-hidden mt-3 flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-[#3f3f46]/35 bg-[#111111]/78 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          {avatarGalleryItems.map((avatarUrl, avatarIndex) => (
            <button
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition ${
                avatarIndex === avatarGalleryIndex
                  ? "border-[#f4f4f5] opacity-100"
                  : "border-[#3f3f46]/45 opacity-55 hover:opacity-100"
              }`}
              key={avatarUrl}
              onClick={() => setAvatarGalleryIndex(avatarIndex)}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" src={avatarUrl} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

