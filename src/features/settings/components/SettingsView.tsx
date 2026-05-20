import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useI18n } from "@/shared/i18n-context";
import { interfaceLanguageLabels } from "@/shared/i18n";
import type { InterfaceLanguage } from "@/shared/i18n";
import type { MutedProfileUntil, ProfileRow } from "@/shared/types";
import { pruneMutedProfiles } from "@/shared/utils/storage";

type BlockedProfile = {
  avatarUrl: string | null;
  name: string;
  username: string | null;
  userId: string;
};

type BooleanSetter = Dispatch<SetStateAction<boolean>>;

type SettingsViewProps = {
  activeUserName: string;
  areNotificationsEnabled: boolean;
  areSoftEffectsEnabled: boolean;
  blockedByMeProfiles: BlockedProfile[];
  currentProfile: ProfileRow | null | undefined;
  handleSignOut: () => void | Promise<void>;
  isLightThemeEnabled: boolean;
  isOnlineStatusVisible: boolean;
  isPhoneVisible: boolean;
  isProfileSearchable: boolean;
  isSigningOut: boolean;
  mutedProfiles: MutedProfileUntil;
  requestBlockChange: (profileUserId: string, targetLabel: string) => void;
  setAreSoftEffectsEnabled: BooleanSetter;
  setIsLightThemeEnabled: BooleanSetter;
  setIsOnlineStatusVisible: BooleanSetter;
  setIsPhoneVisible: BooleanSetter;
  setIsProfileSearchable: BooleanSetter;
  toggleNotifications: () => void | Promise<void>;
  toggleStoredBooleanSetting: (
    storageKey: string,
    setter: BooleanSetter,
    currentValue: boolean,
  ) => void;
  userEmail: string | null | undefined;
};

export function SettingsView({
  activeUserName,
  areNotificationsEnabled,
  areSoftEffectsEnabled,
  blockedByMeProfiles,
  currentProfile,
  handleSignOut,
  isLightThemeEnabled,
  isOnlineStatusVisible,
  isPhoneVisible,
  isProfileSearchable,
  isSigningOut,
  mutedProfiles,
  requestBlockChange,
  setAreSoftEffectsEnabled,
  setIsLightThemeEnabled,
  setIsOnlineStatusVisible,
  setIsPhoneVisible,
  setIsProfileSearchable,
  toggleNotifications,
  toggleStoredBooleanSetting,
  userEmail,
}: SettingsViewProps) {
  const { language, setLanguage, t } = useI18n();
  const privacySettings = [
    {
      description: t("onlineVisibleDescription"),
      enabled: isOnlineStatusVisible,
      key: "hush-settings-online-status-visible",
      label: t("onlineVisible"),
      setter: setIsOnlineStatusVisible,
    },
    {
      description: t("showPhoneDescription"),
      enabled: isPhoneVisible,
      key: "hush-settings-phone-visible",
      label: t("showPhone"),
      setter: setIsPhoneVisible,
    },
    {
      description: t("profileSearchDescription"),
      enabled: isProfileSearchable,
      key: "hush-settings-profile-searchable",
      label: t("profileSearch"),
      setter: setIsProfileSearchable,
    },
  ];

  const appearanceSettings = [
    {
      description: t("lightThemeDescription"),
      enabled: isLightThemeEnabled,
      key: "hush-settings-light-theme",
      label: t("lightTheme"),
      setter: setIsLightThemeEnabled,
    },
    {
      description: t("smoothEffectsDescription"),
      enabled: areSoftEffectsEnabled,
      key: "hush-settings-soft-effects",
      label: t("smoothEffects"),
      setter: setAreSoftEffectsEnabled,
    },
  ];

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-[50px] min-h-[50px] items-center rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <h2 className="text-base font-medium sm:text-base">{t("settings")}</h2>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-3">
        <div className="grid gap-2.5 lg:grid-cols-2">
          <div className="grid auto-rows-min gap-2.5">
            <SettingsCard
              description={t("privacyDescription")}
              icon={<ShieldIcon />}
              title={t("privacy")}
            >
              {privacySettings.map((setting) => (
                <SettingRow
                  description={setting.description}
                  enabled={setting.enabled}
                  key={setting.key}
                  label={setting.label}
                  onToggle={() =>
                    toggleStoredBooleanSetting(setting.key, setting.setter, setting.enabled)
                  }
                />
              ))}
            </SettingsCard>

            <SettingsCard
              description={t("appearanceDescription")}
              icon={<PaletteIcon />}
              title={t("appearance")}
            >
              <LanguageRow
                currentLanguage={language}
                description={t("chooseLanguage")}
                label={t("interfaceLanguage")}
                onChange={setLanguage}
              />
              {appearanceSettings.map((setting) => (
                <SettingRow
                  description={setting.description}
                  enabled={setting.enabled}
                  key={setting.key}
                  label={setting.label}
                  onToggle={() =>
                    toggleStoredBooleanSetting(setting.key, setting.setter, setting.enabled)
                  }
                />
              ))}
            </SettingsCard>

            <SettingsCard
              description={t("blackListDescription")}
              icon={<BlockIcon />}
              title={t("blackList")}
              tone="danger"
            >
              {blockedByMeProfiles.length === 0 ? (
                <div className="rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2 text-xs text-[#a1a1aa]">
                  {t("blackListEmpty")}
                </div>
              ) : null}

              {blockedByMeProfiles.map((profile) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2"
                  key={profile.userId}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-xs font-medium text-[#050505]">
                      {profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={`${t("avatarAlt")} ${profile.name}`}
                          className="h-full w-full object-cover"
                          src={profile.avatarUrl}
                        />
                      ) : (
                        profile.name[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#f4f4f5]">
                        {profile.name}
                      </p>
                      <p className="truncate text-xs text-[#a1a1aa]">
                        {profile.username ? `@${profile.username}` : t("nicknameNotSet")}
                      </p>
                    </div>
                  </div>
                  <button
                    className="shrink-0 rounded-lg border border-[#3f3f46]/40 px-2.5 py-1.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
                    onClick={() => requestBlockChange(profile.userId, profile.name)}
                    type="button"
                  >
                    {t("unblockUser")}
                  </button>
                </div>
              ))}
            </SettingsCard>
          </div>

          <div className="grid auto-rows-min gap-2.5">
            <SettingsCard
              description={t("notificationsDescription")}
              icon={<BellIcon />}
              title={t("notifications")}
            >
              <SettingRow
                description={t("browserNotificationsDescription")}
                enabled={areNotificationsEnabled}
                label={t("browserNotifications")}
                onToggle={() => void toggleNotifications()}
              />
              <MutedChatsRow count={Object.keys(pruneMutedProfiles(mutedProfiles)).length} />
            </SettingsCard>

            <SettingsCard
              description={t("accountDescription")}
              icon={<UserIcon />}
              title={t("account")}
            >
              <InfoBlock label={t("email")} value={userEmail ?? t("notSpecified")} />
              <InfoBlock
                label={t("profile")}
                value={`${activeUserName}${currentProfile?.username ? ` · @${currentProfile.username}` : ""}`}
              />
              <button
                className="mt-0.5 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-500/15 px-3 text-xs font-medium text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
                type="button"
              >
                <SignOutIcon />
                {isSigningOut ? t("signingOut") : t("signOut")}
              </button>
            </SettingsCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  children,
  description,
  icon,
  title,
  tone = "default",
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
  tone?: "danger" | "default";
}) {
  return (
    <section className="rounded-xl border border-[#3f3f46]/35 bg-black/18 p-2.5 sm:p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
            tone === "danger"
              ? "bg-red-500/12 text-red-100"
              : "bg-[#f4f4f5]/10 text-[#f4f4f5]"
          }`}
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium leading-5">{title}</p>
          <p className="text-xs leading-4 text-[#a1a1aa]">{description}</p>
        </div>
      </div>
      <div className="grid gap-1.5">{children}</div>
    </section>
  );
}

function SettingRow({
  description,
  enabled,
  label,
  onToggle,
}: {
  description: string;
  enabled: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5">{label}</p>
        <p className="text-xs leading-4 text-[#a1a1aa]">{description}</p>
      </div>
      <button
        aria-label={label}
        className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition ${
          enabled ? "justify-end bg-[#f4f4f5]" : "justify-start bg-[#f4f4f5]/18"
        }`}
        onClick={onToggle}
        type="button"
      >
        <span
          className={`h-5 w-5 rounded-full transition ${
            enabled ? "bg-[#050505]" : "bg-[#f4f4f5]"
          }`}
        />
      </button>
    </div>
  );
}

function MutedChatsRow({ count }: { count: number }) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-5">{t("blockedChats")}</p>
          <p className="text-xs leading-4 text-[#a1a1aa]">
            {t("blockedChatsDescription")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#f4f4f5]/10 px-2.5 py-1 text-xs font-medium text-[#e5e5e5]">
          {count}
        </span>
      </div>
    </div>
  );
}

function LanguageRow({
  currentLanguage,
  description,
  label,
  onChange,
}: {
  currentLanguage: InterfaceLanguage;
  description: string;
  label: string;
  onChange: Dispatch<SetStateAction<InterfaceLanguage>>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5">{label}</p>
        <p className="text-xs leading-4 text-[#a1a1aa]">{description}</p>
      </div>
      <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/10 p-0.5">
        {(["ru", "en"] as const).map((language) => (
          <button
            className={`min-h-7 rounded-md px-2.5 text-xs font-medium transition ${
              currentLanguage === language
                ? "bg-[#f4f4f5] text-[#050505]"
                : "text-[#d4d4d8] hover:bg-white/10"
            }`}
            key={language}
            onClick={() => onChange(language)}
            type="button"
          >
            {interfaceLanguageLabels[language]}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium leading-5 text-[#f4f4f5]">
        {value}
      </p>
    </div>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M10.268 21a2 2 0 0 0 3.464 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M4.929 4.929 19.07 19.071" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M16 5H3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M16 12H3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M16 19H3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M21 5h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M21 12h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M21 19h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M10 7V5.5A2.5 2.5 0 0 1 12.5 3h5A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 10 18.5V17M4 12h11m0 0-3.5-3.5M15 12l-3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
