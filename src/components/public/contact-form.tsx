"use client";

import { contactAction } from "@/server/actions/contact";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { PowGuard } from "@/components/security/pow-guard";

export function ContactForm() {
  return (
    <ActionForm action={contactAction} className="space-y-5" resetOnSuccess>
      <FormMessage />
      <PowGuard purpose="contact" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField label="Nom et prénom" name="name" autoComplete="name" required />
        <SelectField
          label="Vous êtes"
          name="profile"
          required
          defaultValue=""
          placeholder="Choisir…"
          options={[
            ["PARENT", "Parent"],
            ["EDUCATOR", "Éducateur"],
            ["OTHER", "Autre"],
          ]}
        />
        <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
        <TextField label="Téléphone (facultatif)" name="phone" type="tel" autoComplete="tel" />
      </div>
      <TextField label="Objet" name="subject" required />
      <TextArea label="Message" name="message" rows={6} required />
      <p className="text-13px text-slate-500">Vos coordonnées servent uniquement à vous répondre.</p>
      <SubmitButton size="lg">Envoyer le message</SubmitButton>
    </ActionForm>
  );
}
