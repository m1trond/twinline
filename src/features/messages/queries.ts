import { supabase } from "@/lib/supabase";
import {
  legacyProfileColumns,
  messageColumns,
  profileColumns,
  usernameProfileColumns,
} from "@/shared/constants";
import type { MessageRow } from "@/shared/types";

function sortMessagesAscending(messages: MessageRow[] | null) {
  return messages
    ? [...messages].sort((firstMessage, secondMessage) => {
        return (
          new Date(firstMessage.created_at).getTime() -
          new Date(secondMessage.created_at).getTime()
        );
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
