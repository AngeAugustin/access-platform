"use client";

import { adminEndFollowUpAction, rejectTutorAction, saveFollowUpSettingsAction, validateTutorAction } from "@/server/actions/admin-tutor";
import { ActionForm, FormMessage, SubmitButton, TextArea, TextField } from "@/components/ui/form";

export function TutorDecisionForms({ tutorId, canValidate }: { tutorId: string; canValidate: boolean }) {
  return (
    <div className="space-y-3">
      {canValidate && (
        <ActionForm action={validateTutorAction} className="space-y-3" confirm={{ title: "Valider ce dossier ?", description: "Le tuteur sera proposé aux familles dans le catalogue.", confirmLabel: "Valider" }}>
          <FormMessage />
          <input type="hidden" name="tutorId" value={tutorId} />
          <SubmitButton className="w-full">Valider le dossier</SubmitButton>
        </ActionForm>
      )}
      <details className="group">
        <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-xl text-sm font-medium text-rose-600 transition select-none hover:bg-rose-50 group-open:hidden [&::-webkit-details-marker]:hidden">
          Rejeter avec un motif…
        </summary>
        <ActionForm
          action={rejectTutorAction}
          className="space-y-3 border-t border-slate-100 pt-4"
          confirm={{ title: "Rejeter ce dossier ?", description: "Le motif sera communiqué au tuteur pour qu'il corrige son dossier.", confirmLabel: "Rejeter", tone: "danger" }}
        >
          <FormMessage />
          <input type="hidden" name="tutorId" value={tutorId} />
          <TextArea label="Motif du rejet" name="reason" rows={3} required hint="Communiqué au tuteur pour qu'il corrige son dossier." />
          <SubmitButton variant="danger-soft" className="w-full">
            Rejeter le dossier
          </SubmitButton>
        </ActionForm>
      </details>
    </div>
  );
}

export function FollowUpSettingsForm({ defaults }: { defaults: { followUpFirstChild: number; followUpExtraChild: number; followUpCommissionPercent: number } }) {
  return (
    <ActionForm
      action={saveFollowUpSettingsAction}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4"
      confirm={{ title: "Enregistrer le forfait du suivi ?", description: "Il s'applique aux nouvelles demandes ; les suivis existants gardent leur prix.", confirmLabel: "Enregistrer" }}
    >
      <div className="sm:col-span-4">
        <FormMessage />
      </div>
      <TextField label="Premier enfant (FCFA / mois)" name="followUpFirstChild" type="number" min={500} defaultValue={defaults.followUpFirstChild} required />
      <TextField label="Par enfant en plus (FCFA / mois)" name="followUpExtraChild" type="number" min={0} defaultValue={defaults.followUpExtraChild} required />
      <TextField label="Commission Access (%)" name="followUpCommissionPercent" type="number" min={0} max={50} defaultValue={defaults.followUpCommissionPercent} required />
      <SubmitButton>Enregistrer</SubmitButton>
    </ActionForm>
  );
}

export function AdminEndFollowUpForm({ followUpId }: { followUpId: string }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-13px font-medium text-rose-600 hover:text-rose-700 [&::-webkit-details-marker]:hidden">Arrêter…</summary>
      <ActionForm
        action={adminEndFollowUpAction}
        className="mt-2 w-64 space-y-2"
        confirm={{ title: "Arrêter ce suivi ?", description: "Le parent et le tuteur sont prévenus ; les actions à venir sont retirées.", confirmLabel: "Arrêter", tone: "danger" }}
      >
        <FormMessage />
        <input type="hidden" name="followUpId" value={followUpId} />
        <TextArea label="Motif" name="reason" rows={2} required />
        <SubmitButton variant="danger-soft" size="sm" className="w-full">
          Arrêter le suivi
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
