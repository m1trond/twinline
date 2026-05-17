type AvatarDeleteDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AvatarDeleteDialog({
  isOpen,
  onCancel,
  onConfirm,
}: AvatarDeleteDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Close avatar delete dialog"
        className="fixed inset-0 z-[130] bg-black/62 backdrop-blur-sm"
        onClick={onCancel}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[131] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-red-400/25 bg-[#101010]/98 p-5 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-red-300/35 bg-red-500/14 text-red-100">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium leading-tight text-[#f4f4f5]">
              Удалить аватарку?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
              Аватарка исчезнет из этой галереи. Если это текущая аватарка, Hush поставит следующую или очистит ее.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-2xl bg-red-500 px-4 text-sm font-medium text-white transition hover:bg-red-400"
            onClick={onConfirm}
            type="button"
          >
            Удалить
          </button>
          <button
            className="min-h-12 rounded-2xl border border-[#3f3f46]/45 bg-white/[0.03] px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={onCancel}
            type="button"
          >
            Отмена
          </button>
        </div>
      </section>
    </>
  );
}
