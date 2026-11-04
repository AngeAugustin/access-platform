"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { clearPageCache } from "@/components/pwa/service-worker";
import { Button, cx } from "@/components/ui";

export function LogoutButton({ variant = "icon" }: { variant?: "icon" | "full" }) {
  // <dialog> natif : focus piégé dans la fenêtre, fermeture par Échap, affichage au premier plan.
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Se déconnecter"
        title="Se déconnecter"
        aria-haspopup="dialog"
        className={cx(
          "inline-flex items-center gap-2 rounded-xl text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600",
          variant === "icon" ? "size-9 justify-center" : "h-10 px-3",
        )}
      >
        <LogOut className="size-[18px]" aria-hidden />
        {variant === "full" && "Se déconnecter"}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        // Un clic sur le fond (hors de la fenêtre) annule.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-200/80 bg-white p-0 text-left shadow-lift backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px] open:animate-fade-in"
      >
        <div className="p-6">
          <span className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600" aria-hidden>
            <LogOut className="size-5" strokeWidth={1.75} />
          </span>
          <h2 id={`${id}-title`} className="mt-4 text-17px font-semibold tracking-tight text-ink">
            Se déconnecter ?
          </h2>
          <p id={`${id}-description`} className="mt-1.5 text-sm text-slate-500">
            Vous devrez saisir à nouveau votre e-mail et votre mot de passe pour accéder à votre espace.
          </p>
          <form action={logoutAction} onSubmit={() => clearPageCache()} className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} autoFocus>
              Annuler
            </Button>
            <ConfirmButton />
          </form>
        </div>
      </dialog>
    </>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending} aria-busy={pending}>
      {pending && <LoaderCircle className="animate-spin" aria-hidden />}
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  );
}
