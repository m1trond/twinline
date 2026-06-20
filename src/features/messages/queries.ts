import { supabase } from "@/lib/supabase";
import {
  legacyProfileColumns,
  messageColumns,
  messagePinColumns,
  messageReceiptColumns,
  messageTypingStateColumns,
  profileColumns,
  usernameProfileColumns,
} from "@/shared/constants";
import type {
  MessagePinRow,
  MessageReceiptRow,
  MessageReceiptStatus,
  MessageRow,
  MessageTypingAction,
  MessageTypingStateRow,
} from "@/shared/types";
import { compareMessageIds } from "@/shared/utils/messages";

function sortMessagesAscending(messages: MessageRow[] | null) {
  return messages
    ? [...messages].sort((firstMessage, secondMessage) => {
        const createdAtDiff =
          new Date(firstMessage.created_at).getTime() -
          new Date(secondMessage.created_at).getTime();

        if (createdAtDiff !== 0) {
          return createdAtDiff;
        }

        return compareMessageIds(firstMessage.id, secondMessage.id);
      })
    : messages;
}

export async function fetchMessages(userId: string) {
  const response = await supabase
    .from("messages")
    .select(messageColumns)
    .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1000);

  return {
    ...response,
    data: sortMessagesAscending(response.data as MessageRow[] | null),
  };
}

export async function fetchDialogMessages(userId: string, friendId: string) {
  const response = await supabase
    .from("messages")
    .select(messageColumns)
    .or(
      `and(user_id.eq.${userId},recipient_id.eq.${friendId}),and(user_id.eq.${friendId},recipient_id.eq.${userId})`,
    )
    .order("created_at", { ascending: false })
    .limit(400);

  return {
    ...response,
    data: sortMessagesAscending(response.data as MessageRow[] | null),
  };
}

export async function fetchMessagesAfter(createdAt: string, userId: string) {
  return supabase
    .from("messages")
    .select(messageColumns)
    .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
    .gt("created_at", createdAt)
    .order("created_at", { ascending: true });
}

export async function fetchMessageReceipts(userId: string) {
  return supabase
    .from("message_receipts")
    .select(messageReceiptColumns)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: true });
}

export async function upsertMessageReceipt(
  messageId: number,
  senderId: string,
  recipientId: string,
  status: MessageReceiptStatus,
) {
  return supabase
    .from("message_receipts")
    .upsert(
      {
        message_id: messageId,
        recipient_id: recipientId,
        sender_id: senderId,
        status,
      },
      { onConflict: "message_id,sender_id,status" },
    )
    .select(messageReceiptColumns)
    .single<MessageReceiptRow>();
}

export async function fetchMessageTypingStates(userId: string) {
  return supabase
    .from("message_typing_states")
    .select(messageTypingStateColumns)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
}

export async function upsertMessageTypingState(
  senderId: string,
  recipientId: string,
  action: MessageTypingAction,
  eventAt: string,
) {
  const eventTime = new Date(eventAt).getTime();
  const expiresAt = new Date(
    action === "start" ? eventTime + 4500 : eventTime,
  ).toISOString();

  return supabase
    .from("message_typing_states")
    .upsert(
      {
        action,
        event_at: eventAt,
        expires_at: expiresAt,
        recipient_id: recipientId,
        sender_id: senderId,
      },
      { onConflict: "sender_id,recipient_id" },
    )
    .select(messageTypingStateColumns)
    .single<MessageTypingStateRow>();
}

export async function fetchMessagePins(userId: string) {
  return supabase
    .from("message_pins")
    .select(messagePinColumns)
    .or(`pinner_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("updated_at", { ascending: true });
}

export async function upsertMessagePin(
  messageId: number,
  pinnerId: string,
  recipientId: string,
  isPinned: boolean,
) {
  return supabase
    .from("message_pins")
    .upsert(
      {
        is_pinned: isPinned,
        message_id: messageId,
        pinner_id: pinnerId,
        recipient_id: recipientId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "message_id,pinner_id,recipient_id" },
    )
    .select(messagePinColumns)
    .single<MessagePinRow>();
}

export async function fetchProfiles() {
  const profilesWithUsername = await supabase
    .from("profiles")
    .select(profileColumns);

  if (!profilesWithUsername.error) {
    return profilesWithUsername;
  }

  const profilesWithoutUsernameDate = await supabase
    .from("profiles")
    .select(usernameProfileColumns);

  if (!profilesWithoutUsernameDate.error) {
    return {
      ...profilesWithoutUsernameDate,
      data: profilesWithoutUsernameDate.data?.map((profile) => ({
        ...profile,
        bio: null,
        username_changed_at: null,
      })) ?? null,
    };
  }

  const legacyProfiles = await supabase
    .from("profiles")
    .select(legacyProfileColumns);

  return {
    ...legacyProfiles,
    data: legacyProfiles.data?.map((profile) => ({
      ...profile,
      bio: null,
      username: null,
      username_changed_at: null,
    })) ?? null,
  };
}

export async function fetchUsernameOwner(username: string) {
  return supabase
    .from("profiles")
    .select("user_id, username")
    .eq("username", username)
    .maybeSingle();
}

export async function fetchCallSignalsAfter(receiverId: string, createdAt: string) {
  return supabase
    .from("call_signals")
    .select("id, sender_id, receiver_id, type, payload, created_at")
    .eq("receiver_id", receiverId)
    .gt("created_at", createdAt)
    .order("created_at", { ascending: true });
}
