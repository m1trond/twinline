import { useEffect, useMemo, useState } from "react";
import type { PinnedMessageIdsByChat } from "@/shared/types";
import { readStoredPinnedMessageIds } from "@/shared/utils/storage";

export function useStoredMessageState(userId: string | null | undefined) {
  const [pinnedMessageIdsByChat, setPinnedMessageIdsByChat] =
    useState<PinnedMessageIdsByChat>({});
  const [hiddenMessageIds, setHiddenMessageIds] = useState<number[]>([]);

  const hiddenMessageIdSet = useMemo(() => {
    return new Set(hiddenMessageIds);
  }, [hiddenMessageIds]);

  useEffect(() => {
    let frameId = 0;

    if (!userId) {
      frameId = window.requestAnimationFrame(() => {
        setPinnedMessageIdsByChat({});
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      setPinnedMessageIdsByChat(readStoredPinnedMessageIds(userId));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [userId]);

  useEffect(() => {
    let frameId = 0;

    if (!userId) {
      frameId = window.requestAnimationFrame(() => {
        setHiddenMessageIds([]);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      const storedHiddenMessageIds = window.localStorage.getItem(
        `twinline-hidden-messages-${userId}`,
      );

      if (!storedHiddenMessageIds) {
        setHiddenMessageIds([]);
        return;
      }

      try {
        const parsedHiddenMessageIds = JSON.parse(storedHiddenMessageIds);

        setHiddenMessageIds(
          Array.isArray(parsedHiddenMessageIds)
            ? parsedHiddenMessageIds.filter((id) => Number.isInteger(id))
            : [],
        );
      } catch {
        setHiddenMessageIds([]);
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [userId]);

  return {
    hiddenMessageIds,
    hiddenMessageIdSet,
    setHiddenMessageIds,
    pinnedMessageIdsByChat,
    setPinnedMessageIdsByChat,
  };
}
