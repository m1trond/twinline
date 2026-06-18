import type { ChangeEvent, FormEvent, RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { UsernameCopyButton } from "@/components/ui/UsernameCopyButton";
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

const sectionClass =
  "rounded-lg border border-[#3f3f46]/35 bg-[#0c0c0d]/76 p-2.5";
const labelClass =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-[#d4d4d8]";
const inputClass =
  "h-8 min-h-8 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none placeholder:text-[#a1a1aa]/65 focus:border-[#f4f4f5]";
const iconButtonClass =
  "hush-stable-button grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4f4f5] text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b] disabled:opacity-70";

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="m5 12 4 4 10-10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CameraIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M14.5 4.5 16 7h2.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-7A2.5 2.5 0 0 1 5.5 7H8l1.5-2.5h5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

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
  const usernameHelpText = profileUsernameError ||
    (isUsernameChangeAllowed
      ? t("usernameCanChangeMonthly")
      : language === "en"
        ? `Username can be changed again ${nextUsernameChangeDate ?? "later"}.`
        : `Ник снова можно будет изменить ${nextUsernameChangeDate ?? "позже"}.`);

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-9 min-h-9 items-center rounded-lg border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-0 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-4">
        <h2 className="text-base font-medium leading-none text-[#f4f4f5]">{t("profile")}</h2>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#3f3f46]/45 bg-[#111111]/78 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-3">
        <div className="w-full max-w-[780px]">
          <section className="mb-2.5 rounded-lg border border-[#3f3f46]/35 bg-[#0b0b0c]/78 p-2.5">
            <div className="flex items-center gap-3">
              <Avatar
                alt={t("avatarAlt")}
                className="h-16 w-16 cursor-pointer bg-[#18181b] text-base text-[#f4f4f5] focus:outline-none sm:h-[72px] sm:w-[72px]"
                name={activeUserName}
                onClick={() => openAvatarGallery(currentProfile?.avatar_url)}
                src={currentProfile?.avatar_url}
              />
              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-medium leading-tight">
                    {activeUserName}
                  </h2>
                  <UsernameCopyButton
                    className="mt-0.5 block text-sm font-medium leading-none text-[#a1a1aa] hover:text-[#e5e5e5]"
                    fallback={t("nicknameNotSet")}
                    username={currentProfile?.username}
                  />
                </div>
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  ref={avatarInputRef}
                  type="file"
                />
                <button
                  aria-label={t("changeAvatar")}
                  className="hush-stable-button mt-2 inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#3f3f46]/35 px-2.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  title={t("changeAvatar")}
                  type="button"
                >
                  <CameraIcon className="h-3.5 w-3.5" />
                  <span>{isUploadingAvatar ? t("uploading") : t("changeAvatar")}</span>
                </button>
              </div>
            </div>
          </section>

          <div className="grid gap-2 sm:grid-cols-2">
            <section className={sectionClass}>
              <p className={labelClass}>{t("profileName")}</p>
              <form className="mt-2 flex items-center gap-2" onSubmit={updateProfileName}>
                <input
                  className={`${inputClass} min-w-0 flex-1`}
                  maxLength={24}
                  minLength={2}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder={t("profileName")}
                  type="text"
                  value={profileNameInputValue}
                />
                <button
                  aria-label={t("saveName")}
                  className={iconButtonClass}
                  disabled={!profileName.trim() || profileName.trim() === activeUserName}
                  title={t("saveName")}
                  type="submit"
                >
                  <CheckIcon />
                </button>
              </form>
            </section>

            <section className={sectionClass}>
              <p className={labelClass}>{t("username")}</p>
              <form className="mt-2 flex items-center gap-2" onSubmit={updateProfileUsername}>
                <label className="flex h-8 min-w-0 flex-1 items-center rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm focus-within:border-[#f4f4f5]">
                  <span className="font-medium text-[#a1a1aa]">@</span>
                  <input
                    aria-label={language === "en" ? "Hush username" : "Ник Hush"}
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
                  aria-label={t("saveNick")}
                  className={iconButtonClass}
                  disabled={
                    !profileUsernameInputValue.trim() ||
                    normalizeUsername(profileUsernameInputValue) === currentProfile?.username
                  }
                  title={t("saveNick")}
                  type="submit"
                >
                  <CheckIcon />
                </button>
              </form>
              <p className={`mt-1.5 text-xs leading-5 ${profileUsernameError ? "font-medium text-red-300" : "text-[#a1a1aa]"}`}>
                {usernameHelpText}
              </p>
            </section>

            <section className={`${sectionClass} sm:col-span-2`}>
              <div className="flex items-center justify-between gap-2">
                <p className={labelClass}>{t("bio")}</p>
                <span className="text-xs font-medium text-[#71717a]">
                  {profileBioInputValue.length}/100
                </span>
              </div>
              <form className="mt-2" onSubmit={updateProfileBio}>
                <div className="flex min-h-12 items-center rounded-lg border border-transparent bg-[#f4f4f5]/12 focus-within:border-[#f4f4f5]">
                  <textarea
                    className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-5 outline-none placeholder:text-[#a1a1aa]/65"
                    maxLength={100}
                    onChange={(event) => setProfileBio(event.target.value.slice(0, 100))}
                    placeholder={t("bioPlaceholder")}
                    value={profileBioInputValue}
                  />
                  <button
                    aria-label={t("save")}
                    className={`hush-stable-button mr-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#050505] transition disabled:cursor-not-allowed ${
                      isSavingProfileBio || !isProfileBioChanged
                        ? "bg-[#52525b] opacity-70"
                        : "bg-[#f4f4f5] hover:bg-[#e5e5e5]"
                    }`}
                    disabled={isSavingProfileBio || !isProfileBioChanged}
                    title={isSavingProfileBio ? t("saving") : t("save")}
                    type="submit"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {profileBioSaveError ? (
                  <p className="mt-1 text-xs font-medium leading-5 text-red-300">
                    {profileBioSaveError}
                  </p>
                ) : null}
              </form>
            </section>

            <section className={`${sectionClass} sm:col-span-2`}>
              <p className={labelClass}>Email</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 break-words text-sm font-medium">{user.email}</p>
                {isEmailConfirmed ? (
                  <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/10 px-2.5 text-xs font-medium text-[#d4d4d8]">
                    <CheckIcon className="h-3.5 w-3.5" />
                    {language === "en" ? "Confirmed" : "Подтверждена"}
                  </span>
                ) : (
                  <button
                    className="hush-stable-button inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-red-400/45 bg-red-500/18 px-2.5 text-xs font-medium text-red-100 transition hover:bg-red-500/26 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSendingEmailVerification}
                    onClick={() => void sendEmailVerificationLetter()}
                    type="button"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    {isSendingEmailVerification
                      ? language === "en" ? "Sending..." : "Отправляю..."
                      : language === "en" ? "Confirm" : "Подтвердить"}
                  </button>
                )}
              </div>
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
