"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Smartphone } from "lucide-react";
import { payInstallmentAction } from "@/server/actions/parent";
import { Button } from "@/components/ui";

// `large` : bouton pleine largeur de la carte « À payer ».
export function PayButton({ installmentId, label = "Payer", large = false }: { installmentId: string; label?: string; large?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={large ? "w-full" : undefined}>
      <Button
        size={large ? "lg" : "sm"}
        variant={large ? "accent" : "primary"}
        className={large ? "w-full" : undefined}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await payInstallmentAction(installmentId);
            if (res.url) window.location.assign(res.url);
            else setError(res.error ?? "Erreur inconnue.");
          })
        }
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Smartphone aria-hidden />}
        {pending ? "Redirection…" : label}
      </Button>
      {error && <p className={large ? "mt-2 text-center text-13px text-rose-300" : "mt-1.5 max-w-48 text-xs text-rose-600"}>{error}</p>}
    </div>
  );
}
