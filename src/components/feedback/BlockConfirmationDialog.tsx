import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
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
    <ConfirmDialog
      cancelLabel={t("no")}
      confirmLabel={t("yes")}
      icon={
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
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={
        confirmation.action === "block"
          ? `${t("blockUser")} ${confirmation.targetLabel}?`
          : `${t("unblockUser")} ${confirmation.targetLabel}?`
      }
    />
  );
}
