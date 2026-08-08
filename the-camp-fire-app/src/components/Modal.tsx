import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Tip: the shared dark overlay + centered card shell every modal in this app uses. Individual modals only need to supply their title and form contents. */
export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg p-5"
        style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-4 tracking-wide" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
