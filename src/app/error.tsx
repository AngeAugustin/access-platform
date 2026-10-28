"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-slate-600">Réessayez dans un instant. Si le problème persiste, contactez le support Access.</p>
      <button onClick={reset} className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
        Réessayer
      </button>
    </div>
  );
}
