import type { ChangeEvent, FormEvent, RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import { createPortal } from "react-dom";
import { useI18n } from "@/shared/i18n-context";
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
  isEmailVerificationModalOpen: boolean;
  isEmailVerifiedInHush: boolean;
  isProfileBioChanged: boolean;
  isSavingProfileBio: boolean;
  isSendingEmailVerification: boolean;
  isUploadingAvatar: boolean;
  isUsernameChangeAllowed: boolean;
  nextUsernameChangeDate: string | null;
  openAvatarGallery: (url: string | null | undefined) => void;
  profileBioInputValue: string;
  profileBioSaveError: string;
  profileName: string;
  profileNameInputValue: string;
  profileUsernameError: string;
  profileUsernameInputValue: string;
  setProfileBio: (bio: string) => void;
  sendEmailVerificationLetter: () => void | Promise<void>;
  setIsEmailVerificationModalOpen: (isOpen: boolean) => void;
  setProfileName: (name: string) => void;
  setProfileUsername: (username: string) => void;
  setProfileUsernameError: (error: string) => void;
  updateProfileBio: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  updateProfileName: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  updateProfileUsername: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  user: User;
};

const cardClass =
  "rounded-xl border border-[#3f3f46]/35 bg-black/18 px-3 py-2.5";
const labelClass =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-[#d4d4d8]";
const inputClass =
  "min-h-8 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none placeholder:text-[#a1a1aa]/65 focus:border-[#f4f4f5]";
const buttonClass =
  "min-h-8 justify-self-start rounded-lg bg-[#f4f4f5] px-3 text-xs font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b]";

export function ProfileView({
  activeUserName,
  avatarInputRef,
  currentProfile,
  handleAvatarChange,
  isEmailVerificationModalOpen,
  isEmailVerifiedInHush,
  isProfileBioChanged,
  isSavingProfileBio,
  isSendingEmailVerification,
  isUploadingAvatar,
  isUsernameChangeAllowed,
  nextUsernameChangeDate,
  openAvatarGallery,
  profileBioInputValue,
  profileBioSaveError,
  profileName,
  profileNameInputValue,
  profileUsernameError,
  profileUsernameInputValue,
  setProfileBio,
  sendEmailVerificationLetter,
  setIsEmailVerificationModalOpen,
  setProfileName,
  setProfileUsername,
  setProfileUsernameError,
  updateProfileBio,
  updateProfileName,
  updateProfileUsername,
  user,
}: ProfileViewProps) {
  const { language, t } = useI18n();
  const isEmailConfirmed = isEmailVerifiedInHush;

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-[50px] min-h-[50px] items-center rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <h2 className="text-base font-medium text-[#f4f4f5]">{t("profile")}</h2>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
        <div className="w-full max-w-[760px]">
        <div className="mb-3 flex items-center gap-3 border-b border-[#3f3f46]/35 pb-3">
          <button
            className="grid h-[74px] w-[74px] shrink-0 place-items-center overflow-hidden rounded-[22px] bg-[#18181b] text-base font-medium text-[#f4f4f5] transition hover:scale-[1.03] focus:outline-none sm:h-[86px] sm:w-[86px] sm:rounded-[24px]"
            onClick={() => openAvatarGallery(currentProfile?.avatar_url)}
            type="button"
          >
            {currentProfile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={t("avatarAlt")}
                className="h-full w-full object-cover"
                src={currentProfile.avatar_url}
              />
            ) : (
              activeUserName[0]?.toUpperCase()
            )}
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-medium">{activeUserName}</h2>
            <p className="mt-0.5 truncate text-sm font-medium text-[#a1a1aa]">
              {currentProfile?.username ? `@${currentProfile.username}` : t("nicknameNotSet")}
            </p>
            <input
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              ref={avatarInputRef}
              type="file"
            />
            <button
              className="mt-2 rounded-lg border border-[#3f3f46]/35 px-3 py-1.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              type="button"
            >
              {isUploadingAvatar ? t("uploading") : t("changeAvatar")}
            </button>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <section className={cardClass}>
            <p className={labelClass}>{t("profileName")}</p>
            <form className="mt-2 grid gap-2" onSubmit={updateProfileName}>
              <input
                className={inputClass}
                maxLength={24}
                minLength={2}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder={t("profileName")}
                type="text"
                value={profileNameInputValue}
              />
              <button
                className={buttonClass}
                disabled={!profileName.trim() || profileName.trim() === activeUserName}
                type="submit"
              >
                {t("saveName")}
              </button>
            </form>
          </section>

          <section className={cardClass}>
            <p className={labelClass}>{t("username")}</p>
            <form className="mt-2 grid gap-2" onSubmit={updateProfileUsername}>
              <label className="flex min-h-8 items-center rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm focus-within:border-[#f4f4f5]">
                <span className="font-medium text-[#a1a1aa]">@</span>
                <input
                  aria-label="Ник Hush"
                  className="min-w-0 flex-1 bg-transparent pl-1 outline-none placeholder:text-[#a1a1aa]/65"
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
                className={buttonClass}
                disabled={
                  !profileUsernameInputValue.trim() ||
                  normalizeUsername(profileUsernameInputValue) === currentProfile?.username
                }
                type="submit"
              >
                {t("saveNick")}
              </button>
            </form>
            <p className={`mt-1.5 text-xs leading-5 ${profileUsernameError ? "font-medium text-red-300" : "text-[#a1a1aa]"}`}>
              {profileUsernameError ||
                (isUsernameChangeAllowed
                  ? t("usernameCanChangeMonthly")
                  : `Ник снова можно будет изменить ${nextUsernameChangeDate ?? "позже"}.`)}
            </p>
          </section>

          <section className={`${cardClass} sm:col-span-2`}>
            <p className={labelClass}>{t("bio")}</p>
            <form className="mt-2 grid gap-2" onSubmit={updateProfileBio}>
              <textarea
                className="min-h-14 resize-none rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 py-2 text-sm leading-5 outline-none placeholder:text-[#a1a1aa]/65 focus:border-[#f4f4f5]"
                maxLength={100}
                onChange={(event) => setProfileBio(event.target.value.slice(0, 100))}
                placeholder={t("bioPlaceholder")}
                value={profileBioInputValue}
              />
              <button
                className={`min-h-8 justify-self-start rounded-lg px-3 text-xs font-medium text-[#050505] transition disabled:cursor-not-allowed ${
                  isSavingProfileBio || !isProfileBioChanged
                    ? "bg-[#52525b] opacity-70"
                    : "bg-[#f4f4f5] hover:bg-[#e5e5e5]"
                }`}
                disabled={
                  isSavingProfileBio ||
                  !isProfileBioChanged
                }
                type="submit"
              >
                {isSavingProfileBio ? t("saving") : t("save")}
              </button>
              {profileBioSaveError ? (
                <p className="text-xs font-medium leading-5 text-red-300">
                  {profileBioSaveError}
                </p>
              ) : null}
            </form>
          </section>

          <section className={cardClass}>
            <p className={labelClass}>Email</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 break-words text-sm font-medium">{user.email}</p>
              <button
                className={`min-h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  isEmailConfirmed
                    ? "bg-[#52525b] text-[#050505]"
                    : "border border-red-400/45 bg-red-500/18 text-red-100 hover:bg-red-500/26"
                }`}
                disabled={isEmailConfirmed || isSendingEmailVerification}
                onClick={() => void sendEmailVerificationLetter()}
                type="button"
              >
                {isEmailConfirmed
                  ? language === "en" ? "Confirmed" : "Подтверждена"
                  : isSendingEmailVerification
                    ? language === "en" ? "Sending..." : "Отправляю..."
                    : language === "en" ? "Confirm" : "Подтвердить"}
              </button>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#a1a1aa]">
              Его видишь только ты в своем аккаунте.
            </p>
          </section>

          <section className={cardClass}>
            <p className={labelClass}>{t("phone")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[84px_1fr_auto]">
              <select
                aria-label="Страна"
                className="min-h-8 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-2 text-sm outline-none focus:border-[#f4f4f5]"
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
                className={inputClass}
                inputMode="tel"
                placeholder="999 123-45-67"
                type="tel"
              />
              <button
                className="min-h-8 rounded-lg bg-[#52525b] px-3 text-xs font-medium text-[#050505] opacity-70"
                disabled
                type="button"
              >
                {t("phoneSoon")}
              </button>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-[#a1a1aa]">
              {t("phoneSoonDescription")}
            </p>
          </section>
        </div>
        </div>
      </div>
      {isEmailVerificationModalOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                aria-label={t("cancel")}
                className="fixed inset-0 z-[115] bg-black/62 backdrop-blur-md"
                onClick={() => setIsEmailVerificationModalOpen(false)}
                type="button"
              />
              <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[116] max-h-[calc(100dvh-24px)] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:rounded-3xl sm:p-5">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <path d="M4 4h16v16H4z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
                      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-medium leading-tight text-[#f4f4f5]">
                      {language === "en" ? "Check your email" : "Зайди в свою почту"}
                    </h2>
                  </div>
                </div>
                <p className="mb-5 text-sm leading-6 text-[#a1a1aa]">
                  {language === "en"
                    ? "We sent a confirmation email. Open it and click the confirmation button, then return to Hush."
                    : "Мы отправили письмо подтверждения. Открой его, нажми кнопку подтверждения и вернись в Hush."}
                </p>
                <button
                  className="min-h-11 w-full rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
                  onClick={() => setIsEmailVerificationModalOpen(false)}
                  type="button"
                >
                  {language === "en" ? "Got it" : "Понял"}
                </button>
              </section>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
