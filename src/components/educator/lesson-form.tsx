"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { TIME_SLOTS } from "@/lib/constants";
import { todayIso } from "@/lib/format";
import { addLessonAction } from "@/server/actions/educator";
import type { ActionState } from "@/lib/validation";
import { Button, cx } from "@/components/ui";

const QUEUE_KEY = "access-lesson-queue";
type Queued = { id: string; fields: Record<string, string>; label: string };

function readQueue(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: Queued[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
  window.dispatchEvent(new Event(QUEUE_KEY));
}
function subscribeQueue(onChange: () => void) {
  window.addEventListener(QUEUE_KEY, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(QUEUE_KEY, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function queueSnapshot() {
  try {
    return localStorage.getItem(QUEUE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function toFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// Saisie d'une séance. Sans réseau, la séance est gardée sur le téléphone et envoyée au retour de la connexion.
export function LessonForm({ tutoringId, childName, minDate, maxDate }: { tutoringId: string; childName: string; minDate: string; maxDate: string }) {
  const [state, setState] = useState<ActionState>({});
  const rawQueue = useSyncExternalStore(subscribeQueue, queueSnapshot, () => "[]");
  const queued = useMemo(() => {
    try {
      return (JSON.parse(rawQueue) as Queued[]).filter((q) => q.fields.tutoringId === tutoringId);
    } catch {
      return [];
    }
  }, [rawQueue, tutoringId]);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const flush = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0 || !navigator.onLine) return;
    const remaining: Queued[] = [];
    for (const item of queue) {
      try {
        const res = await addLessonAction({}, toFormData(item.fields));
        // Une séance refusée par le serveur (doublon, date invalide) n'est pas renvoyée en boucle.
        if (!res.ok && res.message !== "Cette séance est déjà enregistrée.") {
          setState({ ok: false, message: `Séance hors ligne refusée (${item.label}) : ${res.message ?? "données invalides"}` });
        }
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
  }, []);

  useEffect(() => {
    // Envoi différé des séances restées en attente lors d'une visite précédente.
    const timer = setTimeout(flush, 0);
    window.addEventListener("online", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", flush);
    };
  }, [flush]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fields = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    const label = `${childName}, ${fields.date}`;
    const enqueue = () => {
      writeQueue([...readQueue(), { id: crypto.randomUUID(), fields, label }]);
      setState({ ok: true, message: "Pas de connexion : la séance est gardée sur ce téléphone et sera envoyée automatiquement." });
      formRef.current?.reset();
    };
    if (!navigator.onLine) return enqueue();
    start(async () => {
      try {
        const res = await addLessonAction({}, fd);
        setState(res);
        if (res.ok) formRef.current?.reset();
      } catch {
        enqueue();
      }
    });
  }

  const err = (name: string) => state.errors?.[name]?.[0];

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.message && (
        <p role="status" className={cx("rounded-lg px-3 py-2 text-sm", state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>
          {state.message}
        </p>
      )}
      {queued.length > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{queued.length} séance(s) en attente d&apos;envoi.</p>}
      <input type="hidden" name="tutoringId" value={tutoringId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="label">
            Date <span className="text-red-600">*</span>
          </label>
          <input id="date" name="date" type="date" className="field" min={minDate} max={maxDate < todayIso() ? maxDate : todayIso()} defaultValue={maxDate < todayIso() ? maxDate : todayIso()} required />
          {err("date") && <p className="mt-1 text-xs text-red-700">{err("date")}</p>}
        </div>
        <div>
          <label htmlFor="slot" className="label">
            Créneau <span className="text-red-600">*</span>
          </label>
          <select id="slot" name="slot" className="field" required>
            {Object.entries(TIME_SLOTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="workDone" className="label">
          Travail effectué <span className="text-red-600">*</span>
        </label>
        <textarea id="workDone" name="workDone" rows={4} className="field" required placeholder="Chapitres revus, exercices faits, devoirs donnés…" />
        {err("workDone") && <p className="mt-1 text-xs text-red-700">{err("workDone")}</p>}
      </div>
      <div>
        <label htmlFor="observation" className="label">
          Observation
        </label>
        <textarea id="observation" name="observation" rows={3} className="field" placeholder="Attitude, progrès, points à travailler…" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer la séance"}
      </Button>
    </form>
  );
}
