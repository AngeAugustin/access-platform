export const metadata = { title: "Hors connexion" };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Vous êtes hors connexion</h1>
      <p className="mt-2 text-sm text-slate-600">
        Les pages déjà consultées restent disponibles. Les séances saisies hors connexion seront envoyées dès le retour du réseau.
      </p>
    </div>
  );
}
