export type BlockConfirmationState = {
  action: "block" | "unblock";
  targetLabel: string;
  userId: string;
};

type BlockConfirmationDialogProps = {
  confirmation: BlockConfirmationState | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function BlockConfirmationDialog({
  confirmation,
  onCancel,
  onConfirm,
}: BlockConfirmationDialogProps) {
  if (!confirmation) {
    return null;
  }

  const isBlockAction = confirmation.action === "block";

  return (
    <>
      <button
        aria-label="Закрыть подтверждение блокировки"
        className="fixed inset-0 z-[115] bg-black/62 backdrop-blur-md"
        onClick={onCancel}
        type="button"
      />
      <section className="fixed left-1/2 top-1/2 z-[116] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[#3f3f46]/55 bg-[#101010]/98 p-5 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${
              isBlockAction
                ? "border-red-300/35 bg-red-500/14 text-red-100"
                : "border-emerald-300/30 bg-emerald-400/12 text-emerald-100"
            }`}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="M18 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2ZM8 11V7a4 4 0 0 1 8 0v4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium leading-tight text-[#f4f4f5]">
              {isBlockAction
                ? `Заблокировать пользователя ${confirmation.targetLabel}?`
                : `Разблокировать пользователя ${confirmation.targetLabel}?`}
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className={`min-h-12 rounded-2xl px-4 text-sm font-medium transition ${
              isBlockAction
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-[#f4f4f5] text-[#050505] hover:bg-[#e5e5e5]"
            }`}
            onClick={onConfirm}
            type="button"
          >
            Да
          </button>
          <button
            className="min-h-12 rounded-2xl border border-[#3f3f46]/45 bg-white/[0.03] px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={onCancel}
            type="button"
          >
            Нет
          </button>
        </div>
      </section>
    </>
  );
}
