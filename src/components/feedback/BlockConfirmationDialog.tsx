import { useI18n } from "@/shared/i18n-context";

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
  const { t } = useI18n();

  if (!confirmation) {
    return null;
  }

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[115] bg-black/62 backdrop-blur-md"
        onClick={onCancel}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[116] max-h-[calc(100dvh-24px)] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:rounded-3xl sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M4.929 4.929 19.07 19.071"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium leading-tight text-[#f4f4f5]">
              {confirmation.action === "block"
                ? `${t("blockUser")} ${confirmation.targetLabel}?`
                : `${t("unblockUser")} ${confirmation.targetLabel}?`}
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
            onClick={onConfirm}
            type="button"
          >
            {t("yes")}
          </button>
          <button
            className="min-h-11 rounded-xl border border-[#3f3f46]/35 bg-white/[0.03] px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={onCancel}
            type="button"
          >
            {t("no")}
          </button>
        </div>
      </section>
    </>
  );
}
