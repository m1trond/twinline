import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  fetchMessagePins,
  fetchMessageReceipts,
  fetchMessageTypingStates,
} from "@/features/messages/queries";
import type {
  MessagePinRow,
  MessageReceiptRow,
  MessageTypingStateRow,
} from "@/shared/types";

function isReceiptForUser(row: MessageReceiptRow, userId: string) {
  return row.sender_id === userId || row.recipient_id === userId;
}

function isTypingStateForUser(row: MessageTypingStateRow, userId: string) {
  return row.sender_id === userId || row.recipient_id === userId;
}

function isPinForUser(row: MessagePinRow, userId: string) {
  return row.pinner_id === userId || row.recipient_id === userId;
}

function mergeReceipts(
  currentRows: MessageReceiptRow[],
  incomingRows: MessageReceiptRow[],
) {
  const rowsByKey = new Map<string, MessageReceiptRow>();

  for (const row of currentRows) {
    rowsByKey.set(`${row.message_id}:${row.sender_id}:${row.status}`, row);
  }

  for (const row of incomingRows) {
    rowsByKey.set(`${row.message_id}:${row.sender_id}:${row.status}`, row);
  }

  return Array.from(rowsByKey.values()).sort(
    (firstRow, secondRow) =>
      new Date(firstRow.created_at).getTime() -
        new Date(secondRow.created_at).getTime() || firstRow.id - secondRow.id,
  );
}

function mergeTypingStates(
  currentRows: MessageTypingStateRow[],
  incomingRows: MessageTypingStateRow[],
) {
  const rowsByKey = new Map<string, MessageTypingStateRow>();

  for (const row of currentRows) {
    rowsByKey.set(`${row.sender_id}:${row.recipient_id}`, row);
  }

  for (const row of incomingRows) {
    rowsByKey.set(`${row.sender_id}:${row.recipient_id}`, row);
  }

  return Array.from(rowsByKey.values());
}

function mergePins(currentRows: MessagePinRow[], incomingRows: MessagePinRow[]) {
  const rowsByKey = new Map<string, MessagePinRow>();

  for (const row of currentRows) {
    rowsByKey.set(`${row.message_id}:${row.pinner_id}:${row.recipient_id}`, row);
  }

  for (const row of incomingRows) {
    rowsByKey.set(`${row.message_id}:${row.pinner_id}:${row.recipient_id}`, row);
  }

  return Array.from(rowsByKey.values()).sort(
    (firstRow, secondRow) =>
      new Date(firstRow.updated_at).getTime() -
      new Date(secondRow.updated_at).getTime(),
  );
}

export function useMessageStateRealtime(user: User | null) {
  const [loadedMessageReceiptsUserId, setLoadedMessageReceiptsUserId] = useState<string | null>(null);
  const [messageReceipts, setMessageReceipts] = useState<MessageReceiptRow[]>([]);
  const [messageTypingStates, setMessageTypingStates] = useState<MessageTypingStateRow[]>([]);
  const [messagePins, setMessagePins] = useState<MessagePinRow[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) {
      const frameId = window.requestAnimationFrame(() => {
        setMessageReceipts([]);
        setMessageTypingStates([]);
        setMessagePins([]);
        setLoadedMessageReceiptsUserId(null);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    const signedInUser = user;
    let isMounted = true;

    async function syncMessageState() {
      const [receiptsResponse, typingResponse, pinsResponse] = await Promise.all([
        fetchMessageReceipts(signedInUser.id),
        fetchMessageTypingStates(signedInUser.id),
        fetchMessagePins(signedInUser.id),
      ]);

      if (!isMounted) {
        return;
      }

      if (!receiptsResponse.error) {
        setMessageReceipts((currentRows) =>
          mergeReceipts(currentRows, (receiptsResponse.data ?? []) as MessageReceiptRow[]),
        );
      } else {
        console.warn("Hush message receipts sync failed:", receiptsResponse.error.message);
      }

      setLoadedMessageReceiptsUserId(signedInUser.id);

      if (!typingResponse.error) {
        setMessageTypingStates((currentRows) =>
          mergeTypingStates(currentRows, (typingResponse.data ?? []) as MessageTypingStateRow[]),
        );
      } else {
        console.warn("Hush typing state sync failed:", typingResponse.error.message);
      }

      if (!pinsResponse.error) {
        setMessagePins((currentRows) =>
          mergePins(currentRows, (pinsResponse.data ?? []) as MessagePinRow[]),
        );
      } else {
        console.warn("Hush message pins sync failed:", pinsResponse.error.message);
      }
    }

    syncMessageState();

    const channel = supabase
      .channel(`message-state-${signedInUser.id}`, {
        config: {
          broadcast: {
            ack: false,
            self: false,
          },
        },
      })
      .on("broadcast", { event: "receipt-upsert" }, (event) => {
        const receipt = (event.payload as { receipt?: MessageReceiptRow } | null)?.receipt;

        if (receipt && isReceiptForUser(receipt, signedInUser.id)) {
          setMessageReceipts((currentRows) => mergeReceipts(currentRows, [receipt]));
        }
      })
      .on("broadcast", { event: "receipts-upsert" }, (event) => {
        const receipts = (event.payload as { receipts?: MessageReceiptRow[] } | null)?.receipts;

        if (Array.isArray(receipts)) {
          const userReceipts = receipts.filter((receipt) =>
            isReceiptForUser(receipt, signedInUser.id),
          );

          if (userReceipts.length > 0) {
            setMessageReceipts((currentRows) => mergeReceipts(currentRows, userReceipts));
          }
        }
      })
      .on("broadcast", { event: "typing-upsert" }, (event) => {
        const typingState = (event.payload as { typingState?: MessageTypingStateRow } | null)?.typingState;

        if (typingState && isTypingStateForUser(typingState, signedInUser.id)) {
          setMessageTypingStates((currentRows) => mergeTypingStates(currentRows, [typingState]));
        }
      })
      .on("broadcast", { event: "pin-upsert" }, (event) => {
        const pin = (event.payload as { pin?: MessagePinRow } | null)?.pin;

        if (pin && isPinForUser(pin, signedInUser.id)) {
          setMessagePins((currentRows) => mergePins(currentRows, [pin]));
        }
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_receipts" },
        (payload) => {
          const receipt = payload.new as MessageReceiptRow;

          if (receipt && isReceiptForUser(receipt, signedInUser.id)) {
            setMessageReceipts((currentRows) => mergeReceipts(currentRows, [receipt]));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_typing_states" },
        (payload) => {
          const typingState = payload.new as MessageTypingStateRow;

          if (typingState && isTypingStateForUser(typingState, signedInUser.id)) {
            setMessageTypingStates((currentRows) => mergeTypingStates(currentRows, [typingState]));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_pins" },
        (payload) => {
          const pin = payload.new as MessagePinRow;

          if (pin && isPinForUser(pin, signedInUser.id)) {
            setMessagePins((currentRows) => mergePins(currentRows, [pin]));
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    const fallbackInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncMessageState();
      }
    }, 15_000);

    return () => {
      isMounted = false;
      window.clearInterval(fallbackInterval);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const broadcastReceipt = useCallback((receipt: MessageReceiptRow) => {
    void channelRef.current?.send({
      event: "receipt-upsert",
      payload: { receipt },
      type: "broadcast",
    });
  }, []);

  const broadcastReceipts = useCallback((receipts: MessageReceiptRow[]) => {
    if (receipts.length === 0) {
      return;
    }

    for (let receiptIndex = 0; receiptIndex < receipts.length; receiptIndex += 250) {
      void channelRef.current?.send({
        event: "receipts-upsert",
        payload: { receipts: receipts.slice(receiptIndex, receiptIndex + 250) },
        type: "broadcast",
      });
    }
  }, []);

  const broadcastTypingState = useCallback((typingState: MessageTypingStateRow) => {
    void channelRef.current?.send({
      event: "typing-upsert",
      payload: { typingState },
      type: "broadcast",
    });
  }, []);

  const broadcastPin = useCallback((pin: MessagePinRow) => {
    void channelRef.current?.send({
      event: "pin-upsert",
      payload: { pin },
      type: "broadcast",
    });
  }, []);

  return {
    broadcastPin,
    broadcastReceipt,
    broadcastReceipts,
    broadcastTypingState,
    hasLoadedMessageReceipts: loadedMessageReceiptsUserId === user?.id,
    messagePins,
    messageReceipts,
    messageTypingStates,
    setMessagePins,
    setMessageReceipts,
    setMessageTypingStates,
  };
}
