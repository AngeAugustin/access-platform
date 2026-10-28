"use client";

import { uploadDocumentAction } from "@/server/actions/educator";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";

export function DocumentUpload({ type, label, accept, current, locked }: { type: string; label: string; accept: string; current?: { id: string; name: string }; locked?: boolean }) {
  return (
    <ActionForm action={uploadDocumentAction} className="rounded-lg border border-slate-200 p-3" resetOnSuccess>
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {current ? (
          <a href={`/api/fichiers/${current.id}`} target="_blank" rel="noopener" className="text-xs text-brand-700 underline">
            {current.name}
          </a>
        ) : (
          <span className="text-xs text-red-700">Manquant</span>
        )}
      </div>
      {!locked && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="file" name="file" accept={accept} required className="max-w-full text-sm" />
          <SubmitButton variant="secondary" className="px-3 py-1.5 text-xs" pendingLabel="Envoi…">
            {current ? "Remplacer" : "Envoyer"}
          </SubmitButton>
        </div>
      )}
      <div className="mt-2">
        <FormMessage />
      </div>
    </ActionForm>
  );
}
