"use client";

import { MOBILE_OPERATORS, OCCUPATIONS } from "@/lib/constants";
import { ZONES } from "@/lib/zones";
import { activateTutorProfileAction, saveTutorDossierAction, submitTutorDossierAction } from "@/server/actions/tutor";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { TagInput } from "@/components/ui/tag-input";

export type TutorDefaults = {
  birthDate?: string;
  zone?: string;
  occupation?: string;
  bio?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  payoutPhone?: string;
  payoutOperator?: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-6 sm:grid-cols-2">
      <legend className="col-span-full mb-1 text-15px font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

export function TutorDossierForm({ defaults, locked }: { defaults: TutorDefaults; locked: boolean }) {
  return (
    <ActionForm
      action={saveTutorDossierAction}
      toast
      className="space-y-6"
      confirm={locked ? { title: "Enregistrer les modifications ?", description: "Votre dossier est déjà transmis : Access verra les nouvelles informations.", confirmLabel: "Enregistrer" } : undefined}
    >
      <FormMessage />
      <Section title="Vous">
        <TextField label="Date de naissance" name="birthDate" type="date" defaultValue={defaults.birthDate} required />
        <SelectField label="Situation actuelle" name="occupation" defaultValue={defaults.occupation ?? ""} required placeholder="Choisir…" options={OCCUPATIONS.map((o) => [o, o] as const)} />
        <div className="sm:col-span-2">
          <TagInput
            label="Zones d'intervention"
            name="zone"
            options={ZONES}
            defaultValue={defaults.zone}
            required
            placeholder="Tapez un quartier ou une commune…"
            hint="Les familles de ces quartiers vous trouveront. Vous vous rendez chez elles et dans les écoles de leurs enfants."
          />
        </div>
        <div className="sm:col-span-2">
          <TextArea
            label="Présentation aux familles"
            name="bio"
            rows={4}
            defaultValue={defaults.bio}
            hint="Votre expérience avec les enfants, votre façon de suivre leur travail, vos disponibilités en soirée."
          />
        </div>
      </Section>
      <Section title="Garant">
        <TextField label="Nom du garant" name="guarantorName" defaultValue={defaults.guarantorName} required hint="Une personne de confiance qu'Access peut appeler." />
        <TextField label="Téléphone du garant" name="guarantorPhone" type="tel" defaultValue={defaults.guarantorPhone} required />
      </Section>
      <Section title="Reversements">
        <TextField label="Numéro Mobile Money" name="payoutPhone" type="tel" defaultValue={defaults.payoutPhone} required hint="Numéro sur lequel Access vous reverse vos gains." />
        <SelectField label="Opérateur" name="payoutOperator" options={Object.entries(MOBILE_OPERATORS)} placeholder="Choisir…" defaultValue={defaults.payoutOperator ?? ""} required />
      </Section>
      <div className="flex justify-end">
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function SubmitTutorDossierButton() {
  return (
    <ActionForm action={submitTutorDossierAction} className="space-y-3" confirm={{ title: "Transmettre votre dossier ?", description: "Access le vérifiera avant de vous proposer aux familles.", confirmLabel: "Transmettre" }}>
      <FormMessage />
      <SubmitButton className="w-full">Transmettre pour validation</SubmitButton>
    </ActionForm>
  );
}

export function ActivateTutorButton() {
  return (
    <ActionForm
      action={activateTutorProfileAction}
      className="space-y-3"
      confirm={{
        title: "Activer votre profil tuteur ?",
        description: "Vos zones, votre garant, votre numéro Mobile Money et vos pièces sont repris de votre dossier d'éducateur. Access vérifiera ensuite votre profil tuteur.",
        confirmLabel: "Activer",
        tone: "primary",
      }}
    >
      <FormMessage />
      <SubmitButton>Activer mon profil tuteur</SubmitButton>
    </ActionForm>
  );
}
