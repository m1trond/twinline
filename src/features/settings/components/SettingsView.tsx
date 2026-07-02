import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useI18n } from "@/shared/i18n-context";
import type { MutedProfileUntil, ProfileRow } from "@/shared/types";
import { pruneMutedProfiles } from "@/shared/utils/storage";
import { supabase } from "@/lib/supabase";
import {
  SettingsCard,
  SettingRow,
  MutedChatsRow,
  LanguageRow,
  InfoBlock,
} from "./SettingsCard";
import {
  BellIcon,
  EyeIcon,
  IncognitoIcon,
  SunIcon,
  SparklesIcon,
  DownloadIcon,
  BlockIcon,
  UserIcon,
  StaggeredLinesIcon,
  SignOutIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  DevicesIcon,
  KeyIcon,
} from "@/components/ui/icons";

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="m5 12 4 4 10-10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

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
  isProfileSearchable: boolean;
  isSigningOut: boolean;
  mutedProfiles: MutedProfileUntil;
  requestBlockChange: (profileUserId: string, targetLabel: string) => void;
  setAreSoftEffectsEnabled: BooleanSetter;
  setIsLightThemeEnabled: BooleanSetter;
  setIsOnlineStatusVisible: BooleanSetter;
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
  isProfileSearchable,
  isSigningOut,
  mutedProfiles,
  requestBlockChange,
  setAreSoftEffectsEnabled,
  setIsLightThemeEnabled,
  setIsOnlineStatusVisible,
  setIsProfileSearchable,
  toggleNotifications,
  toggleStoredBooleanSetting,
  userEmail,
}: SettingsViewProps) {
  const { language, setLanguage, t } = useI18n();
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const isRu = language === "ru";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [selfDestructOption, setSelfDestructOption] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hush-account-self-destruct") || "never";
    }
    return "never";
  });
  const [isSelfDestructDropdownOpen, setIsSelfDestructDropdownOpen] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordStatus({
        type: "error",
        message: isRu ? "Пароль должен быть не менее 6 символов" : "Password must be at least 6 characters",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: isRu ? "Пароли не совпадают" : "Passwords do not match",
      });
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordStatus(null);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);
    if (err) {
      setPasswordStatus({ type: "error", message: err.message });
    } else {
      setPasswordStatus({
        type: "success",
        message: isRu ? "Пароль успешно изменен" : "Password successfully updated",
      });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const [cacheSize, setCacheSize] = useState(isRu ? "14.2 МБ" : "14.2 MB");
  const [autoDownload, setAutoDownload] = useState(true);
  const [sessions, setSessions] = useState([
    {
      id: "s1",
      device: "Windows · Chrome",
      location: isRu ? "Санкт-Петербург, Россия" : "St. Petersburg, Russia",
      ip: "192.168.1.45",
      current: true,
      lastActive: "online"
    },
    {
      id: "s2",
      device: "iOS · Safari",
      location: isRu ? "Москва, Россия" : "Moscow, Russia",
      ip: "84.204.18.2",
      current: false,
      lastActive: isRu ? "Активен 2 часа назад" : "Active 2 hours ago"
    }
  ]);

  function handleTerminateOtherSessions() {
    setSessions((currentSessions) => currentSessions.filter((s) => s.current));
  }
  const privacySettings = [
    {
      description: t("onlineVisibleDescription"),
      enabled: isOnlineStatusVisible,
      icon: <EyeIcon />,
      key: "hush-settings-online-status-visible",
      label: t("onlineVisible"),
      setter: setIsOnlineStatusVisible,
    },
    {
      description: t("profileSearchDescription"),
      enabled: isProfileSearchable,
      icon: <IncognitoIcon />,
      key: "hush-settings-profile-searchable",
      label: t("profileSearch"),
      setter: setIsProfileSearchable,
    },
  ];

  const appearanceSettings = [
    {
      description: t("lightThemeDescription"),
      enabled: isLightThemeEnabled,
      icon: <SunIcon />,
      key: "hush-settings-light-theme",
      label: t("lightTheme"),
      setter: setIsLightThemeEnabled,
    },
    {
      description: t("smoothEffectsDescription"),
      enabled: areSoftEffectsEnabled,
      icon: <SparklesIcon />,
      key: "hush-settings-soft-effects",
      label: t("smoothEffects"),
      setter: setAreSoftEffectsEnabled,
    },
  ];

  const [activeTab, setActiveTab] = useState<"account" | "privacy" | "notifications" | "appearance" | "storage">("account");
  const [isMobileTabOpen, setIsMobileTabOpen] = useState(false);

  const tabs = [
    {
      id: "account",
      label: t("account"),
      icon: <UserIcon />,
      description: isRu ? "Данные профиля и безопасность" : "Profile details & security",
    },
    {
      id: "privacy",
      label: t("privacy"),
      icon: <ShieldCheckIcon />,
      description: isRu ? "Конфиденциальность и ключи" : "Privacy settings & security keys",
    },
    {
      id: "notifications",
      label: t("notifications"),
      icon: <BellIcon />,
      description: isRu ? "Уведомления браузера и чатов" : "Browser & mute settings",
    },
    {
      id: "appearance",
      label: t("appearance"),
      icon: <StaggeredLinesIcon />,
      description: isRu ? "Язык, визуальные эффекты и тема" : "Language, visual effects & theme",
    },
    {
      id: "storage",
      label: isRu ? "Хранилище и сеансы" : "Storage & Sessions",
      icon: <DatabaseIcon />,
      description: isRu ? "Локальный кэш и сессии входа" : "Browser cache & device sessions",
    },
  ] as const;

  function renderTabContent() {
    switch (activeTab) {
      case "account": {
        const selfDestructOptions = [
          { value: "never", label: isRu ? "Никогда" : "Never" },
          { value: "1", label: isRu ? "1 месяц" : "1 month" },
          { value: "3", label: isRu ? "3 месяца" : "3 months" },
          { value: "6", label: isRu ? "6 месяцев" : "6 months" },
          { value: "12", label: isRu ? "12 месяцев" : "12 months" },
        ];
        const currentOptionLabel = selfDestructOptions.find(o => o.value === selfDestructOption)?.label || (isRu ? "Никогда" : "Never");

        return (
          <div className="grid gap-3">
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
                className="mt-1 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-500/15 px-3 text-xs font-medium text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60 self-start"
                disabled={isSigningOut}
                onClick={() => setIsSignOutDialogOpen(true)}
                type="button"
              >
                <SignOutIcon />
                {isSigningOut ? t("signingOut") : t("signOut")}
              </button>
            </SettingsCard>

            {/* Password Change Card */}
            <SettingsCard
              description={isRu ? "Управление безопасностью вашей учетной записи." : "Manage your account security."}
              icon={<KeyIcon />}
              title={isRu ? "Смена пароля" : "Change Password"}
            >
              <form onSubmit={handleUpdatePassword} className="grid gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                    {isRu ? "Новый пароль" : "New Password"}
                  </span>
                  <input
                    className="h-8 min-h-8 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none focus:border-[#f4f4f5] text-white"
                    placeholder={isRu ? "Введите новый пароль (мин. 6 символов)" : "Enter new password (min. 6 chars)"}
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                    {isRu ? "Подтвердите пароль" : "Confirm Password"}
                  </span>
                  <input
                    className="h-8 min-h-8 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm outline-none focus:border-[#f4f4f5] text-white"
                    placeholder={isRu ? "Повторите новый пароль" : "Repeat new password"}
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {passwordStatus && (
                  <p className={`text-xs font-medium ${passwordStatus.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {passwordStatus.message}
                  </p>
                )}

                <button
                  className="mt-1 inline-flex min-h-8 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 self-start"
                  disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                  type="submit"
                >
                  {isUpdatingPassword ? (isRu ? "Обновление..." : "Updating...") : (isRu ? "Обновить пароль" : "Update Password")}
                </button>
              </form>
            </SettingsCard>

            {/* Self-Destruct Account Card */}
            <SettingsCard
              description={isRu ? "Автоматическое удаление при неактивности." : "Automatically delete account after inactivity."}
              icon={<DevicesIcon />}
              title={isRu ? "Самоуничтожение аккаунта" : "Account Self-Destruction"}
            >
              <div className="flex flex-col gap-2 rounded-lg border border-[#3f3f46]/35 bg-black/18 p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                  {isRu ? "Если вы не заходите" : "If inactive for"}
                </span>
                
                <div className="relative">
                  {/* Custom Dropdown Trigger */}
                  <button
                    className="flex h-8 w-full items-center justify-between rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 px-3 text-sm text-white hover:bg-white/10 transition text-left cursor-pointer outline-none focus:border-[#f4f4f5]"
                    onClick={() => setIsSelfDestructDropdownOpen(!isSelfDestructDropdownOpen)}
                    type="button"
                  >
                    <span>{currentOptionLabel}</span>
                    <svg className={`h-4 w-4 text-[#a1a1aa] transition-transform ${isSelfDestructDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="m19 9-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    </svg>
                  </button>

                  {/* Backdrop to close when clicking outside */}
                  {isSelfDestructDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[85] cursor-default" 
                        onClick={() => setIsSelfDestructDropdownOpen(false)}
                      />
                      {/* Floating custom select options */}
                      <div className="absolute left-0 right-0 z-[90] mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#18181b] py-1 text-[#f4f4f5] shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                        {selfDestructOptions.map((opt) => (
                          <button
                            key={opt.value}
                            className={`flex min-h-8 w-full items-center justify-between px-3.5 py-1.5 text-left text-sm font-medium transition hover:bg-white/10 text-white ${
                              selfDestructOption === opt.value ? "bg-white/5" : ""
                            }`}
                            onClick={() => {
                              setSelfDestructOption(opt.value);
                              localStorage.setItem("hush-account-self-destruct", opt.value);
                              setIsSelfDestructDropdownOpen(false);
                            }}
                            type="button"
                          >
                            <span>{opt.label}</span>
                            {selfDestructOption === opt.value && (
                              <CheckIcon className="h-4 w-4 text-[#f4f4f5]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[11px] leading-normal text-[#a1a1aa]">
                  {isRu 
                    ? "Все ваши сообщения, медиафайлы и контакты будут безвозвратно удалены из базы данных Hush, если вы не авторизуетесь в течение указанного срока."
                    : "All your messages, media, and contacts will be permanently deleted from Hush database if you do not log in within the selected period."}
                </p>
              </div>
            </SettingsCard>
          </div>
        );
      }

      case "privacy":
        return (
          <div className="grid gap-3">
            <SettingsCard
              description={t("privacyDescription")}
              icon={<ShieldCheckIcon />}
              title={t("privacy")}
            >
              {privacySettings.map((setting) => (
                <SettingRow
                  description={setting.description}
                  enabled={setting.enabled}
                  icon={setting.icon}
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
              tone={blockedByMeProfiles.length > 0 ? "danger" : "default"}
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
                  <div className="flex min-w-0 items-center gap-2.5">
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
        );

      case "notifications":
        return (
          <div className="grid gap-3">
            <SettingsCard
              description={t("notificationsDescription")}
              icon={<BellIcon />}
              title={t("notifications")}
            >
              <SettingRow
                description={t("browserNotificationsDescription")}
                enabled={areNotificationsEnabled}
                icon={<BellIcon />}
                label={t("browserNotifications")}
                onToggle={() => void toggleNotifications()}
              />
              <MutedChatsRow count={Object.keys(pruneMutedProfiles(mutedProfiles)).length} />
            </SettingsCard>
          </div>
        );

      case "appearance":
        return (
          <div className="grid gap-3">
            <SettingsCard
              description={t("appearanceDescription")}
              icon={<StaggeredLinesIcon />}
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
                  icon={setting.icon}
                  key={setting.key}
                  label={setting.label}
                  onToggle={() =>
                    toggleStoredBooleanSetting(setting.key, setting.setter, setting.enabled)
                  }
                />
              ))}
            </SettingsCard>
          </div>
        );

      case "storage":
        return (
          <div className="grid gap-3">
            <SettingsCard
              description={isRu ? "Управление кэшем и автозагрузкой." : "Manage cache and auto-download options."}
              icon={<DatabaseIcon />}
              title={isRu ? "Хранилище и данные" : "Storage & Data"}
            >
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[#a1a1aa] shrink-0">
                    <DatabaseIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5">{isRu ? "Локальный кэш" : "Local cache"}</p>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">
                      {isRu ? "Сохраненные медиафайлы и сообщения." : "Cached media and messages in the browser."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-[#a1a1aa]">{cacheSize}</span>
                  {cacheSize !== (isRu ? "0.0 КБ" : "0.0 KB") ? (
                    <button
                      className="rounded-lg border border-[#3f3f46]/40 px-2.5 py-1 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
                      onClick={() => setCacheSize(isRu ? "0.0 КБ" : "0.0 KB")}
                      type="button"
                    >
                      {isRu ? "Очистить" : "Clear"}
                    </button>
                  ) : (
                    <span className="text-xs text-green-400 font-medium px-1">{isRu ? "Очищено" : "Cleared"}</span>
                  )}
                </div>
              </div>

              <SettingRow
                description={isRu ? "Автоматически загружать входящие медиафайлы." : "Automatically load incoming media files."}
                enabled={autoDownload}
                icon={<DownloadIcon />}
                label={isRu ? "Автозагрузка медиа" : "Auto-download media"}
                onToggle={() => setAutoDownload(!autoDownload)}
              />
            </SettingsCard>

            <SettingsCard
              description={isRu ? "Управление активными сессиями." : "Manage active login sessions."}
              icon={<DevicesIcon />}
              title={isRu ? "Безопасность и устройства" : "Security & Devices"}
            >
              <div className="grid gap-1.5">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#f4f4f5] truncate">{session.device}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${session.current ? "bg-green-400" : "bg-[#a1a1aa]"}`} />
                        <span className="text-[10px] text-[#a1a1aa] font-medium">{session.lastActive}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#71717a] mt-0.5 truncate">{session.ip} · {session.location}</p>
                  </div>
                ))}
                {sessions.length > 1 ? (
                  <button
                    className="mt-1 inline-flex min-h-8 items-center justify-center gap-2 rounded-lg border border-red-500/35 bg-red-500/10 px-3 text-xs font-medium text-red-200 transition hover:bg-red-500/20 self-start"
                    onClick={handleTerminateOtherSessions}
                    type="button"
                  >
                    {isRu ? "Завершить другие сеансы" : "Terminate other sessions"}
                  </button>
                ) : null}
              </div>
            </SettingsCard>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-9 min-h-9 items-center rounded-lg border border-[#3f3f46]/45 bg-black px-2.5 py-0 shadow-[0_14px_45px_rgba(0,0,0,0.28)] sm:rounded-lg sm:px-4">
        <h2 className="text-base font-medium leading-normal sm:text-base">{t("settings")}</h2>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 flex flex-col lg:flex-row overflow-hidden rounded-lg border border-[#3f3f46]/45 bg-black p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-lg sm:p-3">
        {/* SIDEBAR NAVIGATION */}
        <div className={`w-full lg:w-72 shrink-0 flex flex-col gap-1.5 lg:pr-3 lg:border-r border-[#3f3f46]/25 ${
          isMobileTabOpen ? "hidden lg:flex" : "flex"
        }`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileTabOpen(true);
                }}
                type="button"
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left group ${
                  isActive
                    ? "bg-white/8 border-[#3f3f46]/50 text-[#f4f4f5]"
                    : "bg-transparent border-transparent text-[#a1a1aa] hover:bg-white/4 hover:text-[#f4f4f5]"
                }`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
                  isActive
                    ? "bg-[#f4f4f5]/15 text-[#f4f4f5]"
                    : "bg-[#f4f4f5]/6 text-[#a1a1aa] group-hover:bg-[#f4f4f5]/10 group-hover:text-[#f4f4f5]"
                }`}>
                  {tab.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{tab.label}</p>
                  <p className={`text-xs leading-normal mt-0.5 truncate ${
                    isActive ? "text-[#e5e5e5]" : "text-[#71717a] group-hover:text-[#a1a1aa]"
                  }`}>
                    {tab.description}
                  </p>
                </div>
                <svg className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? "text-[#f4f4f5] translate-x-0.5" : "text-[#71717a] group-hover:text-[#a1a1aa] group-hover:translate-x-0.5"
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>

        {/* CONTENT AREA */}
        <div className={`flex-1 min-h-0 flex flex-col lg:pl-4 ${
          !isMobileTabOpen ? "hidden lg:flex" : "flex"
        }`}>
          {/* Mobile Back Button */}
          {isMobileTabOpen && (
            <button
              onClick={() => setIsMobileTabOpen(false)}
              className="lg:hidden mb-3.5 flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition self-start"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {isRu ? "Назад к разделам" : "Back to categories"}
            </button>
          )}

          {/* Tab Title/Description on Desktop */}
          <div className="hidden lg:block mb-4">
            <h3 className="text-base font-semibold text-[#f4f4f5]">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <p className="text-xs text-[#a1a1aa] mt-0.5">
              {tabs.find((t) => t.id === activeTab)?.description}
            </p>
          </div>

          {/* Scrollable Tab Content Container */}
          <div className="scrollbar-hidden flex-1 overflow-y-auto pr-0.5 space-y-3.5">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {isSignOutDialogOpen ? (
        <ConfirmDialog
          cancelLabel={t("cancel")}
          confirmLabel={isSigningOut ? t("signingOut") : t("signOut")}
          description={
            language === "en"
              ? "Are you sure you want to sign out of your account?"
              : "Вы уверены, что хотите выйти из аккаунта?"
          }
          icon={<SignOutIcon />}
          isConfirmDisabled={isSigningOut}
          onCancel={() => setIsSignOutDialogOpen(false)}
          onConfirm={() => {
            setIsSignOutDialogOpen(false);
            void handleSignOut();
          }}
          title={language === "en" ? "Sign out?" : "Выйти из аккаунта?"}
        />
      ) : null}
    </div>
  );
}

