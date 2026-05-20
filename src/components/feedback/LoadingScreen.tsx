import { useI18n } from "@/shared/i18n-context";

export function LoadingScreen() {
  const { t } = useI18n();

  return (
    <main className="grid h-dvh place-items-center bg-[#050505] text-[#f4f4f5]">
      <p className="text-sm font-medium text-[#a1a1aa]">{t("loadingHush")}</p>
    </main>
  );
}
