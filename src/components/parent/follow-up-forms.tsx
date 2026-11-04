"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { cancelFollowUpRequestAction, endFollowUpByParentAction, occurrenceFeedbackAction, updateFollowUpTasksAction } from "@/server/actions/follow-up";
import { ActionForm, FormMessage, SubmitButton, TextArea } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { TaskBuilder, draftFromTask, type DraftTask } from "@/components/follow-up/task-builder";

// « Vu » sur un retour du tuteur, avec une réponse facultative.
export function OccurrenceFeedback({ occurrenceId, seen }: { occurrenceId: string; seen: boolean }) {
  const [replying, setReplying] = useState(false);
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {replying ? (
        <ActionForm action={occurrenceFeedbackAction} toast className="space-y-2">
          <FormMessage />
          <input type="hidden" name="occurrenceId" value={occurrenceId} />
          <TextArea label="Votre réponse au tuteur" name="comment" rows={2} maxLength={500} required autoFocus />
          <div className="flex gap-2">
            <SubmitButton size="sm">Envoyer</SubmitButton>
            <Button type="button" size="sm" variant="secondary" onClick={() => setReplying(false)}>
              Annuler
            </Button>
          </div>
        </ActionForm>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {seen ? (
            <span className="inline-flex items-center gap-1 text-13px text-emerald-700">
              <Check className="size-3.5" aria-hidden /> Vu
            </span>
          ) : (
            <ActionForm action={occurrenceFeedbackAction}>
              <input type="hidden" name="occurrenceId" value={occurrenceId} />
              <SubmitButton size="sm" variant="secondary">
                <Check className="size-4" aria-hidden /> Vu
              </SubmitButton>
            </ActionForm>
          )}
          <button type="button" onClick={() => setReplying(true)} className="text-13px font-semibold text-brand-700 hover:text-brand-800">
            Répondre
          </button>
        </div>
      )}
    </div>
  );
}

export function CancelFollowUpRequestButton({ followUpId }: { followUpId: string }) {
  return (
    <ActionForm action={cancelFollowUpRequestAction} toast confirm={{ title: "Retirer la demande ?", description: "Le tuteur est prévenu. Vous pourrez en choisir un autre.", confirmLabel: "Retirer", tone: "danger" }}>
      <FormMessage />
      <input type="hidden" name="followUpId" value={followUpId} />
      <SubmitButton size="sm" variant="danger-soft">
        Retirer la demande
      </SubmitButton>
    </ActionForm>
  );
}

export function EndFollowUpForm({ followUpId }: { followUpId: string }) {
  return (
    <details>
      <summary className="cursor-pointer list-none text-sm font-semibold text-rose-600 hover:text-rose-700 [&::-webkit-details-marker]:hidden">Arrêter le suivi…</summary>
      <ActionForm
        action={endFollowUpByParentAction}
        toast
        className="mt-3 space-y-2"
        confirm={{ title: "Arrêter ce suivi ?", description: "Le tuteur est prévenu et les actions à venir sont retirées.", confirmLabel: "Arrêter", tone: "danger" }}
      >
        <FormMessage />
        <input type="hidden" name="followUpId" value={followUpId} />
        <TextArea label="Motif (transmis au tuteur)" name="reason" rows={2} required />
        <SubmitButton variant="danger-soft" size="sm" className="w-full">
          Arrêter le suivi
        </SubmitButton>
      </ActionForm>
    </details>
  );
}

type Task = Omit<DraftTask, "key" | "instructions" | "intervalWeeks"> & { id: string; instructions: string | null; intervalWeeks: number };

// Modification des actions d'un suivi en cours : les passages à venir sont recalculés côté serveur.
export function EditTasksForm({ followUpId, kids, tasks }: { followUpId: string; kids: { id: string; firstName: string }[]; tasks: Task[] }) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  if (!editing) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          setDrafts(tasks.map(draftFromTask));
          setEditing(true);
        }}
      >
        <Pencil className="size-4" aria-hidden /> Modifier les actions
      </Button>
    );
  }
  return (
    <ActionForm action={updateFollowUpTasksAction} toast className="mt-4 space-y-4">
      <FormMessage />
      <input type="hidden" name="followUpId" value={followUpId} />
      <TaskBuilder kids={kids} tasks={drafts} onChange={setDrafts} />
      <div className="flex gap-2">
        <SubmitButton>Enregistrer</SubmitButton>
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
          Annuler
        </Button>
      </div>
    </ActionForm>
  );
}
