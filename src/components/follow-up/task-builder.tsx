"use client";

import { Camera, Plus, Trash2 } from "lucide-react";
import { TASK_INTERVALS, TASK_KINDS, TASK_TEMPLATES, WEEKDAYS, type TaskKind, type WeekdayKey } from "@/lib/constants";
import { WEEK_ORDER } from "@/lib/follow-up";
import { FieldError } from "@/components/ui/form";
import { cx } from "@/components/ui";
import { kindIcons, kindTones } from "./kind";

export type DraftTask = {
  id?: string;
  key: string;
  kind: TaskKind;
  title: string;
  instructions: string;
  childIds: string[];
  days: WeekdayKey[];
  intervalWeeks: 1 | 2 | 4;
  dueHour: number;
  photoRequired: boolean;
};

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

let counter = 0;
const newKey = () => `t${++counter}`;

export function draftFromTemplate(kind: TaskKind, childIds: string[]): DraftTask {
  const t = TASK_TEMPLATES.find((x) => x.kind === kind)!;
  return { key: newKey(), kind, title: t.title, instructions: t.instructions, childIds, days: [...t.days], intervalWeeks: t.intervalWeeks as 1 | 2 | 4, dueHour: t.dueHour, photoRequired: t.photoRequired };
}

export function draftFromTask(t: Omit<DraftTask, "key" | "instructions" | "intervalWeeks"> & { instructions: string | null; intervalWeeks: number }): DraftTask {
  return { ...t, key: newKey(), instructions: t.instructions ?? "", intervalWeeks: (t.intervalWeeks === 2 || t.intervalWeeks === 4 ? t.intervalWeeks : 1) as 1 | 2 | 4 };
}

// Liste d'actions éditable par le parent ; elle est envoyée au serveur en JSON dans le champ caché « tasks ».
export function TaskBuilder({ kids, tasks, onChange }: { kids: { id: string; firstName: string }[]; tasks: DraftTask[]; onChange: (tasks: DraftTask[]) => void }) {
  const kidIds = kids.map((k) => k.id);
  const update = (key: string, patch: Partial<DraftTask>) => onChange(tasks.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const payload = tasks.map((t) => ({
    ...(t.id ? { id: t.id } : {}),
    kind: t.kind,
    title: t.title,
    instructions: t.instructions,
    childIds: kids.length === 1 ? kidIds : t.childIds.filter((id) => kidIds.includes(id)),
    days: WEEK_ORDER.filter((d) => t.days.includes(d)),
    intervalWeeks: t.intervalWeeks,
    dueHour: t.dueHour,
    photoRequired: t.photoRequired,
  }));

  return (
    <div className="space-y-3">
      <input type="hidden" name="tasks" value={JSON.stringify(payload)} />
      {tasks.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">Ajoutez au moins une action pour le tuteur.</p>}
      {tasks.map((t, index) => {
        const Icon = kindIcons[t.kind];
        return (
          <fieldset key={t.key} className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <legend className="sr-only">Action {index + 1}</legend>
            <div className="flex items-start gap-3">
              <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-xl", kindTones[t.kind])} aria-hidden>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-semibold text-slate-500">{TASK_KINDS[t.kind]}</p>
                <input
                  className="field"
                  value={t.title}
                  maxLength={120}
                  placeholder="Intitulé de l'action"
                  aria-label="Intitulé de l'action"
                  onChange={(e) => update(t.key, { title: e.target.value })}
                />
                <textarea
                  className="field min-h-16"
                  value={t.instructions}
                  maxLength={500}
                  placeholder="Consignes pour le tuteur (facultatif)"
                  aria-label="Consignes"
                  onChange={(e) => update(t.key, { instructions: e.target.value })}
                />
              </div>
              <button type="button" onClick={() => onChange(tasks.filter((x) => x.key !== t.key))} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Retirer l'action">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>

            {kids.length > 1 && (
              <div className="mt-3">
                <p className="mb-1.5 text-13px font-medium text-slate-500">Pour</p>
                <div className="flex flex-wrap gap-1.5">
                  {kids.map((k) => (
                    <Toggle key={k.id} pressed={t.childIds.includes(k.id)} onClick={() => update(t.key, { childIds: toggle(t.childIds, k.id) })}>
                      {k.firstName}
                    </Toggle>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3">
              <p className="mb-1.5 text-13px font-medium text-slate-500">Jours</p>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_ORDER.map((d) => (
                  <Toggle key={d} pressed={t.days.includes(d)} onClick={() => update(t.key, { days: toggle(t.days, d) })} label={WEEKDAYS[d]}>
                    {WEEKDAYS[d].slice(0, 3)}
                  </Toggle>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-13px font-medium text-slate-500">
                Fréquence
                <select className="field mt-1" value={t.intervalWeeks} onChange={(e) => update(t.key, { intervalWeeks: Number(e.target.value) as 1 | 2 | 4 })}>
                  {Object.entries(TASK_INTERVALS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-13px font-medium text-slate-500">
                À faire avant
                <select className="field mt-1" value={t.dueHour} onChange={(e) => update(t.key, { dueHour: Number(e.target.value) })}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h} h
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={t.photoRequired} onChange={(e) => update(t.key, { photoRequired: e.target.checked })} className="size-4 accent-brand-600" />
              <Camera className="size-4 text-slate-400" aria-hidden /> Photo obligatoire dans le retour
            </label>
          </fieldset>
        );
      })}
      <FieldError name="tasks" />

      {tasks.length < 12 && (
        <div>
          <p className="mb-2 text-13px font-medium text-slate-500">Ajouter une action</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(TASK_KINDS) as TaskKind[]).map((kind) => {
              const Icon = kindIcons[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onChange([...tasks, draftFromTemplate(kind, kidIds)])}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-left text-13px font-semibold text-slate-600 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700"
                >
                  <Plus className="size-4 shrink-0" aria-hidden />
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{TASK_KINDS[kind]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ pressed, onClick, children, label }: { pressed: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={cx("rounded-full px-3 py-1.5 text-13px font-semibold transition", pressed ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
    >
      {children}
    </button>
  );
}
