import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";

// A character speaks a line on entering a place — portrait, name, text, and a
// single button to move on (to the next speaker, or to dismiss).
export function SpeechModal({
  open,
  icon,
  name,
  text,
  buttonLabel,
  onClose,
}: {
  open: boolean;
  icon: string;
  name: string;
  text: string;
  buttonLabel: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      z="z-[60]"
      overlayClassName="bg-black/60"
      className="w-full max-w-xs border-neutral-700 p-6 text-center"
    >
      <img
        src={icon}
        alt=""
        className="mx-auto size-20 border border-neutral-700 bg-parchment object-cover"
      />
      <h2 className="mt-3 font-serif text-xl text-neutral-100">{name}</h2>
      <p className="mt-2 text-sm text-neutral-300">{text}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
      >
        {buttonLabel || t("location.leave")}
      </button>
    </Modal>
  );
}
