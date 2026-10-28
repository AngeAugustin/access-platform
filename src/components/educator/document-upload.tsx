"use client";

import { FileCheck2, FileUp } from "lucide-react";
import { uploadDocumentAction } from "@/server/actions/educator";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import { cx } from "@/components/ui";

export function DocumentUpload({
  type,
  label,
  required,
  accept,
  current,
  locked,
}: {
  type: string;
  label: string;
  required?: boolean;
  accept: string;
  current?: { id: string; name: string };
  locked?: boolean;
}) {
  const Icon = current ? FileCheck2 : FileUp;
  return (
    <ActionForm action={uploadDocumentAction} className={cx("rounded-2xl border p-3.5", current ? "border-slate-200/80" : "border-dashed border-slate-300")} resetOnSuccess>
      <input type="hidden" name="type" value={type} />
      <div className="flex items-center gap-3">
        <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl", current ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")} aria-hidden>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {label}
            {!required && <span className="font-normal text-slate-400"> · facultatif</span>}
          </p>
          {current ? (
            <a href={`/api/fichiers/${current.id}`} target="_blank" rel="noopener" className="block truncate text-xs text-brand-700 hover:text-brand-800">
              {current.name}
            </a>
          ) : (
            <p className="text-xs text-slate-500">{required ? "Obligatoire" : "Non fourni"}</p>
          )}
        </div>
      </div>
      {!locked && (
        <div className="mt-3 flex items-center gap-2">
          <input type="file" name="file" accept={accept} required className="field min-w-0 flex-1" aria-label={`Fichier : ${label}`} />
          <SubmitButton variant="soft" size="sm" pendingLabel="Envoi…">
            {current ? "Remplacer" : "Envoyer"}
          </SubmitButton>
        </div>
      )}
      <div className="mt-2 empty:hidden">
        <FormMessage />
      </div>
    </ActionForm>
  );
}
