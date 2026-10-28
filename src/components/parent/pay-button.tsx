"use client";

import { useState, useTransition } from "react";
import { payInstallmentAction } from "@/server/actions/parent";
import { Button } from "@/components/ui";

export function PayButton({ installmentId, label = "Payer" }: { installmentId: string; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        className="px-3 py-1.5 text-xs"
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
        {pending ? "Redirection…" : label}
      </Button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
