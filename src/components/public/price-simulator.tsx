"use client";

import { useId, useState } from "react";
import { amountForWeeks, type Rate } from "@/lib/billing";
import { formatFcfa } from "@/lib/format";

export type SimulatorTariff = Rate & { classLevel: string };

// Estimation du coût d'un accompagnement : mêmes règles que la création réelle (src/lib/billing.ts).
export function PriceSimulator({ tariffs, weeksPerInstallment, maxWeeks }: { tariffs: SimulatorTariff[]; weeksPerInstallment: number; maxWeeks: number }) {
  const id = useId();
  const [classLevel, setClassLevel] = useState(tariffs[0]?.classLevel ?? "");
  const [weeks, setWeeks] = useState(Math.min(12, maxWeeks));
  const tariff = tariffs.find((t) => t.classLevel === classLevel) ?? tariffs[0];
  if (!tariff) return null;

  const total = amountForWeeks(tariff, weeks);
  const installments = Math.ceil(weeks / weeksPerInstallment);
  const perInstallment = amountForWeeks(tariff, Math.min(weeksPerInstallment, weeks));

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-[32px] bg-brand-600 text-white lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-7 p-8 sm:p-10">
        <div>
          <label htmlFor={`${id}-classe`} className="text-sm font-medium text-brand-200">
            Classe de l&apos;enfant
          </label>
          <select
            id={`${id}-classe`}
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
            className="mt-2 block h-13 w-full rounded-2xl border-0 bg-white/10 px-4 text-base font-semibold text-white outline-none focus:ring-4 focus:ring-white/20 [&>option]:text-ink"
          >
            {tariffs.map((t) => (
              <option key={t.classLevel} value={t.classLevel}>
                {t.classLevel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${id}-semaines`} className="text-sm font-medium text-brand-200">
              Durée de l&apos;accompagnement
            </label>
            <span className="font-display text-xl font-bold">
              {weeks} semaine{weeks > 1 ? "s" : ""}
            </span>
          </div>
          <input
            id={`${id}-semaines`}
            type="range"
            min={1}
            max={maxWeeks}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="mt-4 w-full accent-accent-400"
          />
        </div>
        <p className="text-sm leading-relaxed text-brand-200">
          {tariff.sessionsPerWeek} séance{tariff.sessionsPerWeek > 1 ? "s" : ""} de {tariff.hoursPerSession} h par semaine, à {formatFcfa(tariff.hourlyRate)} l&apos;heure.
        </p>
      </div>
      <div className="flex flex-col justify-between gap-8 bg-white/[0.06] p-8 sm:p-10" aria-live="polite">
        <div>
          <p className="text-sm font-medium text-brand-200">Coût total estimé</p>
          <p className="mt-2 font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-extrabold tracking-tight">{formatFcfa(total)}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.07] p-4">
            <dt className="text-13px text-brand-200">Échéances</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{installments}</dd>
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-4">
            <dt className="text-13px text-brand-200">Par échéance</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{formatFcfa(perInstallment)}</dd>
          </div>
        </dl>
        <p className="text-13px leading-relaxed text-brand-200">
          Une échéance couvre {weeksPerInstallment} semaines{weeks % weeksPerInstallment ? " ; la dernière, plus courte, coûte moins" : ""}. Rien n&apos;est payé à
          l&apos;avance pour tout l&apos;accompagnement.
        </p>
      </div>
    </div>
  );
}
