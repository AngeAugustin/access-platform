"use client";

import Link from "next/link";
import { useState } from "react";
import { formatFcfa, todayIso } from "@/lib/format";
import { followUpPrice } from "@/lib/follow-up";
import { requestFollowUpAction } from "@/server/actions/follow-up";
import { ActionForm, FieldError, FormMessage, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { TaskBuilder, draftFromTemplate, type DraftTask } from "@/components/follow-up/task-builder";
import { cx } from "@/components/ui";

type Kid = { id: string; firstName: string; currentClass: string; busy: boolean };

export function FollowUpRequestForm({ tutorId, kids, defaultChildId, grid }: { tutorId: string; kids: Kid[]; defaultChildId?: string; grid: { followUpFirstChild: number; followUpExtraChild: number } }) {
  const free = kids.filter((k) => !k.busy);
  const [childIds, setChildIds] = useState<string[]>(() => {
    const first = free.find((k) => k.id === defaultChildId) ?? free[0];
    return first ? [first.id] : [];
  });
  const [tasks, setTasks] = useState<DraftTask[]>(() => (free.length ? [draftFromTemplate("LESSONS", childIds), draftFromTemplate("HOMEWORK", childIds)] : []));

  if (kids.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        <Link href="/parent/enfants/nouveau" className="font-semibold text-brand-700 hover:text-brand-800">
          Inscrivez d&apos;abord votre enfant
        </Link>{" "}
        pour demander un suivi.
      </p>
    );
  }
  if (free.length === 0) return <p className="text-sm text-slate-500">Chacun de vos enfants a déjà un suivi en cours ou une demande en attente.</p>;

  const selected = free.filter((k) => childIds.includes(k.id));
  const price = followUpPrice(selected.length, grid);
  const toggleChild = (id: string) => {
    const next = childIds.includes(id) ? childIds.filter((c) => c !== id) : [...childIds, id];
    setChildIds(next);
    // Un enfant ajouté est inclus par défaut dans toutes les actions ; un enfant retiré en sort.
    setTasks(tasks.map((t) => ({ ...t, childIds: next.filter((c) => t.childIds.includes(c) || !childIds.includes(c)) })));
  };

  return (
    <ActionForm action={requestFollowUpAction} className="space-y-6">
      <FormMessage />
      <input type="hidden" name="tutorId" value={tutorId} />

      <fieldset>
        <legend className="label">Enfants à suivre</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {kids.map((k) => (
            <label key={k.id} className={cx("choice", k.busy && "opacity-60")}>
              <input type="checkbox" name="childIds" value={k.id} checked={childIds.includes(k.id)} disabled={k.busy} onChange={() => toggleChild(k.id)} />
              <span>
                {k.firstName} <span className="text-slate-400">· {k.currentClass}</span>
                {k.busy && <span className="block text-xs text-slate-500">Déjà suivi</span>}
              </span>
            </label>
          ))}
        </div>
        <FieldError name="childIds" />
      </fieldset>

      <div>
        <p className="label">Actions à mener</p>
        <p className="-mt-1 mb-3 text-13px text-slate-500">Le tuteur fait un retour après chaque action. Vous pourrez modifier cette liste à tout moment.</p>
        <TaskBuilder kids={selected} tasks={tasks} onChange={setTasks} />
      </div>

      <TextField label="Début du suivi" name="startDate" type="date" min={todayIso()} defaultValue={todayIso()} required />
      <TextArea label="Message au tuteur" name="message" maxLength={1000} placeholder="Horaires de la maison, école des enfants, points d'attention…" />

      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-slate-500">Forfait mensuel</span>
          <span className="text-xl font-semibold tracking-tight text-ink tabular-nums">{formatFcfa(price)}</span>
        </div>
        <p className="mt-2 border-t border-slate-200/70 pt-2 text-13px text-slate-500">
          {formatFcfa(grid.followUpFirstChild)} pour le premier enfant, {formatFcfa(grid.followUpExtraChild)} par enfant supplémentaire. Tarif fixé par Access.
        </p>
      </div>

      <SubmitButton className="w-full" size="lg" pendingLabel="Envoi de la demande…">
        Envoyer la demande
      </SubmitButton>
      <p className="text-center text-xs text-slate-400">Le tuteur est prévenu et accepte ou décline votre demande. Rien n&apos;est dû avant son accord.</p>
    </ActionForm>
  );
}
