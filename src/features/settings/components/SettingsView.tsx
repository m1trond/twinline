import type { Dispatch, ReactNode, SetStateAction } from "react";
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
  const privacySettings = [
    {
      description: "Показывать статус в сети и последний онлайн в профиле.",
      enabled: isOnlineStatusVisible,
      key: "hush-settings-online-status-visible",
      label: "Показывать онлайн",
      setter: setIsOnlineStatusVisible,
    },
    {
      description: "Показывать телефон в профиле, когда подключим номер.",
      enabled: isPhoneVisible,
      key: "hush-settings-phone-visible",
      label: "Показывать телефон",
      setter: setIsPhoneVisible,
    },
    {
      description: "Другие смогут найти тебя по @нику.",
      enabled: isProfileSearchable,
      key: "hush-settings-profile-searchable",
      label: "Поиск по нику",
      setter: setIsProfileSearchable,
    },
  ];

  const appearanceSettings = [
    {
      description: "Светлая палитра для всего сайта. Выбор сохраняется в браузере.",
      enabled: isLightThemeEnabled,
      key: "hush-settings-light-theme",
      label: "Светлая тема",
      setter: setIsLightThemeEnabled,
    },
    {
      description: "Мягкие подсветки, blur и плавные hover-состояния.",
      enabled: areSoftEffectsEnabled,
      key: "hush-settings-soft-effects",
      label: "Плавные эффекты",
      setter: setAreSoftEffectsEnabled,
    },
  ];

  return (
    <div className="min-h-0 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-5">
      <div className="mb-4 border-b border-[#3f3f46]/35 pb-4 sm:mb-5 sm:pb-5">
        <h2 className="text-lg font-medium sm:text-xl">Настройки</h2>
        <p className="mt-1 text-[13px] leading-5 text-[#a1a1aa]">
          Уведомления, приватность, аккаунт и внешний вид.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
        <SettingsCard
          description="Общие и личные уведомления."
          icon={<BellIcon />}
          title="Уведомления"
        >
          <SettingRow
            description="Новые сообщения, если чат не открыт."
            enabled={areNotificationsEnabled}
            label="Браузерные уведомления"
            onToggle={() => void toggleNotifications()}
          />
          <div className="rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium">Отключенные чаты</p>
                <p className="mt-0.5 text-xs leading-5 text-[#a1a1aa]">
                  Управляются в профиле каждого пользователя.
                </p>
              </div>
              <span className="rounded-full bg-[#f4f4f5]/10 px-2.5 py-1 text-xs font-medium text-[#e5e5e5]">
                {Object.keys(pruneMutedProfiles(mutedProfiles)).length}
              </span>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          description="Что видно другим людям."
          icon={<ShieldIcon />}
          title="Приватность"
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
          description="Заблокированные пользователи."
          icon={<BlockIcon />}
          title="Черный список"
          tone="danger"
        >
          {blockedByMeProfiles.length === 0 ? (
            <div className="rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-3 text-[13px] text-[#a1a1aa]">
              Черный список пуст.
            </div>
          ) : null}

          {blockedByMeProfiles.map((profile) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5"
              key={profile.userId}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-[12px] font-medium text-[#050505]">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Аватар ${profile.name}`}
                      className="h-full w-full object-cover"
                      src={profile.avatarUrl}
                    />
                  ) : (
                    profile.name[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#f4f4f5]">
                    {profile.name}
                  </p>
                  <p className="truncate text-xs text-[#a1a1aa]">
                    {profile.username ? `@${profile.username}` : "ник не выбран"}
                  </p>
                </div>
              </div>
              <button
                className="shrink-0 rounded-xl border border-[#3f3f46]/40 px-3 py-2 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
                onClick={() => requestBlockChange(profile.userId, profile.name)}
                type="button"
              >
                Разблокировать
              </button>
            </div>
          ))}
        </SettingsCard>

        <SettingsCard
          description="Данные входа и сессия."
          icon={<UserIcon />}
          title="Аккаунт"
        >
          <InfoBlock label="Email" value={userEmail ?? "Не указан"} />
          <InfoBlock
            label="Профиль"
            value={`${activeUserName}${currentProfile?.username ? ` · @${currentProfile.username}` : ""}`}
          />
          <button
            className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 px-4 text-[13px] font-medium text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
            type="button"
          >
            <SignOutIcon />
            {isSigningOut ? "Выходим..." : "Выйти из аккаунта"}
          </button>
        </SettingsCard>

        <SettingsCard
          description="Поведение интерфейса."
          icon={<PaletteIcon />}
          title="Внешний вид"
        >
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
    <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 p-3 sm:rounded-2xl sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl ${
            tone === "danger"
              ? "bg-red-500/12 text-red-100"
              : "bg-[#f4f4f5]/10 text-[#f4f4f5]"
          }`}
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-[#a1a1aa]">{description}</p>
        </div>
      </div>
      <div className="grid gap-2">{children}</div>
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#a1a1aa]">{description}</p>
      </div>
      <button
        aria-label={label}
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
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

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-medium text-[#f4f4f5]">
        {value}
      </p>
    </div>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m9.5 12 1.8 1.8L15 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M6.5 6.5 17.5 17.5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M4 12a8 8 0 0 1 8-8h1a3 3 0 0 1 0 6h-1a2 2 0 0 0 0 4h1a3 3 0 0 1 0 6h-1a8 8 0 0 1-8-8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M17 8h.01M17 16h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M10 7V5.5A2.5 2.5 0 0 1 12.5 3h5A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 10 18.5V17M4 12h11m0 0-3.5-3.5M15 12l-3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
