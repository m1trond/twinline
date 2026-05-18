type StickerPickerPosition = {
  left: number;
  top: number;
};

type StickerPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSendSticker: (sticker: string) => void;
  position: StickerPickerPosition;
  stickers: string[];
};

export function StickerPicker({
  isOpen,
  onClose,
  onSendSticker,
  position,
  stickers,
}: StickerPickerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Закрыть стикеры"
        className="fixed inset-0 z-[70] cursor-default bg-transparent"
        onClick={onClose}
        type="button"
      />
      <div
        className="hush-sticker-picker fixed z-[80] w-[min(300px,calc(100vw-24px))] rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/98 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          left: position.left,
          top: position.top,
        }}
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#e5e5e5]">
            Стикеры
          </p>
          <button
            className="rounded-full px-2 py-1 text-xs font-medium text-[#a1a1aa] transition hover:bg-white/10 hover:text-[#f4f4f5]"
            onClick={onClose}
            type="button"
          >
            Закрыть
          </button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {stickers.map((sticker) => (
            <button
              className="grid h-14 place-items-center rounded-xl bg-[#f4f4f5]/10 text-base leading-none transition hover:scale-[1.03] hover:bg-[#f4f4f5]/18 active:scale-95"
              key={sticker}
              onClick={() => onSendSticker(sticker)}
              type="button"
            >
              {sticker}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
