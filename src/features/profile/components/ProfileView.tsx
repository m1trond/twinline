import type { ChangeEvent, FormEvent, RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import type { ProfileRow } from "@/shared/types";
import {
  formatUsernameInput,
  normalizeUsername,
} from "@/shared/utils/profile";

type ProfileViewProps = {
  activeUserName: string;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  currentProfile: ProfileRow | null | undefined;
  handleAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isUploadingAvatar: boolean;
  isUsernameChangeAllowed: boolean;
  nextUsernameChangeDate: string | null;
  openAvatarGallery: (url: string | null | undefined) => void;
  profileName: string;
  profileNameInputValue: string;
  profileUsernameError: string;
  profileUsernameInputValue: string;
  setProfileName: (name: string) => void;
  setProfileUsername: (username: string) => void;
  setProfileUsernameError: (error: string) => void;
  updateProfileName: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  updateProfileUsername: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  user: User;
};

export function ProfileView({
  activeUserName,
  avatarInputRef,
  currentProfile,
  handleAvatarChange,
  isUploadingAvatar,
  isUsernameChangeAllowed,
  nextUsernameChangeDate,
  openAvatarGallery,
  profileName,
  profileNameInputValue,
  profileUsernameError,
  profileUsernameInputValue,
  setProfileName,
  setProfileUsername,
  setProfileUsernameError,
  updateProfileName,
  updateProfileUsername,
  user,
}: ProfileViewProps) {
  return (
    <div className="hush-panel-transition min-h-0 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#3f3f46]/35 pb-3 sm:mb-4 sm:gap-4 sm:pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="grid h-[82px] w-[82px] shrink-0 place-items-center overflow-hidden rounded-[24px] bg-[#18181b] text-base font-medium text-[#f4f4f5] transition hover:scale-[1.03] focus:outline-none sm:h-[96px] sm:w-[96px] sm:rounded-[28px] sm:text-base"
            onClick={() => openAvatarGallery(currentProfile?.avatar_url)}
            type="button"
          >
            {currentProfile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Твоя аватарка"
                className="h-full w-full object-cover"
                src={currentProfile.avatar_url}
              />
            ) : (
              activeUserName[0]?.toUpperCase()
            )}
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-medium sm:text-base">
              {activeUserName}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-[#a1a1aa]">
              {currentProfile?.username ? `@${currentProfile.username}` : "@ник не задан"}
            </p>
            <input
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              ref={avatarInputRef}
              type="file"
            />
            <button
              className="mt-2 rounded-xl border border-[#3f3f46]/35 px-3 py-1.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              type="button"
            >
              {isUploadingAvatar ? "Загружаю..." : "Изменить аватарку"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 px-3 py-2.5 sm:col-span-2 sm:rounded-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
            Имя профиля
          </p>
          <form className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={updateProfileName}>
            <input
              className="min-h-9 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-60"
              maxLength={24}
              minLength={2}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="Новое имя"
              type="text"
              value={profileNameInputValue}
            />
            <button
              className="min-h-9 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b]"
              disabled={!profileName.trim() || profileName.trim() === activeUserName}
              type="submit"
            >
              Сохранить имя
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 px-3 py-2.5 sm:col-span-2 sm:rounded-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
            Ник Hush
          </p>
          <form className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={updateProfileUsername}>
            <label className="flex min-h-9 items-center rounded-xl border border-transparent bg-[#f4f4f5]/12 px-3 text-sm focus-within:border-[#f4f4f5]">
              <span className="font-medium text-[#a1a1aa]">@</span>
              <input
                aria-label="Ник Hush"
                className="min-w-0 flex-1 bg-transparent pl-1 outline-none placeholder:text-[#a1a1aa]/70"
                maxLength={24}
                minLength={3}
                onChange={(event) => {
                  setProfileUsername(formatUsernameInput(event.target.value));
                  setProfileUsernameError("");
                }}
                placeholder="m1trond"
                type="text"
                value={profileUsernameInputValue}
              />
            </label>
            <button
              className="min-h-9 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b]"
              disabled={
                !profileUsernameInputValue.trim() ||
                normalizeUsername(profileUsernameInputValue) === currentProfile?.username
              }
              type="submit"
            >
              Сохранить ник
            </button>
          </form>
          <p className={`mt-1.5 text-xs leading-5 ${profileUsernameError ? "font-medium text-red-300" : "text-[#a1a1aa]"}`}>
            {profileUsernameError ||
              (isUsernameChangeAllowed
                ? "Ник можно менять один раз в месяц."
                : `Ник снова можно будет изменить ${nextUsernameChangeDate ?? "позже"}.`)}
          </p>
        </section>

        <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 px-3 py-2.5 sm:rounded-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
            Email
          </p>
          <p className="mt-1.5 break-words text-sm font-medium">
            {user.email}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#a1a1aa]">
            Его видишь только ты в своем аккаунте.
          </p>
        </section>

        <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 px-3 py-2.5 sm:rounded-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
            Телефон
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(120px,0.36fr)_1fr_auto]">
            <select
              aria-label="Страна"
              className="min-h-9 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none focus:border-[#f4f4f5]"
              defaultValue="+7"
            >
              <option value="+7">RU +7</option>
              <option value="+375">BY +375</option>
              <option value="+380">UA +380</option>
              <option value="+1">US +1</option>
              <option value="+49">DE +49</option>
            </select>
            <input
              aria-label="Номер телефона"
              className="min-h-9 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5]"
              inputMode="tel"
              placeholder="999 123-45-67"
              type="tel"
            />
            <button
              className="min-h-9 rounded-xl bg-[#52525b] px-4 text-sm font-medium text-[#050505] opacity-70"
              disabled
              type="button"
            >
              Скоро
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-[#a1a1aa]">
            Позже подключим вход и регистрацию по SMS.
          </p>
        </section>
      </div>
    </div>
  );
}
