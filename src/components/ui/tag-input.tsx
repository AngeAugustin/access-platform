"use client";

import { useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cx } from "@/components/ui";
import { FieldError } from "@/components/ui/form";

// Comparaison sans casse ni accents : « mathe » trouve « Mathématiques ».
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// Champ à choix multiples avec suggestions : on tape, on choisit parmi les propositions.
// La sélection est envoyée sous forme de texte « A, B, C » dans un champ caché.
export function TagInput({
  label,
  name,
  options,
  defaultValue,
  hint,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>(() =>
    (defaultValue ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const taken = new Set(selected.map(fold));
  // Un mot de la matière doit commencer par la saisie : « ma » propose Mathématiques, pas Allemand.
  const q = fold(query);
  // Le libellé entier compte aussi, pour les saisies de plusieurs mots (« haie vive »).
  const suggestions = options.filter((o) => !taken.has(fold(o)) && (fold(o).startsWith(q) || fold(o).split(/[\s'’()-]+/).some((w) => w.startsWith(q))));
  const expanded = open && suggestions.length > 0;
  const listId = `${id}-list`;

  function add(option: string) {
    setSelected((s) => [...s, option]);
    setQuery("");
    setActive(0);
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(option: string) {
    setSelected((s) => s.filter((o) => o !== option));
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      // Entrée choisit la suggestion en surbrillance au lieu d'envoyer le formulaire.
      if (expanded) {
        e.preventDefault();
        add(suggestions[Math.min(active, suggestions.length - 1)]);
      } else if (query) e.preventDefault();
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Backspace" && !query && selected.length > 0) {
      setSelected((s) => s.slice(0, -1));
    }
  }

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      <input type="hidden" name={name} value={selected.join(", ")} />
      <div className="relative">
        <div
          className="field flex h-auto! min-h-11 cursor-text flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100"
          onClick={() => inputRef.current?.focus()}
        >
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-1 pr-1 pl-2.5 text-sm font-medium text-brand-800">
              {s}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(s);
                }}
                className="rounded-md p-0.5 text-brand-500 transition hover:bg-brand-100 hover:text-brand-800"
                aria-label={`Retirer ${s}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={expanded ? `${id}-opt-${Math.min(active, suggestions.length - 1)}` : undefined}
            value={query}
            placeholder={selected.length ? undefined : placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(e.target.value.trim() !== "");
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
            className="h-8 min-w-24 flex-1 bg-transparent px-1.5 text-15px outline-none placeholder:text-slate-400"
          />
        </div>
        {expanded && (
          <ul id={listId} role="listbox" aria-label={label} className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {suggestions.map((o, i) => (
              <li
                key={o}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown plutôt que click : le choix passe avant la perte de focus qui ferme la liste.
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cx("flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm", i === active ? "bg-brand-50 text-brand-800" : "text-slate-700")}
              >
                {o}
                {i === active && <Check className="size-4 text-brand-500" aria-hidden />}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && <p className="mt-1.5 text-13px text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}
