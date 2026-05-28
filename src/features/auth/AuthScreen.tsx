import Image from "next/image";
import type { FormEvent } from "react";
import { useI18n } from "@/shared/i18n-context";
import type { AuthMode } from "@/shared/types";
import { formatUsernameInput } from "@/shared/utils/profile";

type AuthScreenProps = {
  authEmail: string;
  authMode: AuthMode;
  authPassword: string;
  authUsername: string;
  authUsernameError: string;
  errorMessage: string;
  isLightThemeEnabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setAuthEmail: (email: string) => void;
  setAuthMode: (mode: AuthMode) => void;
  setAuthPassword: (password: string) => void;
  setAuthUsername: (username: string) => void;
  setAuthUsernameError: (error: string) => void;
  setErrorMessage: (error: string) => void;
};

export function AuthScreen({
  authEmail,
  authMode,
  authPassword,
  authUsername,
  authUsernameError,
  errorMessage,
  isLightThemeEnabled,
  onSubmit,
  setAuthEmail,
  setAuthMode,
  setAuthPassword,
  setAuthUsername,
  setAuthUsernameError,
  setErrorMessage,
}: AuthScreenProps) {
  const { t } = useI18n();

  return (
    <main className={`hush-shell ${isLightThemeEnabled ? "hush-light" : ""} relative grid h-dvh place-items-center overflow-hidden bg-[#050505] px-4 text-[#f4f4f5]`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,244,245,0.12),transparent_32%),linear-gradient(135deg,#050505_0%,#111111_48%,#000000_100%)]"
      />
      <section className="hush-modal-transition relative w-full max-w-[min(28rem,calc(100vw-1.5rem))] rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/86 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md sm:rounded-3xl sm:p-5">
        <div className="mb-5 flex items-center gap-3 sm:mb-6">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white sm:h-11 sm:w-11">
            <Image
              alt="Hush"
              className="h-full w-full object-cover"
              height={44}
              src="/hush-logo.png"
              width={44}
            />
          </div>
          <div>
            <h1 className="text-base font-medium sm:text-base">Hush</h1>
            <p className="text-sm text-[#a1a1aa]">{t("signInPrivateSpace")}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#3f3f46]/35 bg-black/20 p-1">
          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              authMode === "sign-in"
                ? "bg-[#f4f4f5] text-[#050505]"
                : "text-[#f4f4f5]"
            }`}
            onClick={() => {
              setAuthMode("sign-in");
              setErrorMessage("");
              setAuthUsernameError("");
            }}
            type="button"
          >
            {t("signIn")}
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              authMode === "sign-up"
                ? "bg-[#f4f4f5] text-[#050505]"
                : "text-[#f4f4f5]"
            }`}
            onClick={() => {
              setAuthMode("sign-up");
              setErrorMessage("");
              setAuthUsernameError("");
            }}
            type="button"
          >
            {t("signUp")}
          </button>
        </div>

        <form className="grid gap-3" onSubmit={onSubmit}>
          {authMode === "sign-up" ? (
            <label className="grid gap-1.5">
              <div className="flex min-h-9 items-center rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm focus-within:border-[#f4f4f5]">
                <span className="shrink-0 font-medium text-[#a1a1aa]">@</span>
                <input
                  aria-label={t("username")}
                  className="min-w-0 flex-1 bg-transparent pl-1 outline-none placeholder:text-[#a1a1aa]/70"
                  maxLength={24}
                  minLength={3}
                  onChange={(event) => {
                    setAuthUsername(formatUsernameInput(event.target.value));
                    setAuthUsernameError("");
                  }}
                  placeholder={t("username")}
                  type="text"
                  value={authUsername}
                />
              </div>
              {authUsernameError ? (
                <span className="text-sm font-medium text-red-300">
                  {authUsernameError}
                </span>
              ) : (
                <span className="text-xs font-medium text-[#a1a1aa]">
                  {t("usernameHelp")}
                </span>
              )}
            </label>
          ) : null}
          <input
            className="min-h-9 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5]"
            onChange={(event) => setAuthEmail(event.target.value)}
            placeholder="Email"
            type="email"
            value={authEmail}
          />
          <input
            className="min-h-9 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5]"
            onChange={(event) => setAuthPassword(event.target.value)}
            placeholder={t("password")}
            type="password"
            value={authPassword}
          />
          <button
            className="min-h-9 rounded-lg bg-[#f4f4f5] px-3 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b] disabled:text-[#a1a1aa]"
            type="submit"
          >
            {authMode === "sign-in" ? t("signIn") : t("createAccount")}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 text-sm font-medium text-[#e5e5e5]">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
