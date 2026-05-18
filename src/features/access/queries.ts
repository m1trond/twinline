import { supabase } from "@/lib/supabase";
import type { AccessProfileRow } from "@/shared/types";

export async function fetchAccessProfiles() {
  const response = await supabase.rpc("get_access_profiles");

  return {
    ...response,
    data: (response.data ?? null) as AccessProfileRow[] | null,
  };
}
