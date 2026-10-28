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
      <p className="text-sm text-slate-600">
        <Link href="/parent/enfants/nouveau" className="font-semibold text-brand-700 underline">
          Inscrivez d&apos;abord votre enfant
        </Link>{" "}
        pour demander un tutorat.
      </p>
    );
  }
  if (eligible.length === 0) {
    return <p className="text-sm text-slate-600">Cet éducateur n&apos;intervient dans aucune des classes de vos enfants.</p>;
  }
  if (freeSlots.length === 0) {
    return <p className="text-sm text-slate-600">Tous les créneaux de cet éducateur sont déjà réservés.</p>;
  }

  const child = eligible.find((c) => c.id === childId);
  const tariff = tariffs.find((t) => t.classLevel === child?.classLevel);
  const perPeriod = tariff ? amountForWeeks(tariff, Math.min(weeksPerInstallment, weeks)) : 0;
  const total = tariff ? amountForWeeks(tariff, weeks) : 0;

  return (
    <ActionForm action={createTutoringAction} className="space-y-4">
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
          Créneaux hebdomadaires {tariff && <span className="font-normal text-slate-500">({tariff.sessionsPerWeek} à choisir)</span>}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {freeSlots.map((s) => (
            <label key={`${s.day}|${s.slot}`} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
              <input type="checkbox" name="slots" value={`${s.day}|${s.slot}`} />
              {WEEKDAYS[s.day]} {TIME_SLOTS[s.slot]}
            </label>
          ))}
        </div>
        <FieldError name="slots" />
      </fieldset>
      {tariff ? (
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p>
            {tariff.sessionsPerWeek} séance(s) de {tariff.hoursPerSession} h par semaine à {formatFcfa(tariff.hourlyRate)}/h.
          </p>
          <p className="mt-1">
            <strong>{formatFcfa(perPeriod)}</strong> toutes les {weeksPerInstallment} semaines · total <strong>{formatFcfa(total)}</strong>
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Le tarif de cette classe n&apos;est pas encore défini par Access.</p>
      )}
      <SubmitButton className="w-full" pendingLabel="Création du tutorat…">
        Confirmer le tutorat
      </SubmitButton>
      <p className="text-xs text-slate-500">L&apos;éducateur est prévenu immédiatement. Vous pouvez arrêter le tutorat à tout moment.</p>
    </ActionForm>
  );
}
