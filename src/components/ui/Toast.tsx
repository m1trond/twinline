"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type ToastProps = {
  message: ReactNode;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setVisible(true);
    }, 10);

    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 1800);

    const closeTimer = setTimeout(() => {
      onClose();
    }, 2000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-[calc(100dvh-86px)] z-[200] w-[min(320px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-[#3f3f46]/45 bg-[#050505]/95 px-3 py-2 text-center text-sm font-medium text-[#f4f4f5] shadow-[0_16px_45px_rgba(0,0,0,0.38)] transition duration-200 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0"
      }`}
      role="status"
    >
      {message}
    </div>
  );
}
