import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/brand";

// Mise en page commune des pages d'état (403, 404, erreur, hors connexion).
export function StatusPage({ icon: Icon, code, title, children, action }: { icon: LucideIcon; code?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 text-center">
      <LogoMark className="mb-10 size-9" />
      <span className="flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-600 shadow-soft" aria-hidden>
        <Icon className="size-7" strokeWidth={1.6} />
      </span>
      {code && <p className="mt-6 text-sm font-semibold text-brand-600">{code}</p>}
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {children && <div className="mt-2 max-w-sm text-[15px] text-slate-500">{children}</div>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
