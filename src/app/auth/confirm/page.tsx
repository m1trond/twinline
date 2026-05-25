"use client";

import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const allowedOtpTypes = new Set<string>([
  "email",
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
]);

export default function AuthConfirmPage() {
  const [statusText, setStatusText] = useState("Подтверждаем почту...");

  useEffect(() => {
    async function confirmEmail() {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get("token_hash");
      const typeParam = searchParams.get("type") ?? "email";
      const nextPath = searchParams.get("next") || "/";
      const type = allowedOtpTypes.has(typeParam) ? typeParam : "email";

      if (!tokenHash) {
        setStatusText("Ссылка подтверждения повреждена. Попробуй запросить письмо ещё раз.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });

      if (error) {
        setStatusText("Не получилось подтвердить почту. Возможно, ссылка уже использована или устарела.");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        window.localStorage.setItem(`hush-email-verified-${userData.user.id}`, "true");
      }

      setStatusText("Почта подтверждена. Открываем Hush...");
      window.setTimeout(() => {
        window.location.replace(nextPath.startsWith("/") ? nextPath : "/");
      }, 450);
    }

    void confirmEmail();
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#050505] px-4 text-[#f4f4f5]">
      <section className="w-full max-w-sm rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/90 p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f4f4f5] text-[#050505]">
          <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path
              d="M20 6 9 17l-5-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
        <h1 className="text-base font-medium">Hush</h1>
        <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">{statusText}</p>
      </section>
    </main>
  );
}
