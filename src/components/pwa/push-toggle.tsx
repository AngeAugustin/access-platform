"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { deletePushSubscription, savePushSubscription } from "@/server/actions/notifications";
import { Button } from "@/components/ui";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const noopSubscribe = () => () => {};

export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | undefined }) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(vapidPublicKey) && "serviceWorker" in navigator && "PushManager" in window,
    () => false,
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(setSubscription).catch(() => {});
  }, [supported]);

  if (!supported) {
    return (
      <p className="text-sm leading-relaxed text-slate-500">
        Les alertes ne sont pas disponibles sur cet appareil. Sur iPhone, installez d&apos;abord Access sur l&apos;écran d&apos;accueil. Les messages
        importants vous sont aussi envoyés par e-mail.
      </p>
    );
  }

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Autorisation refusée dans le navigateur.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!) });
      const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
      if (!res.ok) throw new Error("Abonnement refusé.");
      setSubscription(sub);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activation impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!subscription) return;
    setBusy(true);
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe().catch(() => {});
    setSubscription(null);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-slate-500">{subscription ? "Les alertes sont activées sur cet appareil." : "Recevez une alerte sur ce téléphone à chaque événement important."}</p>
      {subscription ? (
        <Button variant="secondary" className="w-full" onClick={disable} disabled={busy}>
          Désactiver
        </Button>
      ) : (
        <Button className="w-full" onClick={enable} disabled={busy}>
          Activer les notifications
        </Button>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
