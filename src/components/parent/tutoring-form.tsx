"use client";

import Link from "next/link";
import { useState } from "react";
import { TIME_SLOTS, WEEKDAYS, type TimeSlotKey, type WeekdayKey } from "@/lib/constants";
import { amountForWeeks } from "@/lib/billing";
import { formatFcfa, todayIso } from "@/lib/format";
import { createTutoringAction } from "@/server/actions/parent";
import { ActionForm, FieldError, FormMessage, SelectField, SubmitButton, TextField } from "@/components/ui/form";

type Tariff = { classLevel: string; hourlyRate: number; sessionsPerWeek: number; hoursPerSession: number };

export function TutoringRequestForm({
  educatorId,
  educatorClasses,
  kids: children,
  defaultChildId,
  freeSlots,
  tariffs,
  maxWeeks,
  weeksPerInstallment,
}: {
  educatorId: string;
  educatorClasses: string[];
  kids: { id: string; name: string; classLevel: string }[];
  defaultChildId?: string;
  freeSlots: { day: WeekdayKey; slot: TimeSlotKey }[];
  tariffs: Tariff[];
  maxWeeks: number;
  weeksPerInstallment: number;
}) {
  const eligible = children.filter((c) => educatorClasses.includes(c.classLevel));
  const [childId, setChildId] = useState(eligible.some((c) => c.id === defaultChildId) ? defaultChildId! : (eligible[0]?.id ?? ""));
  const [weeks, setWeeks] = useState(Math.min(8, maxWeeks));

  if (children.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        <Link href="/parent/enfants/nouveau" className="font-semibold text-brand-700 hover:text-brand-800">
          Inscrivez d&apos;abord votre enfant
        </Link>{" "}
        pour demander un tutorat.
      </p>
    );
  }
  if (eligible.length === 0) {
    return <p className="text-sm text-slate-500">Cet éducateur n&apos;intervient dans aucune des classes de vos enfants.</p>;
  }
  if (freeSlots.length === 0) {
    return <p className="text-sm text-slate-500">Tous les créneaux de cet éducateur sont déjà réservés.</p>;
  }

  const child = eligible.find((c) => c.id === childId);
  const tariff = tariffs.find((t) => t.classLevel === child?.classLevel);
  const perPeriod = tariff ? amountForWeeks(tariff, Math.min(weeksPerInstallment, weeks)) : 0;
  const total = tariff ? amountForWeeks(tariff, weeks) : 0;

  return (
    <ActionForm action={createTutoringAction} className="space-y-5">
      <FormMessage />
      <input type="hidden" name="educatorId" value={educatorId} />
      <SelectField label="Enfant" name="childId" required value={childId} onChange={(e) => setChildId(e.target.value)} options={eligible.map((c) => [c.id, `${c.name} (${c.classLevel})`] as const)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Durée (semaines)"
          name="durationWeeks"
          type="number"
          min={1}
          max={maxWeeks}
          required
          value={weeks}
          onChange={(e) => setWeeks(Math.max(1, Math.min(maxWeeks, Number(e.target.value) || 1)))}
        />
        <TextField label="Début" name="startDate" type="date" min={todayIso()} defaultValue={todayIso()} required />
      </div>
      <fieldset>
        <legend className="label">
          Créneaux par semaine {tariff && <span className="font-normal text-slate-500">· {tariff.sessionsPerWeek} à choisir</span>}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {freeSlots.map((s) => (
            <label key={`${s.day}|${s.slot}`} className="choice">
              <input type="checkbox" name="slots" value={`${s.day}|${s.slot}`} />
              {WEEKDAYS[s.day]} {TIME_SLOTS[s.slot]}
            </label>
          ))}
        </div>
        <FieldError name="slots" />
      </fieldset>
      {tariff ? (
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-slate-500">Total sur {weeks} semaine{weeks > 1 ? "s" : ""}</span>
            <span className="text-xl font-semibold tracking-tight text-ink tabular-nums">{formatFcfa(total)}</span>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-slate-200/70 pt-3 text-[13px] text-slate-500">
            <p className="flex justify-between gap-3">
              <span>Rythme</span>
              <span className="text-slate-700">
                {tariff.sessionsPerWeek} × {tariff.hoursPerSession} h / semaine
              </span>
            </p>
            <p className="flex justify-between gap-3">
              <span>Tarif horaire</span>
              <span className="text-slate-700">{formatFcfa(tariff.hourlyRate)}</span>
            </p>
            <p className="flex justify-between gap-3">
              <span>Échéance</span>
              <span className="text-slate-700">
                {formatFcfa(perPeriod)} / {weeksPerInstallment} sem.
              </span>
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Le tarif de cette classe n&apos;est pas encore défini par Access.</p>
      )}
      <SubmitButton className="w-full" size="lg" pendingLabel="Création du tutorat…">
        Confirmer le tutorat
      </SubmitButton>
      <p className="text-center text-xs text-slate-400">L&apos;éducateur est prévenu immédiatement. Vous pouvez arrêter le tutorat à tout moment.</p>
    </ActionForm>
  );
}
