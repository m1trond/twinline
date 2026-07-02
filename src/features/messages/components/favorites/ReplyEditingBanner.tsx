import type { TranslationKey } from "@/shared/i18n";
import type { MessageRow } from "@/shared/types";

type ReplyEditingBannerProps = {
  replyTarget: MessageRow | null;
  editingMessage: MessageRow | null;
  setReplyTarget: (msg: MessageRow | null) => void;
  setEditingMessage: (msg: MessageRow | null) => void;
  setMessageText: (text: string) => void;
  getReadableMessageText: (text: string) => string;
  t: (key: TranslationKey) => string;
};

export function ReplyEditingBanner({
  replyTarget,
  editingMessage,
  setReplyTarget,
  setEditingMessage,
  setMessageText,
  getReadableMessageText,
  t,
}: ReplyEditingBannerProps) {
  if (!replyTarget && !editingMessage) {
    return null;
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/35 bg-[#111111]/82 px-3 py-2.5 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#e5e5e5]">
          {editingMessage ? t("editing") : t("reply")}
        </p>
        <p className="mt-1 truncate font-medium text-[#f4f4f5]">
          {getReadableMessageText((editingMessage ?? replyTarget)?.text ?? "")}
        </p>
      </div>
      <button
        className="shrink-0 rounded-xl border border-[#3f3f46]/35 px-3 py-2 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
        onClick={() => {
          setReplyTarget(null);
          setEditingMessage(null);
          setMessageText("");
        }}
        type="button"
      >
        {t("cancel")}
      </button>
    </div>
  );
}
