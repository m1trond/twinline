import { useI18n } from "@/shared/i18n-context";

type ImagePreviewOverlayProps = {
  imageUrl: string | null;
  onClose: () => void;
};

export function ImagePreviewOverlay({ imageUrl, onClose }: ImagePreviewOverlayProps) {
  const { t } = useI18n();

  if (!imageUrl) {
    return null;
  }

  return (
    <button
      aria-label={t("close")}
      className="fixed inset-0 z-[120] grid place-items-center bg-black/58 p-4 backdrop-blur-sm"
      onClick={onClose}
      type="button"
    >
      <span className="absolute right-4 top-4 rounded-full border border-[#3f3f46]/45 bg-[#111111]/90 px-4 py-2 text-sm font-medium text-[#f4f4f5] transition hover:-translate-y-0.5 hover:border-[#f4f4f5]/70 hover:bg-[#f4f4f5] hover:text-[#050505] active:translate-y-0 active:scale-[0.98]">
        {t("close")}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={t("favoriteImage")}
        className="hush-modal-transition max-h-[78dvh] max-w-[92vw] rounded-xl border border-[#3f3f46]/35 object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-w-[82vw] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        src={imageUrl}
      />
    </button>
  );
}
