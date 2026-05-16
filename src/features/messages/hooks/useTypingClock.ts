import { useEffect, useState } from "react";

export function useTypingClock(typingUntil: number) {
  const [typingNow, setTypingNow] = useState(() => Date.now());

  useEffect(() => {
    if (!typingUntil) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setTypingNow(Date.now());
      },
      Math.max(0, typingUntil - Date.now()) + 50,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [typingUntil]);

  return typingNow;
}
