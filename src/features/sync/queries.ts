import { supabase } from "@/lib/supabase";

export type UserSyncPayload = Record<string, unknown>;

export async function fetchUserSyncState() {
  return supabase
    .from("user_sync_states")
    .select("payload")
    .maybeSingle();
}

export async function upsertUserSyncState(userId: string, payload: UserSyncPayload) {
  return supabase
    .from("user_sync_states")
    .upsert(
      {
        user_id: userId,
        payload,
      },
      {
        onConflict: "user_id",
      },
    );
}
