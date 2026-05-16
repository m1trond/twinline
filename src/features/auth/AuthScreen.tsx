import Image from "next/image";
import type { FormEvent } from "react";
import type { AuthContactMethod, AuthMode } from "@/shared/types";
import { formatUsernameInput } from "@/shared/utils/profile";

type AuthScreenProps = {
  authContactMethod: AuthContactMethod;
  authEmail: string;
  authMode: AuthMode;
  authPassword: string;
  authPhone: string;
  authUsername: string;
  authUsernameError: string;
  errorMessage: string;
  isLightThemeEnabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setAuthContactMethod: (method: AuthContactMethod) => void;
  setAuthEmail: (email: string) => void;
  setAuthMode: (mode: AuthMode) => void;
  setAuthPassword: (password: string) => void;
  setAuthPhone: (phone: string) => void;
  setAuthUsername: (username: string) => void;
  setAuthUsernameError: (error: string) => void;
  setErrorMessage: (error: string) => void;
};

export function AuthScreen({
  authContactMethod,
  authEmail,
  authMode,
  authPassword,
  authPhone,
  authUsername,
  authUsernameError,
  errorMessage,
  isLightThemeEnabled,
  onSubmit,
  setAuthContactMethod,
  setAuthEmail,
  setAuthMode,
  setAuthPassword,
  setAuthPhone,
  setAuthUsername,
  setAuthUsernameError,
  setErrorMessage,
}: AuthScreenProps) {
  return (
    <main className={`hush-shell ${isLightThemeEnabled ? "hush-light" : ""} relative grid h-dvh place-items-center overflow-hidden bg-[#050505] px-4 text-[#f4f4f5]`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,244,245,0.12),transparent_32%),linear-gradient(135deg,#050505_0%,#111111_48%,#000000_100%)]"
      />
      <section className="relative w-full max-w-[min(28rem,calc(100vw-1.5rem))] rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/86 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md sm:rounded-3xl sm:p-5">
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
            <h1 className="text-lg font-medium sm:text-xl">Hush</h1>
            <p className="text-[13px] text-[#a1a1aa]">Вход в приватное пространство</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#3f3f46]/35 bg-black/20 p-1">
          <button
            className={`rounded-lg px-4 py-2 text-[13px] font-medium ${
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
            Вход
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-[13px] font-medium ${
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
            Регистрация
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#3f3f46]/35 bg-black/20 p-1">
          {[
            { label: "Почта", method: "email" as const },
            { label: "Телефон", method: "phone" as const },
          ].map((item) => (
            <button
              className={`rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                authContactMethod === item.method
                  ? "bg-[#f4f4f5] text-[#050505]"
                  : "text-[#f4f4f5] hover:bg-white/10"
              }`}
              key={item.method}
              onClick={() => {
                setAuthContactMethod(item.method);
                setErrorMessage("");
                setAuthUsernameError("");
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <form className="grid gap-3" onSubmit={onSubmit}>
          {authMode === "sign-up" ? (
            <label className="grid gap-1.5">
              <div className="flex min-h-11 items-center rounded-xl border border-transparent bg-[#f4f4f5]/12 px-4 text-sm focus-within:border-[#f4f4f5] sm:min-h-12">
                <span className="shrink-0 font-medium text-[#a1a1aa]">@</span>
                <input
                  aria-label="Никнейм в Hush"
                  className="min-w-0 flex-1 bg-transparent pl-1 outline-none placeholder:text-[#a1a1aa]/70"
                  maxLength={24}
                  minLength={3}
                  onChange={(event) => {
                    setAuthUsername(formatUsernameInput(event.target.value));
                    setAuthUsernameError("");
                  }}
                  placeholder="Никнейм в Hush"
                  type="text"
                  value={authUsername}
                />
              </div>
              {authUsernameError ? (
                <span className="text-[13px] font-medium text-red-300">
                  {authUsernameError}
                </span>
              ) : (
                <span className="text-xs font-medium text-[#a1a1aa]">
                  По этому нику тебя смогут найти другие пользователи.
                </span>
              )}
            </label>
          ) : null}
          {authContactMethod === "email" ? (
            <>
              <input
                className="min-h-11 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-4 text-sm outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] sm:min-h-12"
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="Email"
                type="email"
                value={authEmail}
              />
              <input
                className="min-h-11 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-4 text-sm outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] sm:min-h-12"
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Пароль"
                type="password"
                value={authPassword}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-[#3f3f46]/40 bg-black/22 p-3">
              <div className="flex min-h-11 overflow-hidden rounded-xl border border-[#3f3f46]/35 bg-[#f4f4f5]/12 focus-within:border-[#f4f4f5] sm:min-h-12">
                <select
                  aria-label="Страна"
                  className="w-24 border-r border-[#3f3f46]/35 bg-transparent px-3 text-sm text-[#f4f4f5] outline-none"
                  defaultValue="+7"
                >
                  <option className="bg-[#111111]" value="+7">+7</option>
                  <option className="bg-[#111111]" value="+380">+380</option>
                  <option className="bg-[#111111]" value="+375">+375</option>
                  <option className="bg-[#111111]" value="+1">+1</option>
                </select>
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#a1a1aa]/70"
                  inputMode="tel"
                  onChange={(event) => setAuthPhone(event.target.value)}
                  placeholder="Номер телефона"
                  type="tel"
                  value={authPhone}
                />
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3 text-[13px] leading-5 text-amber-100">
                <svg
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8v5m0 3h.01M10.3 4.3 2.8 17.4A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.6L13.7 4.3a2 2 0 0 0-3.4 0Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <p>
                  Вход по телефону почти готов по интерфейсу. SMS-коды, выбор страны и подтверждение подключим следующим шагом.
                </p>
              </div>
            </div>
          )}
          <button
            className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b] disabled:text-[#a1a1aa] sm:min-h-12"
            disabled={authContactMethod === "phone"}
            type="submit"
          >
            {authContactMethod === "phone"
              ? "Скоро будет доступно"
              : authMode === "sign-in"
                ? "Войти"
                : "Создать аккаунт"}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 text-[13px] font-medium text-[#e5e5e5]">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
