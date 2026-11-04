"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { reviewEducatorAction, reviewLessonAction, stopTutoringAction } from "@/server/actions/parent";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea, useFormState } from "@/components/ui/form";
import { Button } from "@/components/ui";

export function LessonReview({ lessonId }: { lessonId: string }) {
  const [dispute, setDispute] = useState(false);
  return (
    <ActionForm
      toast
      action={reviewLessonAction}
      className="mt-4 space-y-3 border-t border-slate-100 pt-4"
      confirm={(data) =>
        data.get("decision") === "DISPUTED"
          ? { title: "Signaler un problème sur cette séance ?", description: "Votre signalement sera transmis à l’éducateur et à Access pour examen.", confirmLabel: "Envoyer", tone: "danger" }
          : { title: "Confirmer cette séance ?", description: "Vous attestez qu'elle a bien eu lieu.", confirmLabel: "Confirmer la séance" }
      }
    >
      <FormMessage />
      <input type="hidden" name="lessonId" value={lessonId} />
      <Hide>
        {dispute ? (
          <>
            <TextArea label="Que s’est-il passé ?" name="comment" rows={3} required hint="L’éducateur et l’équipe Access seront prévenus." />
            <div className="grid grid-cols-1 gap-2 sm:flex">
              <SubmitButton name="decision" value="DISPUTED" variant="danger" size="lg">
                Envoyer le signalement
              </SubmitButton>
              <Button type="button" variant="ghost" size="lg" onClick={() => setDispute(false)}>
                Annuler
              </Button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:flex">
            <SubmitButton name="decision" value="CONFIRMED" variant="dark" size="lg">
              <Check aria-hidden /> Oui, je confirme
            </SubmitButton>
            <Button type="button" variant="danger-soft" size="lg" onClick={() => setDispute(true)}>
              Signaler un problème
            </Button>
          </div>
        )}
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
    <ActionForm toast action={stopTutoringAction} className="w-full max-w-md space-y-3 rounded-2xl border border-rose-200 bg-white p-4 shadow-soft" confirm={{ title: "Arrêter définitivement ce tutorat ?", description: "Cette action ne peut pas être annulée.", confirmLabel: "Arrêter le tutorat", tone: "danger" }}
    >
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

