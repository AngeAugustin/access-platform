"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { PencilLine, TriangleAlert } from "lucide-react";
import { Button, cx } from "./index";

export type Confirmation = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  // « danger » pour une suppression ou une action irréversible.
  tone?: "danger" | "primary";
};

// Fenêtre de confirmation (<dialog> natif : focus piégé, fermeture par Échap, premier plan).
// Ouverte tant que `confirmation` est renseignée ; `onClose` reçoit la réponse.
export function ConfirmDialog({ confirmation, onClose }: { confirmation: Confirmation | null; onClose: (confirmed: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmed = useRef(false);
  const id = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (confirmation && !d.open) {
      confirmed.current = false;
      d.showModal();
    } else if (!confirmation && d.open) {
      d.close();
    }
  }, [confirmation]);

  const finish = (ok: boolean) => {
    confirmed.current = ok;
    dialog.current?.close();
  };

  const danger = confirmation?.tone === "danger";
  const Icon = danger ? TriangleAlert : PencilLine;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={confirmation?.description ? `${id}-description` : undefined}
      // Toute fermeture (boutons, Échap, clic sur le fond) passe par ici.
      onClose={() => onClose(confirmed.current)}
      onClick={(e) => e.target === e.currentTarget && finish(false)}
      // Le dialogue peut être placé dans une ligne déplaçable : il ne doit pas déclencher l'appui long.
      onPointerDown={(e) => e.stopPropagation()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-200/80 bg-white p-0 text-left font-normal text-slate-700 shadow-lift backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px] open:animate-fade-in"
    >
      {confirmation && (
        <div className="p-6">
          <span className={cx("flex size-11 items-center justify-center rounded-xl", danger ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600")} aria-hidden>
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <h2 id={`${id}-title`} className="mt-4 text-17px font-semibold tracking-tight text-ink">
            {confirmation.title}
          </h2>
          {confirmation.description && (
            <p id={`${id}-description`} className="mt-1.5 text-sm text-slate-500">
              {confirmation.description}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => finish(false)} autoFocus>
              Annuler
            </Button>
            <Button type="button" variant={danger ? "danger" : "primary"} onClick={() => finish(true)}>
              {confirmation.confirmLabel ?? "Confirmer"}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
