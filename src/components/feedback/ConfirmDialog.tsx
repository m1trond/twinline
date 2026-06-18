"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  cancelLabel: string;
  confirmLabel: string;
  description?: ReactNode;
  icon: ReactNode;
  isConfirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: ReactNode;
  zIndex?: {
    backdrop: string;
    panel: string;
  };
};

export function ConfirmDialog({
  cancelLabel,
  confirmLabel,
  description,
  icon,
  isConfirmDisabled = false,
  onCancel,
  onConfirm,
  title,
  zIndex = { backdrop: "z-[115]", panel: "z-[116]" },
}: ConfirmDialogProps) {
  const dialog = (
    <>
      <button
        aria-label={cancelLabel}
        className={`fixed inset-0 ${zIndex.backdrop} bg-black/62 backdrop-blur-md`}
        onClick={onCancel}
        type="button"
      />
      <section className={`hush-modal-transition fixed left-1/2 top-1/2 ${zIndex.panel} max-h-[calc(100dvh-24px)] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:rounded-3xl sm:p-5`}>
        <div className={`flex gap-3 ${description ? "items-start" : "items-center"}`}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium leading-tight text-[#f4f4f5]">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConfirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
          <button
            className="min-h-11 rounded-xl border border-[#3f3f46]/35 bg-white/[0.03] px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConfirmDisabled}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
        </div>
      </section>
    </>
  );

  if (typeof document === "undefined") {
    return dialog;
  }

  return createPortal(dialog, document.body);
}
