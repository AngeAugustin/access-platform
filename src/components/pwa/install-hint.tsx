"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Smartphone, X } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

const DISMISS_KEY = "access-install-dismissed";
const noopSubscribe = () => () => {};

function eligibleSnapshot() {
  if (window.matchMedia("(display-mode: standalone)").matches) return false;
  try {
    return localStorage.getItem(DISMISS_KEY) !== "1";
  } catch {
    return true;
  }
}

// Propose l'installation de l'application sur l'écran d'accueil (Android) ou explique la marche à suivre (iPhone).
export function InstallHint() {
  const eligible = useSyncExternalStore(noopSubscribe, eligibleSnapshot, () => false);
  const ios = useSyncExternalStore(noopSubscribe, () => /iPad|iPhone|iPod/.test(navigator.userAgent), () => false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!eligible || dismissed || (!promptEvent && !ios)) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-200/70 bg-brand-50/70 p-4 text-sm text-brand-900">
      <Smartphone className="mt-0.5 size-5 shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden />
      <div className="flex-1">
      {promptEvent ? (
        <p>
          Installez Access sur votre téléphone pour l&apos;ouvrir comme une application et recevoir les notifications.{" "}
          <button className="font-semibold underline" onClick={() => promptEvent.prompt().then(close)}>
            Installer
          </button>
        </p>
      ) : (
        <p>Pour installer Access sur iPhone : touchez le bouton Partager, puis « Sur l&apos;écran d&apos;accueil ». Les notifications ne fonctionnent qu&apos;après cette installation.</p>
      )}
      </div>
      <button onClick={close} aria-label="Fermer" className="rounded-lg p-1 text-brand-700 hover:bg-brand-100">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
