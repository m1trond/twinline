import { useEffect, useState } from "react";

export function useTypingClock() {
  const [typingNow, setTypingNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTypingNow(Date.now());
    }, 500);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return typingNow;
}
