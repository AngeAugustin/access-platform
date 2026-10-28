"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { getPowChallenge } from "@/server/actions/pow";
import type { PowPurpose } from "@/lib/pow-core";
import { useFormState } from "@/components/ui/form";

function zeroBits(bytes: Uint8Array): number {
  let count = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      count += 8;
      continue;
    }
    return count + Math.clz32(byte) - 24;
  }
  return count;
}

// Cherche n tel que SHA-256("<sel>:<n>") commence par `bits` bits à zéro, par lots pour rester fluide.
async function solve(salt: string, bits: number, signal: { cancelled: boolean }): Promise<number | null> {
  const encoder = new TextEncoder();
  const batch = 512;
  for (let start = 0; !signal.cancelled; start += batch) {
    const hashes = await Promise.all(
      Array.from({ length: batch }, (_, i) => crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${start + i}`))),
    );
    const found = hashes.findIndex((h) => zeroBits(new Uint8Array(h)) >= bits);
    if (found >= 0) return start + found;
  }
  return null;
}

// Vérification anti-robot invisible.
// - mode "always" : le défi est résolu dès l'affichage du formulaire (inscription, mot de passe oublié) ;
// - mode "on-demand" : seulement quand le serveur l'exige (connexion après plusieurs échecs), puis le formulaire est renvoyé.
export function PowGuard({ purpose, mode = "always" }: { purpose: PowPurpose; mode?: "always" | "on-demand" }) {
  const { state } = useFormState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "solving" | "ready">("idle");
  const handledState = useRef<unknown>(null);

  const run = useCallback(
    async (signal: { cancelled: boolean }, thenSubmit: boolean) => {
      setStatus("solving");
      const challenge = await getPowChallenge(purpose);
      const nonce = await solve(challenge.salt, challenge.bits, signal);
      if (nonce === null || signal.cancelled || !inputRef.current) return;
      inputRef.current.value = `${challenge.token}~${nonce}`;
      setStatus("ready");
      if (thenSubmit) inputRef.current.form?.requestSubmit();
      // Le défi expire : on en prépare un nouveau peu avant.
      return challenge.expiresAt;
    },
    [purpose],
  );

  useEffect(() => {
    if (mode !== "always") return;
    const signal = { cancelled: false };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loop = async () => {
      const expiresAt = await run(signal, false);
      if (expiresAt && !signal.cancelled) timer = setTimeout(loop, Math.max(30_000, expiresAt - Date.now() - 60_000));
    };
    timer = setTimeout(loop, 0);
    return () => {
      signal.cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, run]);

  // Après chaque envoi, la solution est consommée : on en recalcule une si le serveur la redemande.
  useEffect(() => {
    if (handledState.current === state) return;
    handledState.current = state;
    if (inputRef.current) inputRef.current.value = "";
    const signal = { cancelled: false };
    const timer = setTimeout(() => {
      if (state.powRequired) run(signal, true);
      else if (mode === "always" && (state.ok === false || state.message)) run(signal, false);
    }, 0);
    return () => {
      signal.cancelled = true;
      clearTimeout(timer);
    };
  }, [state, mode, run]);

  return (
    <>
      <input ref={inputRef} type="hidden" name="pow" defaultValue="" />
      {status === "solving" && (mode === "on-demand" || state.powRequired) && (
        <p className="flex items-center gap-2 rounded-xl border border-brand-200/70 bg-brand-50/70 px-3.5 py-3 text-sm text-brand-900" role="status">
          <LoaderCircle className="size-4 animate-spin text-brand-600" aria-hidden />
          Vérification de sécurité en cours…
        </p>
      )}
      {status === "ready" && mode === "on-demand" && (
        <p className="sr-only" role="status">
          <ShieldCheck aria-hidden /> Vérification terminée
        </p>
      )}
    </>
  );
}
