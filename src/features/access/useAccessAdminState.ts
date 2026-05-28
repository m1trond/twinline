import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { checkAccessAdmin } from "@/features/access/queries";

export function useAccessAdminState(user: User | null) {
  const [accessAdminUserId, setAccessAdminUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isMounted = true;

    async function syncAccessAdmin() {
      const { data, error } = await checkAccessAdmin();

      if (!isMounted) {
        return;
      }

      setAccessAdminUserId(!error && data === true && user?.id ? user.id : null);
    }

    void syncAccessAdmin();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return {
    canViewAccess: Boolean(user?.id && accessAdminUserId === user.id),
  };
}
