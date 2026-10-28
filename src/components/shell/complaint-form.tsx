"use client";

import { COMPLAINT_SUBJECTS } from "@/lib/constants";
import { createComplaintAction } from "@/server/actions/complaints";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea } from "@/components/ui/form";

export function ComplaintForm() {
  return (
    <ActionForm action={createComplaintAction} className="space-y-5" resetOnSuccess>
      <FormMessage />
      <SelectField label="Motif" name="subject" required placeholder="Choisir…" options={COMPLAINT_SUBJECTS.map((s) => [s, s] as const)} />
      <TextArea label="Détail" name="details" required rows={6} hint="Précisez l'enfant, l'éducateur, les dates concernées." />
      <SubmitButton className="w-full">Envoyer la réclamation</SubmitButton>
    </ActionForm>
  );
}
