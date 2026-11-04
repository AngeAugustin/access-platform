"use client";

import { useState } from "react";
import { LockOpen } from "lucide-react";
import { CYCLES } from "@/lib/constants";
import { isLocked, LOCK_AFTER_FAILURES } from "@/lib/auth/lockout";
import { formatDateTime } from "@/lib/format";
import {
  adminStopTutoringAction,
  checkPaymentAction,
  checkPayoutAction,
  createAdminAction,
  fedapayPayoutAction,
  handleComplaintAction,
  manualPayoutAction,
  markRefundDoneAction,
  rejectEducatorAction,
  resetUserPasswordAction,
  resolvePaymentAnomalyAction,
  resolveDisputeAction,
  saveSettingsAction,
  saveTariffAction,
  setUserStatusAction,
  unlockUserAction,
  validateEducatorAction,
} from "@/server/actions/admin";
import { ActionForm, FieldError, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui";

const tariffConfirmation = (classLevel: string) => ({
  title: `Mettre à jour le tarif de ${classLevel} ?`,
  description: "Le nouveau tarif s'applique aux accompagnements créés ensuite ; les accompagnements en cours gardent le leur.",
  confirmLabel: "Mettre à jour",
});

export function EducatorDecisionForms({ educatorId, validated = false, defaults }: { educatorId: string; validated?: boolean; defaults: { stars?: number; cycles: string[] } }) {
  return (
    <div className="space-y-3">
      <ActionForm
        action={validateEducatorAction}
        className="space-y-4"
        confirm={
          validated
            ? { title: "Mettre à jour la note et les cycles ?", description: "Les familles verront les nouvelles valeurs sur le profil.", confirmLabel: "Mettre à jour" }
            : { title: "Valider ce dossier ?", description: "L'éducateur sera proposé aux familles avec la note et les cycles choisis.", confirmLabel: "Valider" }
        }
      >
        <FormMessage />
        <input type="hidden" name="educatorId" value={educatorId} />
        <SelectField label="Note Access" name="stars" required defaultValue={defaults.stars ? String(defaults.stars) : ""} placeholder="Choisir…" options={["5", "4", "3", "2", "1"].map((v) => [v, "★".repeat(Number(v))] as const)} />
        {/* Cycles choisis par l'éducateur, corrigeables ici. */}
        <fieldset>
          <legend className="label">Cycles</legend>
          <div className="space-y-2">
            {CYCLES.map((c) => (
              <label key={c} className="choice">
                <input type="checkbox" name="cycles" value={c} defaultChecked={defaults.cycles.includes(c)} />
                {c}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-13px text-slate-500">Choisis par l&apos;éducateur. Décocher un cycle retire aussi ses classes.</p>
          <FieldError name="cycles" />
        </fieldset>
        <SubmitButton className="w-full" variant={validated ? "secondary" : "primary"}>
          {validated ? "Mettre à jour" : "Valider le dossier"}
        </SubmitButton>
      </ActionForm>
      {/* Le rejet, moins fréquent, reste replié : on l'ouvre pour saisir le motif. */}
      <details className="group">
        <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-xl text-sm font-medium text-rose-600 transition select-none hover:bg-rose-50 group-open:hidden [&::-webkit-details-marker]:hidden">
          Rejeter avec un motif…
        </summary>
        <ActionForm
          action={rejectEducatorAction}
          className="space-y-3 border-t border-slate-100 pt-4"
          confirm={{ title: "Rejeter ce dossier ?", description: "Le motif sera communiqué à l'éducateur pour qu'il corrige son dossier.", confirmLabel: "Rejeter", tone: "danger" }}
        >
          <FormMessage />
          <input type="hidden" name="educatorId" value={educatorId} />
          <TextArea label="Motif du rejet" name="reason" rows={3} required hint="Communiqué à l'éducateur pour qu'il corrige son dossier." />
          <SubmitButton variant="danger-soft" className="w-full">
            Rejeter le dossier
          </SubmitButton>
        </ActionForm>
      </details>
    </div>
  );
}

type AccountStatusKey = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

const statusChanges = {
  ACTIVE: {
    label: "Réactiver",
    variant: "secondary",
    confirm: { title: "Réactiver ce compte ?", description: "L'utilisateur pourra de nouveau se connecter.", confirmLabel: "Réactiver" },
  },
  SUSPENDED: {
    label: "Suspendre",
    variant: "danger-soft",
    confirm: {
      title: "Suspendre ce compte ?",
      description: "Sanction temporaire : l'utilisateur est déconnecté et ne peut plus se connecter jusqu'à sa réactivation.",
      confirmLabel: "Suspendre",
      tone: "danger",
    },
  },
  DEACTIVATED: {
    label: "Désactiver",
    variant: "danger-soft",
    confirm: {
      title: "Désactiver ce compte ?",
      description: "Le compte est fermé : l'utilisateur est déconnecté et ne peut plus se connecter. Ses données sont conservées et le compte peut être réactivé.",
      confirmLabel: "Désactiver",
      tone: "danger",
    },
  },
} as const;

// Gestion d'un compte par l'administration : statut, verrou après échecs de connexion, mot de passe provisoire.
export function AccountManagement({ userId, status, lockedUntil }: { userId: string; status: AccountStatusKey; lockedUntil: Date | null }) {
  const locked = isLocked(lockedUntil);
  const targets = (["ACTIVE", "SUSPENDED", "DEACTIVATED"] as const).filter((s) => s !== status);
  return (
    <div className="space-y-3">
      {locked && (
        <ActionForm
          action={unlockUserAction}
          className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
          confirm={{ title: "Lever le verrou ?", description: "L'utilisateur pourra se connecter immédiatement.", confirmLabel: "Lever le verrou" }}
        >
          <FormMessage />
          <p className="text-13px text-amber-800">
            Verrouillé jusqu’au {formatDateTime(lockedUntil)} après {LOCK_AFTER_FAILURES} échecs de connexion.
          </p>
          <input type="hidden" name="userId" value={userId} />
          <SubmitButton variant="secondary" size="sm">
            <LockOpen aria-hidden />
            Lever le verrou
          </SubmitButton>
        </ActionForm>
      )}
      <div className="flex flex-wrap gap-2">
        {targets.map((next) => (
          <ActionForm key={next} action={setUserStatusAction} confirm={statusChanges[next].confirm} className="contents">
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="status" value={next} />
            <SubmitButton variant={statusChanges[next].variant} size="sm">
              {statusChanges[next].label}
            </SubmitButton>
            <FormMessage />
          </ActionForm>
        ))}
      </div>
      <ActionForm
        action={resetUserPasswordAction}
        className="space-y-2"
        confirm={{
          title: "Réinitialiser le mot de passe ?",
          description: "Un mot de passe provisoire vous sera affiché une seule fois. L'utilisateur est déconnecté et devra le remplacer à sa prochaine connexion.",
          confirmLabel: "Réinitialiser",
          tone: "danger",
        }}
      >
        <FormMessage />
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton variant="ghost" size="sm">
          Réinitialiser le mot de passe
        </SubmitButton>
      </ActionForm>
    </div>
  );
}

export function ComplaintHandlingForm({ complaintId, defaults }: { complaintId: string; defaults: { status: string; response: string } }) {
  return (
    <ActionForm
      action={handleComplaintAction}
      className="space-y-3"
      confirm={{ title: "Envoyer la réponse ?", description: "Le statut de la réclamation sera mis à jour et le demandeur prévenu.", confirmLabel: "Envoyer" }}
    >
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
    <ActionForm
      action={saveTariffAction}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-5"
      confirm={defaults ? tariffConfirmation(defaults.classLevel) : undefined}
    >
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

// Ligne compacte de la grille tarifaire : libellés portés par l'en-tête du tableau.
export function TariffRow({ tariff, perInstallment }: { tariff: { classLevel: string; hourlyRate: number; sessionsPerWeek: number; hoursPerSession: number }; perInstallment: string }) {
  return (
    <ActionForm
      action={saveTariffAction}
      className="grid grid-cols-2 items-center gap-2.5 py-3 sm:grid-cols-[110px_1fr_1fr_1fr_140px_auto]"
      confirm={tariffConfirmation(tariff.classLevel)}
    >
      <input type="hidden" name="classLevel" value={tariff.classLevel} />
      <p className="col-span-2 text-sm font-semibold text-ink sm:col-span-1">{tariff.classLevel}</p>
      <input name="hourlyRate" type="number" min={100} defaultValue={tariff.hourlyRate} className="field h-10" aria-label={`Tarif horaire ${tariff.classLevel}`} />
      <input name="sessionsPerWeek" type="number" min={1} max={7} defaultValue={tariff.sessionsPerWeek} className="field h-10" aria-label={`Séances par semaine ${tariff.classLevel}`} />
      <input name="hoursPerSession" type="number" min={1} max={3} defaultValue={tariff.hoursPerSession} className="field h-10" aria-label={`Heures par séance ${tariff.classLevel}`} />
      <p className="text-13px text-slate-500 tabular-nums">{perInstallment}</p>
      <SubmitButton variant="secondary" size="sm" pendingLabel="…">
        Enregistrer
      </SubmitButton>
      <div className="col-span-full empty:hidden">
        <FormMessage />
      </div>
    </ActionForm>
  );
}

export function SettingsForm({ defaults }: { defaults: { commissionPercent: number; maxDurationWeeks: number; weeksPerInstallment: number } }) {
  return (
    <ActionForm
      action={saveSettingsAction}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4"
      confirm={{ title: "Enregistrer les paramètres ?", description: "Ils s'appliquent immédiatement à toute la plateforme.", confirmLabel: "Enregistrer" }}
    >
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
    <ActionForm action={createAdminAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2" resetOnSuccess>
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
        <ActionForm toast action={fedapayPayoutAction} confirm={{ title: "Envoyer ce reversement ?", description: "Le montant sera versé sur le Mobile Money de l'éducateur via FedaPay.", confirmLabel: "Reverser" }}
        >
          <FormMessage />
          <input type="hidden" name="payoutId" value={payoutId} />
          <SubmitButton size="sm" pendingLabel="Envoi…">
            Reverser via FedaPay
          </SubmitButton>
        </ActionForm>
      )}
      {manual ? (
        <ActionForm
          toast
          action={manualPayoutAction}
          className="flex flex-wrap items-end gap-2"
          confirm={{ title: "Marquer ce reversement comme payé ?", description: "Vérifiez la référence : le reversement sera enregistré comme effectué.", confirmLabel: "Enregistrer" }}
        >
          <FormMessage />
          <input type="hidden" name="payoutId" value={payoutId} />
          <TextField label="Référence du virement" name="providerReference" required className="min-w-40" />
          <SubmitButton size="sm">Enregistrer</SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setManual(false)}>
            Annuler
          </Button>
        </ActionForm>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="text-slate-500" onClick={() => setManual(true)}>
          Saisir un reversement manuel
        </Button>
      )}
    </div>
  );
}

export function CheckPayoutForm({ payoutId }: { payoutId: string }) {
  return (
    <ActionForm toast action={checkPayoutAction} className="space-y-2">
      <input type="hidden" name="payoutId" value={payoutId} />
      <SubmitButton variant="secondary" size="sm" pendingLabel="Vérification…">
        Vérifier chez FedaPay
      </SubmitButton>
      <FormMessage />
    </ActionForm>
  );
}

export function CheckPaymentForm({ paymentId }: { paymentId: string }) {
  return (
    <ActionForm toast action={checkPaymentAction} className="space-y-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <SubmitButton variant="secondary" size="sm" pendingLabel="Vérification…">
        Vérifier chez FedaPay
      </SubmitButton>
      <FormMessage />
    </ActionForm>
  );
}

// Clôture d'une anomalie de paiement ou d'un remboursement dû après arrêt, avec une note obligatoire.
export function ResolveAnomalyForm({ paymentId, installmentId }: { paymentId?: string; installmentId?: string }) {
  const [open, setOpen] = useState(false);
  const refund = Boolean(installmentId);
  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {refund ? "Marquer comme remboursé" : "Marquer comme traitée"}
      </Button>
    );
  }
  return (
    <ActionForm
      toast
      action={refund ? markRefundDoneAction : resolvePaymentAnomalyAction}
      className="space-y-2"
      confirm={
        refund
          ? { title: "Confirmer le remboursement ?", description: "Le parent sera prévenu que le remboursement est effectué.", confirmLabel: "Confirmer" }
          : { title: "Clore cette anomalie ?", description: "Elle disparaîtra de la liste ; la note reste visible dans le journal.", confirmLabel: "Clore" }
      }
    >
      <FormMessage />
      {refund ? <input type="hidden" name="installmentId" value={installmentId} /> : <input type="hidden" name="paymentId" value={paymentId} />}
      <TextArea label="Note de traitement" name="note" rows={2} required placeholder="Ex. remboursé au parent, réf. 12345" />
      <div className="flex gap-2">
        <SubmitButton size="sm">Enregistrer</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </ActionForm>
  );
}

export function AdminStopTutoringForm({ tutoringId }: { tutoringId: string }) {
  return (
    <ActionForm toast action={adminStopTutoringAction} className="space-y-3" confirm={{ title: "Arrêter définitivement cet accompagnement ?", description: "Cette action ne peut pas être annulée.", confirmLabel: "Arrêter l'accompagnement", tone: "danger" }}
    >
      <FormMessage />
      <input type="hidden" name="tutoringId" value={tutoringId} />
      <TextArea label="Motif" name="reason" rows={2} required />
      <SubmitButton variant="danger-soft">Arrêter l&apos;accompagnement</SubmitButton>
    </ActionForm>
  );
}

export function DisputeForm({ lessonId }: { lessonId: string }) {
  return (
    <ActionForm
      toast
      action={resolveDisputeAction}
      className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3"
      confirm={(data) =>
        data.get("decision") === "REMOVE"
          ? { title: "Retirer cette séance ?", description: "Elle sera supprimée de l'accompagnement ; le parent et l'éducateur seront prévenus.", confirmLabel: "Retirer la séance", tone: "danger" }
          : { title: "Valider cette séance ?", description: "La séance sera comptée comme effectuée ; le parent et l'éducateur seront prévenus.", confirmLabel: "Valider la séance" }
      }
    >
      <FormMessage />
      <input type="hidden" name="lessonId" value={lessonId} />
      <SubmitButton name="decision" value="CONFIRMED" variant="secondary" size="sm">
        Valider la séance
      </SubmitButton>
      <SubmitButton name="decision" value="REMOVE" variant="danger-soft" size="sm">
        Retirer la séance
      </SubmitButton>
    </ActionForm>
  );
}
