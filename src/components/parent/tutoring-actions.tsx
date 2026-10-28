"use client";

import { useState } from "react";
import { reviewEducatorAction, reviewLessonAction, stopTutoringAction } from "@/server/actions/parent";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea, useFormState } from "@/components/ui/form";
import { Button } from "@/components/ui";

export function LessonReview({ lessonId }: { lessonId: string }) {
  const [dispute, setDispute] = useState(false);
  return (
    <ActionForm toast action={reviewLessonAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <FormMessage />
      <input type="hidden" name="lessonId" value={lessonId} />
      <Hide>
        {dispute && <TextArea label="Ce qui ne va pas" name="comment" rows={2} required />}
        <div className="flex flex-wrap gap-2">
          {!dispute && (
            <SubmitButton name="decision" value="CONFIRMED" size="sm">
              Confirmer la séance
            </SubmitButton>
          )}
          {dispute ? (
            <>
              <SubmitButton name="decision" value="DISPUTED" variant="danger" size="sm">
                Envoyer la contestation
              </SubmitButton>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDispute(false)}>
                Annuler
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setDispute(true)}>
              Contester
            </Button>
          )}
        </div>
      </Hide>
    </ActionForm>
  );
}

// Masque les boutons une fois l'action réussie.
function Hide({ children }: { children: React.ReactNode }) {
  const { state } = useFormState();
  return state.ok ? null : <>{children}</>;
}

export function StopTutoringForm({ tutoringId }: { tutoringId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="danger-soft" onClick={() => setOpen(true)}>
        Arrêter le tutorat
      </Button>
    );
  }
  return (
    <ActionForm toast action={stopTutoringAction} className="w-full max-w-md space-y-3 rounded-2xl border border-rose-200 bg-white p-4 shadow-soft" confirmMessage="Confirmer l'arrêt définitif de ce tutorat ?">
      <FormMessage />
      <input type="hidden" name="tutoringId" value={tutoringId} />
      <Hide>
        <TextArea label="Motif de l'arrêt" name="reason" rows={3} required />
        <p className="text-xs leading-relaxed text-slate-500">La période en cours sera facturée au prorata des semaines entamées ; les échéances suivantes seront annulées.</p>
        <div className="flex gap-2">
          <SubmitButton variant="danger">Arrêter définitivement</SubmitButton>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </Hide>
    </ActionForm>
  );
}

export function EducatorReviewForm({ tutoringId }: { tutoringId: string }) {
  return (
    <ActionForm toast action={reviewEducatorAction} className="space-y-4">
      <FormMessage />
      <input type="hidden" name="tutoringId" value={tutoringId} />
      <Hide>
        <SelectField label="Note" name="rating" required placeholder="Choisir…" options={[["5", "★★★★★ Excellent"], ["4", "★★★★ Très bien"], ["3", "★★★ Bien"], ["2", "★★ Moyen"], ["1", "★ Insuffisant"]]} />
        <TextArea label="Commentaire" name="comment" rows={3} hint="Visible par les autres familles, avec votre prénom." />
        <SubmitButton>Publier mon avis</SubmitButton>
      </Hide>
    </ActionForm>
  );
}

