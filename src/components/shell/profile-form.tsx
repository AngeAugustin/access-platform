"use client";

import { updateProfileAction } from "@/server/actions/auth";
import { ActionForm, FormMessage, SubmitButton, TextField } from "@/components/ui/form";

export function ProfileForm({ defaults }: { defaults: { firstName: string; lastName: string; phone: string; city: string; address: string } }) {
  return (
    <ActionForm action={updateProfileAction} className="space-y-5">
      <FormMessage />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Prénom" name="firstName" defaultValue={defaults.firstName} required />
        <TextField label="Nom" name="lastName" defaultValue={defaults.lastName} required />
        <TextField label="Téléphone" name="phone" type="tel" defaultValue={defaults.phone} required />
        <TextField label="Ville" name="city" defaultValue={defaults.city} />
        <TextField label="Adresse" name="address" defaultValue={defaults.address} className="sm:col-span-2" />
      </div>
      <SubmitButton>Enregistrer les modifications</SubmitButton>
    </ActionForm>
  );
}
