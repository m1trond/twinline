import { useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
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
  const [sendByEnter, setSendByEnter] = useState(true);
  const [messageSounds, setMessageSounds] = useState(true);
  const [fontSize, setFontSize] = useState(15);
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

  const fingerprint = "SHA256: 7b9a 8c3e d9f2 a1b6 c5d8 e4f3 0a1b 2c3d e4f5 6a7b 8c9d e0f1";
  const privacySettings = [
    {
      description: t("onlineVisibleDescription"),
      enabled: isOnlineStatusVisible,
      key: "hush-settings-online-status-visible",
      label: t("onlineVisible"),
      setter: setIsOnlineStatusVisible,
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
      icon: <ShieldIcon />,
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
      icon: <PaletteIcon />,
      description: isRu ? "Язык, эффекты и настройки чата" : "Language, visual effects & theme",
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
      case "account":
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

            <SettingsCard
              description={isRu ? "Опасные действия с вашей учетной записью." : "Dangerous actions with your account."}
              icon={<BlockIcon />}
              title={isRu ? "Удаление аккаунта" : "Delete Account"}
              tone="danger"
            >
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/15 bg-red-500/5 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5 text-red-200">{isRu ? "Удаление аккаунта" : "Delete account"}</p>
                  <p className="text-xs leading-4 text-red-200/60">
                    {isRu ? "Безвозвратное удаление всей истории." : "Permanently delete profile and all chat history."}
                  </p>
                </div>
                <button
                  className="shrink-0 rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/20"
                  onClick={() => alert(isRu ? "Это демо-версия настроек. Удаление аккаунта недоступно." : "This is a demo setup. Account deletion is disabled.")}
                  type="button"
                >
                  {isRu ? "Удалить..." : "Delete..."}
                </button>
              </div>
            </SettingsCard>
          </div>
        );

      case "privacy":
        return (
          <div className="grid gap-3">
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

            <SettingsCard
              description={isRu ? "Ключи шифрования и безопасности." : "Encryption and security keys."}
              icon={<KeyIcon />}
              title={isRu ? "Сквозное шифрование" : "End-to-End Encryption"}
            >
              <div className="rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 p-2 font-mono text-[9px] break-all leading-normal text-[#a1a1aa] text-center select-all">
                {fingerprint}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[#3f3f46]/45 bg-[#f4f4f5]/10 px-2.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-[#f4f4f5]/14"
                  onClick={() => alert(isRu ? "Ваши ключи успешно экспортированы." : "Your keys have been exported successfully.")}
                  type="button"
                >
                  {isRu ? "Экспорт ключей" : "Export keys"}
                </button>
                <button
                  className="inline-flex min-h-8 items-center justify-center rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20"
                  onClick={() => alert(isRu ? "Демо-ключи шифрования успешно перегенерированы." : "Demo encryption keys regenerated successfully.")}
                  type="button"
                >
                  {isRu ? "Сбросить ключи" : "Reset keys"}
                </button>
              </div>
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
              description={isRu ? "Персонализация интерфейса переписки." : "Personalization of the messaging interface."}
              icon={<MessageSquareIcon />}
              title={isRu ? "Настройки чатов" : "Chat Settings"}
            >
              <SettingRow
                description={isRu ? "Использовать Enter для отправки сообщений." : "Use Enter key to send messages."}
                enabled={sendByEnter}
                label={isRu ? "Отправка по Enter" : "Send with Enter"}
                onToggle={() => setSendByEnter(!sendByEnter)}
              />
              <SettingRow
                description={isRu ? "Проигрывать звуки при получении сообщений." : "Play sounds for incoming messages."}
                enabled={messageSounds}
                label={isRu ? "Звуки сообщений" : "Message sounds"}
                onToggle={() => setMessageSounds(!messageSounds)}
              />
              <div className="rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5">{isRu ? "Размер шрифта" : "Font size"}</p>
                    <p className="text-xs leading-4 text-[#a1a1aa]">
                      {isRu ? "Настройка отображения текста в диалогах." : "Adjust text display in conversations."}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f4f4f5]/10 px-2 py-0.5 text-xs font-mono text-[#e5e5e5]">
                    {fontSize}px
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#a1a1aa]">A</span>
                  <input
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20 accent-[#f4f4f5]"
                    max="22"
                    min="12"
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    type="range"
                    value={fontSize}
                  />
                  <span className="text-sm text-[#f4f4f5] font-medium">A</span>
                </div>
              </div>
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
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5">{isRu ? "Локальный кэш" : "Local cache"}</p>
                  <p className="text-xs leading-4 text-[#a1a1aa]">
                    {isRu ? "Сохраненные медиафайлы и сообщения." : "Cached media and messages in the browser."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
                    <p className="text-xs text-[#a1a1aa] mt-0.5 truncate">{session.ip} · {session.location}</p>
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
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#f4f4f5]/15 text-[#f4f4f5]"
                    : "bg-[#f4f4f5]/6 text-[#a1a1aa] group-hover:bg-[#f4f4f5]/10 group-hover:text-[#f4f4f5]"
                }`}>
                  {tab.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-none">{tab.label}</p>
                  <p className={`text-[11px] leading-tight mt-1 truncate ${
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
    <section className="rounded-lg border border-[#3f3f46]/35 bg-black/18 p-2.5 sm:p-3">
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
  const [isOpen, setIsOpen] = useState(false);
  const languageOptions: InterfaceLanguage[] = ["ru", "en"];

  function selectLanguage(nextLanguage: InterfaceLanguage) {
    onChange(nextLanguage);
    setIsOpen(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5">{label}</p>
        <p className="text-xs leading-4 text-[#a1a1aa]">{description}</p>
      </div>
      <div className="relative shrink-0">
        <button
          aria-expanded={isOpen}
          className="flex min-h-8 min-w-[132px] items-center justify-between gap-3 rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/10 px-3 text-left text-xs font-medium text-[#f4f4f5] transition hover:bg-[#f4f4f5]/14"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          type="button"
        >
          <span>{interfaceLanguageLabels[currentLanguage]}</span>
          <svg
            aria-hidden="true"
            className={`h-3.5 w-3.5 shrink-0 text-[#a1a1aa] transition-transform duration-200 ${
              isOpen ? "" : "rotate-180"
            }`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path d="M12 5v14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="m19 12-7 7-7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>

        {isOpen ? (
          <>
            <button
              aria-label="Закрыть выбор языка"
              className="fixed inset-0 z-[70] cursor-default bg-transparent"
              onClick={() => setIsOpen(false)}
              type="button"
            />
            <div className="hush-context-menu absolute right-0 top-[calc(100%+6px)] z-[80] w-[156px] overflow-hidden rounded-lg border border-white/10 bg-[#18181b]/98 py-1 text-[#f4f4f5] shadow-[0_18px_55px_rgba(0,0,0,0.48)] backdrop-blur-xl">
              {languageOptions.map((language) => (
                <button
                  className={`flex min-h-8 w-full items-center justify-between gap-2 px-3 text-left text-xs font-medium transition hover:bg-white/10 ${
                    currentLanguage === language ? "text-[#f4f4f5]" : "text-[#a1a1aa]"
                  }`}
                  key={language}
                  onClick={() => selectLanguage(language)}
                  type="button"
                >
                  <span>{interfaceLanguageLabels[language]}</span>
                  {currentLanguage === language ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f4f4f5]" />
                  ) : null}
                </button>
              ))}
            </div>
          </>
        ) : null}
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
      <path d="m16 17 5-5-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M21 12H9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function MessageSquareIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function DevicesIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21h8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 17v4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="7.5" cy="16.5" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="m10 14 10-10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m16 4 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m13 7 2 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
