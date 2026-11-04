"use client";

import { FileCheck2, FileUp, LoaderCircle, Upload } from "lucide-react";
import { uploadDocumentAction } from "@/server/actions/educator";
import { ActionForm, FormMessage, useFormState } from "@/components/ui/form";
import { buttonClass, cx } from "@/components/ui";

// Le fichier part dès qu'il est choisi : pas de second clic à oublier avant de transmettre le dossier.
function FilePicker({ label, accept, replace }: { label: string; accept: string; replace: boolean }) {
  const { pending } = useFormState();
  return (
    <label className={cx(buttonClass("soft", "mt-3 w-full cursor-pointer", "sm"), pending && "pointer-events-none opacity-70")}>
      {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
      {pending ? "Envoi…" : replace ? "Remplacer le fichier" : "Choisir un fichier"}
      <input
        type="file"
        name="file"
        accept={accept}
        required
        disabled={pending}
        className="sr-only"
        aria-label={`Fichier : ${label}`}
        onChange={(e) => {
          if (e.currentTarget.files?.length) e.currentTarget.form?.requestSubmit();
        }}
      />
    </label>
  );
}

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
    <ActionForm
      action={uploadDocumentAction}
      className={cx("rounded-2xl border p-3.5", current ? "border-slate-200/80" : "border-dashed border-slate-300")}
      resetOnSuccess
      confirm={current ? { title: `Remplacer « ${label} » ?`, description: `Le fichier actuel (${current.name}) sera remplacé par le nouveau.`, confirmLabel: "Remplacer" } : undefined}
    >
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
      {!locked && <FilePicker label={label} accept={accept} replace={Boolean(current)} />}
      <div className="mt-2 empty:hidden">
        <FormMessage />
      </div>
    </ActionForm>
  );
}
