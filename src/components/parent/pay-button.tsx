"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Smartphone } from "lucide-react";
import { payInstallmentAction } from "@/server/actions/parent";
import { Button } from "@/components/ui";

export function PayButton({ installmentId, label = "Payer" }: { installmentId: string; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        size="sm"
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
      {error && <p className="mt-1.5 max-w-48 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
