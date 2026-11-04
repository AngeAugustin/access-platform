"use client";

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { deleteClassAction, deleteSubjectAction, reorderCurriculumAction, saveClassAction, saveSubjectAction } from "@/server/actions/curriculum";
import { CYCLES } from "@/lib/constants";
import { ActionForm, FieldError, FormMessage, SelectField, SubmitButton, TextField, useFormState } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showToast } from "@/components/ui/toaster";
import { useSortable } from "@/components/ui/use-sortable";
import { Badge, cx } from "@/components/ui";

export type AdminSubject = { id: string; key: string; label: string; active: boolean; usage: number };
export type AdminClass = { id: string; name: string; cycle: string; active: boolean; subjects: string[]; children: number; educators: number; hasTariff: boolean };

function IconSubmit({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const { pending } = useFormState();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className={cx("inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 [&_svg]:size-4", className)}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Glisser-déposer
// ---------------------------------------------------------------------------

function DragHandle({ label, ...props }: { label: string } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={`Déplacer ${label} (flèches haut et bas)`}
      title="Glisser pour déplacer (appui long sur mobile)"
      className="flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-300 transition select-none hover:bg-slate-100 hover:text-slate-500 focus-visible:text-slate-500 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none active:cursor-grabbing [&_svg]:size-4"
      {...props}
    >
      <GripVertical aria-hidden />
    </button>
  );
}

// Liste réordonnable : une fois une ligne relâchée, le nouvel ordre est enregistré après confirmation.
function SortableList<T extends { id: string }>({
  kind,
  items,
  label,
  children,
}: {
  kind: "class" | "subject";
  items: T[];
  label: (item: T) => string;
  children: (item: T) => ReactNode;
}) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const [asking, setAsking] = useState<{ title: string; resolve: (ok: boolean) => void } | null>(null);
  const { order, dragging, rowProps, handleProps } = useSortable(
    items.map((i) => i.id),
    async (next, moved) => {
      const item = byId.get(moved);
      const title = `Placer « ${item ? label(item) : "cet élément"} » en position ${next.indexOf(moved) + 1} ?`;
      if (!(await new Promise<boolean>((resolve) => setAsking({ title, resolve })))) return false;
      const result = await reorderCurriculumAction(kind, next);
      if (!result.ok) showToast(result.message ?? "L'ordre n'a pas pu être enregistré.", false);
      return Boolean(result.ok);
    },
  );
  return (
    <>
      <ul className="-mx-2 divide-y divide-slate-100">
        {order.map((id) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <li
              key={id}
              {...rowProps(id)}
              className={cx(
                "flex items-start gap-1.5 rounded-xl py-2 transition-shadow",
                dragging === id && "relative z-10 bg-white shadow-lift ring-1 ring-brand-200",
                dragging && dragging !== id && "opacity-80",
              )}
            >
              <DragHandle label={label(item)} {...handleProps(id)} />
              <div className="min-w-0 flex-1">{children(item)}</div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        confirmation={
          asking && {
            title: asking.title,
            description: `Les ${kind === "class" ? "classes" : "matières"} seront proposées dans ce nouvel ordre aux familles et aux éducateurs.`,
            confirmLabel: "Enregistrer l'ordre",
          }
        }
        onClose={(ok) => {
          asking?.resolve(ok);
          setAsking(null);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

function SubjectChecks({ subjects, selected }: { subjects: AdminSubject[]; selected: string[] }) {
  return (
    <fieldset>
      <legend className="label">Matières évaluées</legend>
      <p className="-mt-1 mb-2.5 text-13px text-slate-500">Le parent indique le niveau de l&apos;enfant dans chacune d&apos;elles.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {subjects.map((s) => (
          <label key={s.key} className="choice">
            <input type="checkbox" name="subjects" value={s.key} defaultChecked={selected.includes(s.key)} />
            <span className={cx(!s.active && "text-slate-400")}>
              {s.label}
              {!s.active && " (désactivée)"}
            </span>
          </label>
        ))}
      </div>
      <FieldError name="subjects" />
    </fieldset>
  );
}

export function NewClassForm({ subjects }: { subjects: AdminSubject[] }) {
  return (
    <ActionForm action={saveClassAction} resetOnSuccess className="space-y-4">
      <FormMessage />
      <TextField label="Nom de la classe" name="name" required maxLength={40} placeholder="Tle F4" />
      <SelectField label="Cycle" name="cycle" required defaultValue="" placeholder="Choisir…" options={CYCLES.map((c) => [c, c] as const)} />
      <SubjectChecks subjects={subjects.filter((s) => s.active)} selected={[]} />
      <SubmitButton>
        <Plus aria-hidden /> Ajouter la classe
      </SubmitButton>
    </ActionForm>
  );
}

export function ClassList({ classes, subjects }: { classes: AdminClass[]; subjects: AdminSubject[] }) {
  return (
    <SortableList kind="class" items={classes} label={(c) => c.name}>
      {(c) => <ClassRow classe={c} subjects={subjects} />}
    </SortableList>
  );
}

function ClassRow({ classe, subjects }: { classe: AdminClass; subjects: AdminSubject[] }) {
  const labels = subjects.filter((s) => classe.subjects.includes(s.key));
  const used = classe.children + classe.educators > 0;
  return (
    <details className="group rounded-xl open:bg-slate-50/70 open:ring-1 open:ring-slate-200/80">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-2 py-2 transition select-none hover:bg-slate-50 [-webkit-touch-callout:none] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{classe.name}</span>
            <span className="text-xs text-slate-400">{classe.cycle}</span>
            {!classe.active && <Badge tone="gray">Désactivée</Badge>}
            {classe.active && !classe.hasTariff && <Badge tone="amber">Sans tarif</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-13px text-slate-500">{labels.length ? labels.map((s) => s.label).join(", ") : "Aucune matière"}</span>
        </span>
        <span className="hidden shrink-0 text-right text-xs text-slate-500 sm:block">
          {classe.children} élève{classe.children > 1 ? "s" : ""}
          <br />
          {classe.educators} éducateur{classe.educators > 1 ? "s" : ""}
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 px-3 pt-2 pb-4">
        <ActionForm
          action={saveClassAction}
          toast
          className="space-y-4"
          confirm={(data) => {
            const name = String(data.get("name") ?? "").trim();
            return name && name !== classe.name
              ? {
                  title: `Renommer « ${classe.name} » en « ${name} » ?`,
                  description: used ? "Le nouveau nom sera repris sur les fiches des enfants, des éducateurs et dans la grille tarifaire." : undefined,
                  confirmLabel: "Renommer",
                }
              : { title: `Enregistrer les modifications de « ${classe.name} » ?`, confirmLabel: "Enregistrer" };
          }}
        >
          <FormMessage />
          <input type="hidden" name="id" value={classe.id} />
          <TextField
            label="Nom de la classe"
            name="name"
            id={`name-${classe.id}`}
            required
            maxLength={40}
            defaultValue={classe.name}
            hint={used ? "Un renommage est répercuté sur les fiches des enfants, des éducateurs et la grille tarifaire." : undefined}
          />
          <SelectField label="Cycle" name="cycle" id={`cycle-${classe.id}`} required defaultValue={classe.cycle} options={CYCLES.map((c) => [c, c] as const)} />
          <label className="choice">
            <input type="checkbox" name="active" defaultChecked={classe.active} />
            Proposée aux familles et aux éducateurs
          </label>
          <SubjectChecks subjects={subjects} selected={classe.subjects} />
          <SubmitButton variant="secondary">Enregistrer</SubmitButton>
        </ActionForm>
        <ActionForm
          action={deleteClassAction}
          toast
          confirm={{
            title: `Supprimer la classe « ${classe.name} » ?`,
            description: "Son tarif sera supprimé avec elle. Cette action est définitive.",
            confirmLabel: "Supprimer",
            tone: "danger",
          }}
          className="border-t border-slate-200/80 pt-4"
        >
          <input type="hidden" name="id" value={classe.id} />
          {used ? (
            <p className="text-13px text-slate-500">Utilisée par des fiches : elle ne peut pas être supprimée. Décochez « Proposée » pour la retirer des choix.</p>
          ) : (
            <SubmitButton variant="danger-soft" size="sm">
              <Trash2 aria-hidden /> Supprimer la classe
            </SubmitButton>
          )}
        </ActionForm>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Matières
// ---------------------------------------------------------------------------

export function NewSubjectForm() {
  return (
    <ActionForm action={saveSubjectAction} resetOnSuccess className="space-y-3">
      <FormMessage />
      <div className="flex items-end gap-2">
        <TextField label="Nouvelle matière" name="label" id="new-subject" required maxLength={80} placeholder="Informatique" className="min-w-0 flex-1" />
        <SubmitButton>
          <Plus aria-hidden /> Ajouter
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function SubjectList({ subjects }: { subjects: AdminSubject[] }) {
  return (
    <SortableList kind="subject" items={subjects} label={(s) => s.label}>
      {(s) => <SubjectRow subject={s} />}
    </SortableList>
  );
}

function SubjectRow({ subject }: { subject: AdminSubject }) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <ActionForm
          action={saveSubjectAction}
          toast
          className="flex flex-wrap items-center gap-2"
          confirm={(data) => {
            const name = String(data.get("label") ?? "").trim();
            return name && name !== subject.label
              ? { title: `Renommer « ${subject.label} » en « ${name} » ?`, confirmLabel: "Renommer" }
              : { title: `Enregistrer les modifications de « ${subject.label} » ?`, confirmLabel: "Enregistrer" };
          }}
        >
          <input type="hidden" name="id" value={subject.id} />
          <input
            name="label"
            required
            maxLength={80}
            defaultValue={subject.label}
            aria-label={`Nom de la matière ${subject.label}`}
            className={cx("field h-10 min-w-0 flex-1 basis-40", !subject.active && "text-slate-400")}
          />
          <label className="flex items-center gap-1.5 text-13px text-slate-600">
            <input type="checkbox" name="active" defaultChecked={subject.active} className="size-4 accent-brand-600" />
            Active
          </label>
          <SubmitButton variant="secondary" size="sm" pendingLabel="…">
            Enregistrer
          </SubmitButton>
        </ActionForm>
        <p className="mt-1 text-xs text-slate-400 select-none [-webkit-touch-callout:none]">
          Clé {subject.key} · {subject.usage > 0 ? `utilisée dans ${subject.usage} fiche${subject.usage > 1 ? "s" : ""}` : "inutilisée"}
        </p>
      </div>
      {subject.usage === 0 && (
        <ActionForm
          action={deleteSubjectAction}
          toast
          confirm={{ title: `Supprimer la matière « ${subject.label} » ?`, description: "Cette action est définitive.", confirmLabel: "Supprimer", tone: "danger" }}
        >
          <input type="hidden" name="id" value={subject.id} />
          <IconSubmit label={`Supprimer ${subject.label}`} className="mt-1.5 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 aria-hidden />
          </IconSubmit>
        </ActionForm>
      )}
    </div>
  );
}
