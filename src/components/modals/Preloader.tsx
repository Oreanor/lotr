import { useTranslation } from "react-i18next";

// Loading cover shown over the map while it builds (e.g. resuming a save): a
// plain white screen with a small centred "loading" label. Fades out — revealing
// the map — once `hidden` flips true. No artwork, so nothing extra to download.
export function Preloader({ hidden }: { hidden: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center bg-white transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <span className="text-sm text-neutral-400">{t("ui.loading")}</span>
    </div>
  );
}
