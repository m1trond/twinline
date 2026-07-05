import { useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent, RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { UsernameCopyButton } from "@/components/ui/UsernameCopyButton";
import { useI18n } from "@/shared/i18n-context";
import { NavIcon } from "@/components/navigation/NavButton";
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

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M4 6h16v12H4z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="m4 8 8 6 8-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SaveButton({
  disabled = false,
  visible,
}: {
  disabled?: boolean;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <button
      aria-label="Сохранить"
      className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4f4f5]/10 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/16 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      title="Сохранить"
      type="submit"
    >
      <CheckIcon className="h-4 w-4" />
    </button>
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
  const normalizedUsernameInput = normalizeUsername(profileUsernameInputValue);
  const hasProfileNameChanges =
    profileNameInputValue.trim() !== activeUserName &&
    profileNameInputValue.trim().length >= 2;
  const hasUsernameChanges =
    normalizedUsernameInput !== currentProfile?.username &&
    profileUsernameInputValue.trim().length >= 3;
  const usernameHelpText = profileUsernameError ||
    (isUsernameChangeAllowed
      ? t("usernameCanChangeMonthly")
      : language === "en"
        ? `Username can be changed again ${nextUsernameChangeDate ?? "later"}.`
        : `Ник снова можно будет изменить ${nextUsernameChangeDate ?? "позже"}.`);

  const currentProfileRef = useRef(currentProfile);
  const setProfileNameRef = useRef(setProfileName);
  const setProfileUsernameRef = useRef(setProfileUsername);
  const setProfileBioRef = useRef(setProfileBio);
  const setProfileUsernameErrorRef = useRef(setProfileUsernameError);

  useEffect(() => {
    currentProfileRef.current = currentProfile;
    setProfileNameRef.current = setProfileName;
    setProfileUsernameRef.current = setProfileUsername;
    setProfileBioRef.current = setProfileBio;
    setProfileUsernameErrorRef.current = setProfileUsernameError;
  });

  useEffect(() => {
    return () => {
      const profile = currentProfileRef.current;
      if (profile) {
        setProfileNameRef.current(profile.display_name);
        setProfileUsernameRef.current(profile.username ?? "");
        setProfileBioRef.current(profile.bio ?? "");
      }
      setProfileUsernameErrorRef.current("");
    };
  }, []);

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-9 min-h-9 items-center rounded-lg border border-[#3f3f46]/45 bg-black px-2.5 py-0 shadow-[0_14px_45px_rgba(0,0,0,0.28)] sm:px-4">
        <div className="flex items-center gap-2.5 text-sm font-medium text-[#f4f4f5]">
          <NavIcon view="profile" />
          <h2 className="leading-normal">{t("profile")}</h2>
        </div>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#3f3f46]/45 bg-black p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-3">
        <section className="grid w-full max-w-[980px] gap-2.5">
          <div className="rounded-lg border border-[#3f3f46]/35 bg-black/18 p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
                <button
                  aria-label={t("avatarAlt")}
                  className="group relative grid h-[92px] w-[92px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-[#3f3f46]/45 bg-[#f4f4f5] text-[#050505] transition hover:border-[#f4f4f5]/35"
                  onClick={() => openAvatarGallery(currentProfile?.avatar_url)}
                  type="button"
                >
                  <Avatar
                    alt={t("avatarAlt")}
                    className="h-full w-full text-base"
                    name={activeUserName}
                    src={currentProfile?.avatar_url}
                  />
                </button>

                <div className="min-w-0 pt-0.5">
                  <h1 className="truncate text-base font-semibold leading-tight text-[#f4f4f5] sm:text-lg">
                    {activeUserName}
                  </h1>
                  <UsernameCopyButton
                    className="mt-1 text-sm font-medium text-[#a1a1aa] hover:text-[#f4f4f5]"
                    fallback={t("nicknameNotSet")}
                    username={currentProfile?.username}
                  />
                  <button
                    className="mt-2 inline-flex h-8 items-center gap-2 rounded-lg border border-[#3f3f46]/45 bg-[#f4f4f5]/5 px-3 text-sm font-medium text-[#f4f4f5] transition hover:bg-[#f4f4f5]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isUploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    type="button"
                  >
                    <CameraIcon className="h-4 w-4" />
                    <span>
                      {isUploadingAvatar
                        ? language === "en" ? "Loading..." : "Загрузка..."
                        : t("changeAvatar")}
                    </span>
                  </button>
                </div>
            </div>

            <input
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              ref={avatarInputRef}
              type="file"
            />
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2">
            <form
              className="rounded-lg border border-[#3f3f46]/35 bg-[#050505]/42 p-3"
              onSubmit={updateProfileName}
            >
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#a1a1aa]">
                {t("profileName")}
              </label>
              <div className="flex h-10 items-center rounded-lg bg-[#f4f4f5]/8 px-3">
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#f4f4f5] outline-none placeholder:text-[#71717a]"
                  maxLength={24}
                  minLength={2}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder={t("profileName")}
                  type="text"
                  value={profileNameInputValue}
                />
                <SaveButton visible={hasProfileNameChanges} />
              </div>
            </form>

            <form
              className="rounded-lg border border-[#3f3f46]/35 bg-[#050505]/42 p-3"
              onSubmit={updateProfileUsername}
            >
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#a1a1aa]">
                {t("username")}
              </label>
              <div className="flex h-10 items-center rounded-lg bg-[#f4f4f5]/8 px-3">
                <span className="mr-1 select-none text-sm font-semibold text-[#71717a]">@</span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#f4f4f5] outline-none placeholder:text-[#71717a]"
                  maxLength={24}
                  minLength={3}
                  onChange={(event) => {
                    setProfileUsername(formatUsernameInput(event.target.value));
                    setProfileUsernameError("");
                  }}
                  placeholder="username"
                  type="text"
                  value={profileUsernameInputValue}
                />
                <SaveButton visible={hasUsernameChanges} />
              </div>
              <p className={`mt-2 text-xs ${profileUsernameError ? "font-medium text-red-400" : "text-[#71717a]"}`}>
                {usernameHelpText}
              </p>
            </form>
          </div>

          <form
            className="rounded-lg border border-[#3f3f46]/35 bg-[#050505]/42 p-3"
            onSubmit={updateProfileBio}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a1a1aa]">
                {t("bio")}
              </label>
              <span className="text-xs text-[#71717a]">{profileBioInputValue.length}/100</span>
            </div>
            <div className="rounded-lg bg-[#f4f4f5]/8 p-3">
              <textarea
                className="min-h-[58px] w-full resize-none bg-transparent text-sm font-medium leading-6 text-[#f4f4f5] outline-none placeholder:text-[#71717a]"
                maxLength={100}
                onChange={(event) => setProfileBio(event.target.value.slice(0, 100))}
                placeholder={t("bioPlaceholder")}
                value={profileBioInputValue}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="min-w-0 text-xs font-medium text-red-400">
                  {profileBioSaveError}
                </p>
                <SaveButton disabled={isSavingProfileBio} visible={isProfileBioChanged} />
              </div>
            </div>
          </form>

          <div className="rounded-lg border border-[#3f3f46]/35 bg-[#050505]/42 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a1a1aa]">
                  Email
                </div>
                <p className="truncate text-sm font-semibold text-[#f4f4f5]">{user.email}</p>
              </div>

              {isEmailConfirmed ? (
                <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#f4f4f5]/10 px-3 text-xs font-semibold text-[#d4d4d8]">
                  <CheckIcon className="h-3.5 w-3.5" />
                  {language === "en" ? "Confirmed" : "Подтверждена"}
                </span>
              ) : (
                <button
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#f4f4f5] px-3 text-xs font-semibold text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSendingEmailVerification}
                  onClick={() => void sendEmailVerificationLetter()}
                  type="button"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  {isSendingEmailVerification
                    ? language === "en" ? "Sending..." : "Отправка..."
                    : language === "en" ? "Confirm" : "Подтвердить"}
                </button>
              )}
            </div>
          </div>
        </section>
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
              <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[116] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#3f3f46]/45 bg-[#111111]/96 p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
                    <MailIcon className="h-5 w-5" />
                  </span>
                  <h2 className="text-base font-semibold leading-tight text-[#f4f4f5]">
                    {language === "en" ? "Check your email" : "Зайди в свою почту"}
                  </h2>
                </div>
                <p className="mb-4 text-sm leading-6 text-[#a1a1aa]">
                  {language === "en"
                    ? "We sent a confirmation email. Open it, confirm the address, then return to Hush."
                    : "Мы отправили письмо подтверждения. Открой его, подтверди почту и вернись в Hush."}
                </p>
                <button
                  className="h-10 w-full rounded-lg bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
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
