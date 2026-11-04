"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, type LucideIcon } from "lucide-react";
import { PasswordField } from "@/components/ui/form";
import { cx } from "@/components/ui";

// Mêmes règles que passwordSchema (src/lib/validation.ts), vérifiées pendant la saisie.
function assess(value: string) {
  const missing = [
    value.length < 10 && `encore ${10 - value.length} caractère${10 - value.length > 1 ? "s" : ""}`,
    !/[A-Za-z]/.test(value) && "une lettre",
    !/\d/.test(value) && "un chiffre",
  ].filter((m): m is string => Boolean(m));
  const strong = missing.length === 0 && (value.length >= 14 || /[^A-Za-z0-9]/.test(value));
  return { missing, score: missing.length ? 3 - missing.length : strong ? 4 : 3 };
}

const barColors = ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-500"];

function Strength({ value }: { value: string }) {
  if (!value) return <>10 caractères minimum, avec au moins une lettre et un chiffre.</>;
  const { missing, score } = assess(value);
  return (
    <>
      <span className="mb-1.5 flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cx("h-1.5 flex-1 rounded-full transition-colors", i <= Math.max(score, 1) ? barColors[score] : "bg-slate-200")} />
        ))}
      </span>
      <span aria-live="polite" className={cx("font-medium", missing.length ? "text-slate-600" : "text-emerald-700")}>
        {missing.length ? `Il manque ${missing.join(", ")}.` : score === 4 ? "Excellent mot de passe." : "Bon mot de passe."}
      </span>
    </>
  );
}

// Nouveau mot de passe et confirmation, avec indicateur de solidité.
export function NewPasswordFields({ label = "Mot de passe", confirmLabel = "Confirmation", icon }: { label?: string; confirmLabel?: string; icon?: LucideIcon }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Un formulaire vidé après envoi ne déclenche pas onChange : on remet l'indicateur à zéro.
  useEffect(() => {
    const form = ref.current?.closest("form");
    const clear = () => {
      setPassword("");
      setConfirm("");
    };
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);

  const matches = confirm.length > 0 && confirm === password;
  return (
    <div ref={ref} className="space-y-5">
      <PasswordField
        label={label}
        name="password"
        autoComplete="new-password"
        required
        icon={icon}
        onChange={(e) => setPassword(e.currentTarget.value)}
        hint={<Strength value={password} />}
      />
      <PasswordField
        label={confirmLabel}
        name="confirmPassword"
        autoComplete="new-password"
        required
        icon={icon}
        onChange={(e) => setConfirm(e.currentTarget.value)}
        action={matches && <CircleCheck className="size-[18px] text-emerald-500" aria-hidden />}
        hint={matches && <span className="font-medium text-emerald-700">Les mots de passe correspondent.</span>}
      />
    </div>
  );
}
