"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cx } from "./index";

type Toast = { id: number; ok: boolean; message: string };
const EVENT = "access-toast";

// Affiche un message éphémère au niveau de la page : il reste visible même si le formulaire
// qui l'a déclenché disparaît après la mise à jour des données (ligne reversée, séance confirmée…).
export function showToast(message: string, ok = true) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, ok } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const { message, ok } = (e as CustomEvent<{ message: string; ok: boolean }>).detail;
      const id = ++seq;
      setToasts((t) => [...t.slice(-2), { id, ok, message }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:right-6 lg:bottom-6 lg:left-auto lg:items-end" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.ok ? CircleCheck : CircleAlert;
        return (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-2xl border bg-white p-4 text-sm shadow-lift",
              t.ok ? "border-emerald-200" : "border-rose-200",
            )}
          >
            <Icon className={cx("mt-0.5 size-5 shrink-0", t.ok ? "text-emerald-500" : "text-rose-500")} aria-hidden />
            <p className="flex-1 text-ink">{t.message}</p>
            <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} className="rounded-lg p-0.5 text-slate-400 hover:text-slate-600" aria-label="Fermer">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
