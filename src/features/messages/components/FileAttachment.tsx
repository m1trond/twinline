import type { MouseEvent } from "react";
import type { FileMessagePayload } from "@/shared/types";
import { formatFileSize } from "@/shared/utils/format";

export function FileAttachment({
  file,
  isMine,
}: {
  file: FileMessagePayload;
  isMine: boolean;
}) {
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
      className={`flex w-[min(360px,78vw)] items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:scale-[1.01] sm:rounded-[20px] ${
        isMine
          ? "border-[#3f3f46]/45 bg-[#1f1f1f] text-[#f4f4f5] hover:bg-[#262626]"
          : "border-white/10 bg-white/[0.06] text-[#f4f4f5] hover:bg-white/10"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          isMine ? "bg-[#050505] text-[#f4f4f5]" : "bg-[#f4f4f5] text-[#050505]"
        }`}
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
          <path d="M14 3v6h5M9.5 14h5M9.5 17h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-5">
          {file.name}
        </span>
        <span className="block truncate text-xs font-medium opacity-60">
          {formatFileSize(file.size)}
          {file.type ? ` В· ${file.type}` : ""}
        </span>
      </span>
      <button
        aria-label={`Скачать ${file.name}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-[#f4f4f5] transition hover:scale-105 hover:bg-white/12"
        onClick={downloadFile}
        title="Скачать"
        type="button"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
