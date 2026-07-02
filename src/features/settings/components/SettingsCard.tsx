import { useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useI18n } from "@/shared/i18n-context";
import { interfaceLanguageLabels } from "@/shared/i18n";
import type { InterfaceLanguage } from "@/shared/i18n";
import { BellIcon, StaggeredLinesIcon } from "@/components/ui/icons";

export function SettingsCard({
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
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            tone === "danger"
              ? "bg-red-500/12 text-red-100"
              : "bg-[#f4f4f5]/10 text-[#f4f4f5]"
          }`}
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight text-[#f4f4f5]">{title}</p>
          <p className="text-xs leading-normal text-[#a1a1aa] mt-0.5">{description}</p>
        </div>
      </div>
      <div className="grid gap-1.5">{children}</div>
    </section>
  );
}

export function SettingRow({
  description,
  enabled,
  icon,
  label,
  onToggle,
}: {
  description: string;
  enabled: boolean;
  icon?: ReactNode;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="text-[#a1a1aa] shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className="text-sm font-medium leading-5">{label}</p>
          <p className="text-xs leading-normal text-[#71717a]">{description}</p>
        </div>
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

export function MutedChatsRow({ count }: { count: number }) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-[#3f3f46]/30 bg-[#050505]/42 px-2.5 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[#a1a1aa] shrink-0">
            <BellIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-5">{t("blockedChats")}</p>
            <p className="text-xs leading-normal text-[#71717a]">
              {t("blockedChatsDescription")}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[#f4f4f5]/10 px-2.5 py-1 text-xs font-medium text-[#e5e5e5]">
          {count}
        </span>
      </div>
    </div>
  );
}

export function LanguageRow({
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
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[#a1a1aa] shrink-0">
          <StaggeredLinesIcon />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-5">{label}</p>
          <p className="text-xs leading-normal text-[#71717a]">{description}</p>
        </div>
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

export function InfoBlock({ label, value }: { label: string; value: string }) {
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
