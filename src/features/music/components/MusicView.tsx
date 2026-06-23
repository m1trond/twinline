import { useI18n } from "@/shared/i18n-context";

export function MusicView() {
  const { t } = useI18n();

  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-9 min-h-9 items-center rounded-lg border border-[#3f3f46]/45 bg-black px-2.5 py-0 shadow-[0_14px_45px_rgba(0,0,0,0.28)] sm:px-4">
        <h2 className="text-base font-medium leading-normal text-[#f4f4f5]">{t("music")}</h2>
      </div>

      <div className="grid min-h-0 flex-1 place-items-center rounded-xl border border-[#3f3f46]/45 bg-transparent p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-2xl">
        <p className="text-base font-medium text-[#f4f4f5]">{t("musicInProgress")}</p>
      </div>
    </div>
  );
}
