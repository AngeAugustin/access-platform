"use client";

import { createContext, use, useEffect, useRef, useState, useTransition } from "react";
import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, type LucideIcon } from "lucide-react";
import type { ActionState } from "@/lib/validation";
import { Button, type ButtonSize, type ButtonVariant, cx } from "./index";
import { showToast } from "./toaster";
import { type Confirmation, ConfirmDialog } from "./confirm-dialog";

export type { Confirmation };

type FormContextValue = { state: ActionState; pending: boolean };
const FormContext = createContext<FormContextValue>({ state: {}, pending: false });

export function useFormState() {
  return use(FormContext);
}

// Superpose des erreurs locales (validation d'étape) sur celles renvoyées par le serveur.
export function FormErrorScope({ errors, children }: { errors?: ActionState["errors"]; children: ReactNode }) {
  const parent = useFormState();
  return <FormContext value={{ ...parent, state: { ...parent.state, errors: { ...parent.state.errors, ...errors } } }}>{children}</FormContext>;
}

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

// Formulaire branché sur une action serveur. Contrairement à <form action>, la saisie n'est pas
// effacée quand l'action renvoie des erreurs de validation.
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
  toast = false,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  // Fenêtre de confirmation avant l'envoi. Une fonction reçoit les données saisies (et le bouton
  // utilisé) et renvoie null pour envoyer sans confirmation.
  confirm?: Confirmation | ((formData: FormData) => Confirmation | null);
  // Affiche aussi le résultat en message éphémère : utile quand le formulaire disparaît après l'action.
  toast?: boolean;
}) {
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState<{ confirmation: Confirmation; formData: FormData } | null>(null);
  const stateRef = useRef(state);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  // L'action est appelée directement (et non via useActionState) : son résultat est connu dès la réponse
  // du serveur, même si le formulaire disparaît dans la page mise à jour qui arrive avec elle.
  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await action(stateRef.current, formData);
      stateRef.current = result;
      if (toast && result.message && !result.powRequired) showToast(result.message, result.ok !== false);
      startTransition(() => setState(result));
    });

  return (
    <FormContext value={{ state, pending }}>
      <form
        ref={ref}
        className={className}
        // Sans JavaScript, le navigateur enverrait les champs dans l'URL (GET) : on impose POST.
        method="post"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pending || asking) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const formData = new FormData(e.currentTarget, submitter);
          const confirmation = typeof confirm === "function" ? confirm(formData) : confirm;
          if (confirmation) setAsking({ confirmation, formData });
          else submit(formData);
        }}
      >
        {children}
      </form>
      {/* Hors du <form> : les boutons de la fenêtre ne doivent pas le soumettre. */}
      <ConfirmDialog
        confirmation={asking?.confirmation ?? null}
        onClose={(ok) => {
          setAsking(null);
          if (ok && asking) submit(asking.formData);
        }}
      />
    </FormContext>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  pendingLabel,
  name,
  value,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormState();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={className} aria-busy={pending} name={name} value={value}>
      {pending && <LoaderCircle className="animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? "Envoi…") : children}
    </Button>
  );
}

export function FormMessage() {
  const { state } = useFormState();
  if (!state.message) return null;
  const Icon = state.ok ? CircleCheck : CircleAlert;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cx(
        "flex animate-fade-in items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
      )}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      {state.message}
    </p>
  );
}

export function FieldError({ name }: { name: string }) {
  const { state } = useFormState();
  const errors = state.errors?.[name];
  if (!errors?.length) return null;
  return (
    <p id={`${name}-error`} className="mt-1.5 text-13px text-rose-600">
      {errors[0]}
    </p>
  );
}

function useInvalid(name: string) {
  const { state } = useFormState();
  return Boolean(state.errors?.[name]?.length);
}

type FieldProps = { label: string; name: string; hint?: ReactNode };

// `icon` ou `prefix` (ex. « +229 ») s'affichent à gauche dans le champ, `action` (un bouton) à droite.
type FieldDecorations = { icon?: LucideIcon; prefix?: string; action?: ReactNode };

export function TextField({
  label,
  name,
  hint,
  className,
  icon: Icon,
  prefix,
  action,
  ...props
}: FieldProps & FieldDecorations & ComponentProps<"input">) {
  const invalid = useInvalid(name);
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {props.required && <span className="text-rose-500"> *</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-slate-400" aria-hidden />}
        {prefix && (
          <span className="pointer-events-none absolute inset-y-2.5 left-3.5 flex items-center border-r border-slate-200 pr-2.5 text-sm font-semibold text-slate-600" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={id}
          name={name}
          className={cx("field", Icon && "has-icon", prefix && "has-prefix", action ? "has-action" : null)}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${name}-error` : undefined}
          {...props}
        />
        {action && <div className="absolute inset-y-0 right-1.5 flex items-center">{action}</div>}
      </div>
      {hint && <div className="mt-1.5 text-13px text-slate-500">{hint}</div>}
      <FieldError name={name} />
    </div>
  );
}

// Mot de passe avec bouton pour afficher la saisie.
export function PasswordField(props: FieldProps & { icon?: LucideIcon; action?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Toggle = visible ? EyeOff : Eye;
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      action={
        <span className="flex items-center gap-1">
          {props.action}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={visible}
          >
            <Toggle className="size-[18px]" aria-hidden />
          </button>
        </span>
      }
    />
  );
}

export function TextArea({ label, name, hint, className, ...props }: FieldProps & ComponentProps<"textarea">) {
  const invalid = useInvalid(name);
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {props.required && <span className="text-rose-500"> *</span>}
      </label>
      <textarea id={id} name={name} rows={4} className="field" aria-invalid={invalid} {...props} />
      {hint && <p className="mt-1.5 text-13px text-slate-500">{hint}</p>}
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
        {props.required && <span className="text-rose-500"> *</span>}
      </label>
      <select id={id} name={name} className="field" aria-invalid={invalid} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1.5 text-13px text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}
