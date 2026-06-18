import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type UsernameCopyButtonProps = {
  className?: string;
  fallback: string;
  username: string | null | undefined;
};

async function copyText(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function UsernameCopyButton({
  className = "",
  fallback,
  username,
}: UsernameCopyButtonProps) {
  const [toastState, setToastState] = useState({ key: 0, visible: false });

  useEffect(() => {
    if (!toastState.visible) {
      return;
    }

    const hideToastTimeoutId = window.setTimeout(() => {
      setToastState((currentState) => ({
        ...currentState,
        visible: false,
      }));
    }, 2000);

    return () => {
      window.clearTimeout(hideToastTimeoutId);
    };
  }, [toastState.key, toastState.visible]);

  if (!username) {
    return <span className={className}>{fallback}</span>;
  }

  const usernameWithAt = `@${username}`;

  async function copyUsername() {
    await copyText(usernameWithAt);
    setToastState((currentState) => ({
      key: currentState.key + 1,
      visible: true,
    }));
  }

  return (
    <>
      <button
        aria-label={`Copy username ${usernameWithAt}`}
        className={`inline-flex h-auto min-h-0 max-w-full cursor-pointer items-center truncate border-0 bg-transparent p-0 text-left leading-none decoration-[#f4f4f5] decoration-1 underline-offset-[2px] transition hover:underline ${className}`}
        onClick={() => void copyUsername()}
        title={usernameWithAt}
        type="button"
      >
        {usernameWithAt}
      </button>
      {typeof document !== "undefined"
        ? createPortal(
            <div
              aria-live="polite"
              className={`pointer-events-none fixed left-1/2 top-[calc(100dvh-86px)] z-[140] w-[min(320px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-[#3f3f46]/45 bg-[#050505]/95 px-3 py-2 text-center text-sm font-medium text-[#f4f4f5] shadow-[0_16px_45px_rgba(0,0,0,0.38)] transition duration-200 ${
                toastState.visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              }`}
              role="status"
            >
              Имя пользователя скопировано
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
