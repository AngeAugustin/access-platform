"use client";

import { useState } from "react";
import { EDUCATOR_LEVELS } from "@/lib/constants";
import {
  adminStopTutoringAction,
  createAdminAction,
  fedapayPayoutAction,
  handleComplaintAction,
  manualPayoutAction,
  rejectEducatorAction,
  resolveDisputeAction,
  saveSettingsAction,
  saveTariffAction,
  setUserStatusAction,
  validateEducatorAction,
} from "@/server/actions/admin";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui";

export function EducatorDecisionForms({ educatorId, defaults }: { educatorId: string; defaults: { stars?: number; level?: string } }) {
  return (
    <div className="space-y-5">
      <ActionForm action={validateEducatorAction} className="space-y-3">
        <FormMessage />
        <input type="hidden" name="educatorId" value={educatorId} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Note Access" name="stars" required defaultValue={defaults.stars ? String(defaults.stars) : ""} placeholder="Choisir…" options={["5", "4", "3", "2", "1"].map((v) => [v, "★".repeat(Number(v))] as const)} />
          <SelectField label="Niveau" name="level" required defaultValue={defaults.level ?? ""} placeholder="Choisir…" options={EDUCATOR_LEVELS.map((l) => [l, l] as const)} />
        </div>
        <SubmitButton>Valider le dossier</SubmitButton>
      </ActionForm>
      <ActionForm action={rejectEducatorAction} className="space-y-3 border-t border-slate-200 pt-4" confirmMessage="Rejeter ce dossier ?">
        <FormMessage />
        <input type="hidden" name="educatorId" value={educatorId} />
        <TextArea label="Motif du rejet" name="reason" rows={2} required hint="Communiqué à l'éducateur pour qu'il corrige son dossier." />
        <SubmitButton variant="danger">Rejeter</SubmitButton>
      </ActionForm>
    </div>
  );
}

export function UserStatusForm({ userId, status }: { userId: string; status: "ACTIVE" | "SUSPENDED" }) {
  const next = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  return (
    <ActionForm action={setUserStatusAction} className="space-y-2" confirmMessage={next === "SUSPENDED" ? "Suspendre ce compte ? L'utilisateur sera déconnecté." : "Réactiver ce compte ?"}>
      <FormMessage />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={next} />
      <SubmitButton variant={next === "SUSPENDED" ? "danger" : "secondary"}>{next === "SUSPENDED" ? "Suspendre le compte" : "Réactiver le compte"}</SubmitButton>
    </ActionForm>
  );
}

export function ComplaintHandlingForm({ complaintId, defaults }: { complaintId: string; defaults: { status: string; response: string } }) {
  return (
    <ActionForm action={handleComplaintAction} className="space-y-3">
      <FormMessage />
      <input type="hidden" name="complaintId" value={complaintId} />
      <SelectField
        label="Statut"
        name="status"
        required
        defaultValue={defaults.status === "OPEN" ? "IN_PROGRESS" : defaults.status}
        options={[
          ["IN_PROGRESS", "En cours de traitement"],
          ["RESOLVED", "Résolue"],
          ["REJECTED", "Rejetée"],
        ]}
      />
      <TextArea label="Réponse au demandeur" name="response" rows={5} required defaultValue={defaults.response} />
      <SubmitButton>Envoyer la réponse</SubmitButton>
    </ActionForm>
  );
}

export function TariffForm({ defaults, classes }: { defaults?: { classLevel: string; hourlyRate: number; sessionsPerWeek: number; hoursPerSession: number }; classes: string[] }) {
  return (
    <ActionForm action={saveTariffAction} className="grid items-end gap-3 sm:grid-cols-5">
      <div className="sm:col-span-5">
        <FormMessage />
      </div>
      {defaults ? (
        <TextField label="Classe" name="classLevel" defaultValue={defaults.classLevel} readOnly />
      ) : (
        <SelectField label="Classe" name="classLevel" required placeholder="Choisir…" options={classes.map((c) => [c, c] as const)} />
      )}
      <TextField label="Tarif horaire (FCFA)" name="hourlyRate" type="number" min={100} defaultValue={defaults?.hourlyRate} required />
      <TextField label="Séances / semaine" name="sessionsPerWeek" type="number" min={1} max={7} defaultValue={defaults?.sessionsPerWeek ?? 2} required />
      <TextField label="Heures / séance" name="hoursPerSession" type="number" min={1} max={3} defaultValue={defaults?.hoursPerSession ?? 2} required />
      <SubmitButton variant={defaults ? "secondary" : "primary"}>{defaults ? "Mettre à jour" : "Ajouter"}</SubmitButton>
    </ActionForm>
  );
}

export function SettingsForm({ defaults }: { defaults: { commissionPercent: number; maxDurationWeeks: number; weeksPerInstallment: number } }) {
  return (
    <ActionForm action={saveSettingsAction} className="grid items-end gap-3 sm:grid-cols-4">
      <div className="sm:col-span-4">
        <FormMessage />
      </div>
      <TextField label="Commission Access (%)" name="commissionPercent" type="number" min={0} max={50} defaultValue={defaults.commissionPercent} required />
      <TextField label="Durée max. (semaines)" name="maxDurationWeeks" type="number" min={1} max={52} defaultValue={defaults.maxDurationWeeks} required />
      <TextField label="Semaines par échéance" name="weeksPerInstallment" type="number" min={1} max={8} defaultValue={defaults.weeksPerInstallment} required />
      <SubmitButton>Enregistrer</SubmitButton>
    </ActionForm>
  );
}

export function CreateAdminForm() {
  return (
    <ActionForm action={createAdminAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess>
      <div className="sm:col-span-2">
        <FormMessage />
      </div>
      <TextField label="Prénom" name="firstName" required />
      <TextField label="Nom" name="lastName" required />
      <TextField label="NPI" name="npi" inputMode="numeric" maxLength={10} required />
      <TextField label="Téléphone" name="phone" type="tel" required />
      <TextField label="E-mail" name="email" type="email" required />
      <TextField label="Mot de passe provisoire" name="password" type="password" autoComplete="new-password" required hint="10 caractères minimum, lettres et chiffres." />
      <div className="sm:col-span-2">
        <SubmitButton>Créer l&apos;administrateur</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PayoutForms({ payoutId, fedapay }: { payoutId: string; fedapay: boolean }) {
  const [manual, setManual] = useState(false);
  return (
    <div className="space-y-2">
      {fedapay && !manual && (
        <ActionForm action={fedapayPayoutAction} confirmMessage="Envoyer ce reversement sur le Mobile Money de l'éducateur ?">
          <FormMessage />
          <input type="hidden" name="payoutId" value={payoutId} />
          <SubmitButton className="px-3 py-1.5 text-xs" pendingLabel="Envoi…">
            Reverser via FedaPay
          </SubmitButton>
        </ActionForm>
      )}
      {manual ? (
        <ActionForm action={manualPayoutAction} className="flex flex-wrap items-end gap-2">
          <FormMessage />
          <input type="hidden" name="payoutId" value={payoutId} />
          <TextField label="Référence du virement" name="providerReference" required className="min-w-40" />
          <SubmitButton className="px-3 py-1.5 text-xs">Enregistrer</SubmitButton>
          <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setManual(false)}>
            Annuler
          </Button>
        </ActionForm>
      ) : (
        <Button type="button" variant="ghost" className="px-0 py-0 text-xs" onClick={() => setManual(true)}>
          Saisir un reversement manuel
        </Button>
      )}
    </div>
  );
}

export function AdminStopTutoringForm({ tutoringId }: { tutoringId: string }) {
  return (
    <ActionForm action={adminStopTutoringAction} className="space-y-3" confirmMessage="Arrêter définitivement ce tutorat ?">
      <FormMessage />
      <input type="hidden" name="tutoringId" value={tutoringId} />
      <TextArea label="Motif" name="reason" rows={2} required />
      <SubmitButton variant="danger">Arrêter le tutorat</SubmitButton>
    </ActionForm>
  );
}

export function DisputeForm({ lessonId }: { lessonId: string }) {
  return (
    <ActionForm action={resolveDisputeAction} className="mt-2 flex flex-wrap gap-2">
      <FormMessage />
      <input type="hidden" name="lessonId" value={lessonId} />
      <SubmitButton name="decision" value="CONFIRMED" variant="secondary" className="px-3 py-1.5 text-xs">
        Valider la séance
      </SubmitButton>
      <SubmitButton name="decision" value="REMOVE" variant="danger" className="px-3 py-1.5 text-xs">
        Retirer la séance
      </SubmitButton>
    </ActionForm>
  );
}
