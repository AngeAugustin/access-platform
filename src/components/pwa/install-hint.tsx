"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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
    <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800">
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
      <button onClick={close} aria-label="Fermer" className="text-brand-700">
        ✕
      </button>
    </div>
  );
}
