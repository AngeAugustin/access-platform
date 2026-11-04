"use client";

import { useId, useRef, useState } from "react";
import { Camera, Plus, Trash2, X } from "lucide-react";
import { OCCURRENCE_RESULTS } from "@/lib/constants";
import { acceptFollowUpAction, declineFollowUpAction, endFollowUpByTutorAction, reportOccurrenceAction } from "@/server/actions/tutor";
import { ActionForm, FieldError, FormMessage, SubmitButton, TextArea } from "@/components/ui/form";
import { Button, cx } from "@/components/ui";

const resultTones = {
  DONE: "peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800",
  PARTIAL: "peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-800",
  NOT_DONE: "peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:text-rose-800",
} as const;

type Grade = { key: number; subject: string; score: string; outOf: string };

// Retour du tuteur sur une action : résultat, commentaire, photos et, pour une visite à l'école, les notes relevées.
export function ReportButton({ occurrenceId, title, childName, photoRequired, schoolVisit, late }: { occurrenceId: string; title: string; childName: string; photoRequired: boolean; schoolVisit: boolean; late?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [result, setResult] = useState<keyof typeof OCCURRENCE_RESULTS | "">("");
  const [photoCount, setPhotoCount] = useState(0);
  const [grades, setGrades] = useState<Grade[]>([]);
  const gradePayload = grades.filter((g) => g.subject.trim() && g.score !== "").map((g) => ({ subject: g.subject.trim(), score: Number(g.score.replace(",", ".")), outOf: Number(g.outOf) || 20 }));

  return (
    <>
      <Button type="button" size="sm" variant={late ? "danger-soft" : "primary"} onClick={() => dialog.current?.showModal()}>
        Faire le retour
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-0 text-left text-slate-700 shadow-lift backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px] open:animate-fade-in"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 id={`${id}-title`} className="text-17px font-semibold tracking-tight text-ink">
              {title}
            </h2>
            <p className="text-sm text-slate-500">{childName}</p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Fermer">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <ActionForm action={reportOccurrenceAction} toast className="space-y-5 p-5">
          <FormMessage />
          <input type="hidden" name="occurrenceId" value={occurrenceId} />
          <fieldset>
            <legend className="label">Résultat</legend>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(OCCURRENCE_RESULTS) as (keyof typeof OCCURRENCE_RESULTS)[]).map((r) => (
                <label key={r} className="cursor-pointer">
                  <input type="radio" name="result" value={r} className="peer sr-only" checked={result === r} onChange={() => setResult(r)} />
                  <span className={cx("block rounded-xl border border-slate-200 px-2 py-2.5 text-center text-sm font-semibold text-slate-600 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400", resultTones[r])}>
                    {OCCURRENCE_RESULTS[r]}
                  </span>
                </label>
              ))}
            </div>
            <FieldError name="result" />
          </fieldset>

          <TextArea
            label={result && result !== "DONE" ? "Ce qui n'a pas pu être fait" : "Commentaire pour le parent"}
            name="comment"
            rows={3}
            maxLength={1000}
            placeholder={result && result !== "DONE" ? "Obligatoire : expliquez la situation." : "Facultatif : ce qui s'est bien passé, une difficulté…"}
          />

          {schoolVisit && (
            <div>
              <input type="hidden" name="grades" value={JSON.stringify(gradePayload)} />
              <p className="label">Notes relevées</p>
              <ul className="space-y-2">
                {grades.map((g) => (
                  <li key={g.key} className="grid grid-cols-[1fr_4.5rem_4.5rem_auto] items-center gap-2">
                    <input className="field" placeholder="Matière" aria-label="Matière" value={g.subject} onChange={(e) => setGrades(grades.map((x) => (x.key === g.key ? { ...x, subject: e.target.value } : x)))} />
                    <input className="field" inputMode="decimal" placeholder="Note" aria-label="Note" value={g.score} onChange={(e) => setGrades(grades.map((x) => (x.key === g.key ? { ...x, score: e.target.value } : x)))} />
                    <input className="field" inputMode="numeric" aria-label="Sur" value={g.outOf} onChange={(e) => setGrades(grades.map((x) => (x.key === g.key ? { ...x, outOf: e.target.value } : x)))} />
                    <button type="button" onClick={() => setGrades(grades.filter((x) => x.key !== g.key))} className="rounded-lg p-2 text-slate-400 hover:text-rose-600" aria-label="Retirer la note">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setGrades([...grades, { key: (grades.at(-1)?.key ?? 0) + 1, subject: "", score: "", outOf: "20" }])}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                <Plus className="size-4" aria-hidden /> Ajouter une note
              </button>
              <FieldError name="grades" />
            </div>
          )}

          <div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 hover:border-brand-400">
              <Camera className="size-5 text-slate-400" aria-hidden />
              <span className="flex-1">
                {photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? "s" : ""} choisie${photoCount > 1 ? "s" : ""}` : "Ajouter des photos (3 au plus)"}
                {photoRequired && <span className="block text-xs text-amber-700">Le parent demande une photo.</span>}
              </span>
              <input type="file" name="photos" accept="image/jpeg,image/png" multiple className="sr-only" onChange={(e) => setPhotoCount(e.target.files?.length ?? 0)} />
            </label>
            <FieldError name="photos" />
          </div>

          <SubmitButton className="w-full" size="lg" pendingLabel="Envoi du retour…">
            Envoyer au parent
          </SubmitButton>
        </ActionForm>
      </dialog>
    </>
  );
}

export function AcceptFollowUpButton({ followUpId }: { followUpId: string }) {
  return (
    <ActionForm action={acceptFollowUpAction} toast confirm={{ title: "Accepter ce suivi ?", description: "Les actions demandées apparaîtront chaque jour dans « Aujourd'hui ».", confirmLabel: "Accepter" }}>
      <FormMessage />
      <input type="hidden" name="followUpId" value={followUpId} />
      <SubmitButton size="sm">Accepter</SubmitButton>
    </ActionForm>
  );
}

export function ReasonForm({ followUpId, kind }: { followUpId: string; kind: "decline" | "end" }) {
  const decline = kind === "decline";
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-rose-600 hover:text-rose-700 [&::-webkit-details-marker]:hidden">{decline ? "Décliner…" : "Arrêter le suivi…"}</summary>
      <ActionForm
        action={decline ? declineFollowUpAction : endFollowUpByTutorAction}
        toast
        className="mt-3 max-w-sm space-y-2"
        confirm={decline ? undefined : { title: "Arrêter ce suivi ?", description: "Le parent est prévenu et les actions à venir sont retirées.", confirmLabel: "Arrêter", tone: "danger" }}
      >
        <FormMessage />
        <input type="hidden" name="followUpId" value={followUpId} />
        <TextArea label={decline ? "Motif (transmis au parent)" : "Motif de l'arrêt"} name="reason" rows={2} required />
        <SubmitButton variant="danger-soft" size="sm" className="w-full">
          {decline ? "Décliner la demande" : "Arrêter le suivi"}
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
