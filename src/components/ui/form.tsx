"use client";

import { createContext, startTransition, use, useActionState, useEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { ActionState } from "@/lib/validation";
import { Button, type ButtonVariant, cx } from "./index";

type FormContextValue = { state: ActionState; pending: boolean };
const FormContext = createContext<FormContextValue>({ state: {}, pending: false });

export function useFormState() {
  return use(FormContext);
}

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

// Formulaire branché sur une action serveur. Contrairement à <form action>, la saisie n'est pas
// effacée quand l'action renvoie des erreurs de validation.
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirmMessage,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirmMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <FormContext value={{ state, pending }}>
      <form
        ref={ref}
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const formData = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(formData));
        }}
      >
        {children}
      </form>
    </FormContext>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingLabel,
  name,
  value,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormState();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className} aria-busy={pending} name={name} value={value}>
      {pending ? (pendingLabel ?? "Envoi…") : children}
    </Button>
  );
}

export function FormMessage() {
  const { state } = useFormState();
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cx("rounded-lg px-3 py-2 text-sm", state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>
      {state.message}
    </p>
  );
}

export function FieldError({ name }: { name: string }) {
  const { state } = useFormState();
  const errors = state.errors?.[name];
  if (!errors?.length) return null;
  return (
    <p id={`${name}-error`} className="mt-1 text-xs text-red-700">
      {errors[0]}
    </p>
  );
}

function useInvalid(name: string) {
  const { state } = useFormState();
  return Boolean(state.errors?.[name]?.length);
}

type FieldProps = { label: string; name: string; hint?: ReactNode };

export function TextField({ label, name, hint, className, ...props }: FieldProps & ComponentProps<"input">) {
  const invalid = useInvalid(name);
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <input id={id} name={name} className="field" aria-invalid={invalid} aria-describedby={invalid ? `${name}-error` : undefined} {...props} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function TextArea({ label, name, hint, className, ...props }: FieldProps & ComponentProps<"textarea">) {
  const invalid = useInvalid(name);
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <textarea id={id} name={name} rows={4} className="field" aria-invalid={invalid} {...props} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  hint,
  options,
  placeholder,
  className,
  ...props
}: FieldProps & ComponentProps<"select"> & { options: readonly (readonly [string, string])[]; placeholder?: string }) {
  const invalid = useInvalid(name);
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <select id={id} name={name} className="field" aria-invalid={invalid} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}
