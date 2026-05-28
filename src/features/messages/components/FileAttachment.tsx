import type { MouseEvent } from "react";
import { MessageReceiptIcon } from "@/features/messages/components/MessageReceiptIcon";
import type { MessageReceiptStatus } from "@/features/messages/components/MessageReceiptIcon";
import { useI18n } from "@/shared/i18n-context";
import type { FileMessagePayload } from "@/shared/types";
import { formatFileSize, formatMessageTime } from "@/shared/utils/format";

export function FileAttachment({
  file,
  isMine,
  receiptStatus = null,
  sentAt = null,
}: {
  file: FileMessagePayload;
  isMine: boolean;
  receiptStatus?: MessageReceiptStatus | null;
  sentAt?: string | null;
}) {
  const { t } = useI18n();

  async function downloadFile(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response = await fetch(file.url);

      if (!response.ok) {
        window.open(file.url, "_blank", "noopener,noreferrer");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = file.name || "file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(file.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div
      className={`w-[min(340px,78vw)] rounded-xl border px-2.5 py-2 text-left shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:scale-[1.01] sm:rounded-xl ${
        isMine
          ? "border-[#3f3f46]/45 bg-[#1f1f1f] text-[#f4f4f5] hover:bg-[#262626]"
          : "border-white/10 bg-white/[0.06] text-[#f4f4f5] hover:bg-white/10"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            isMine ? "bg-[#050505] text-[#f4f4f5]" : "bg-[#f4f4f5] text-[#050505]"
          }`}
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
            <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-4">
            {file.name}
          </span>
          <span className="flex min-w-0 items-center gap-2 text-xs font-medium opacity-60">
            <span className="min-w-0 truncate">
              {formatFileSize(file.size)}
              {file.type ? ` - ${file.type}` : ""}
            </span>
            {sentAt ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                {formatMessageTime(sentAt)}
                {receiptStatus ? (
                  <MessageReceiptIcon className="h-4 w-4" status={receiptStatus} />
                ) : null}
              </span>
            ) : null}
          </span>
        </span>
        <button
          aria-label={`${t("download")} ${file.name}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-[#f4f4f5] transition hover:scale-105 hover:bg-white/12"
          onClick={downloadFile}
          title={t("download")}
          type="button"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
            <path d="M12 17V3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="m6 11 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M19 21H5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>
      </div>
      {file.caption ? (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5">
          {file.caption}
        </p>
      ) : null}
    </div>
  );
}
