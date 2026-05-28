import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useI18n } from "@/shared/i18n-context";

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
  const { t } = useI18n();

  if (!isOpen) {
    return null;
  }

  return (
    <ConfirmDialog
      cancelLabel={t("cancel")}
      confirmLabel={t("delete")}
      description={t("deleteAvatarDescription")}
      icon={
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={t("deleteAvatarTitle")}
      zIndex={{ backdrop: "z-[130]", panel: "z-[131]" }}
    />
  );
}
