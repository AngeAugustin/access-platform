import { WifiOff } from "lucide-react";
import { StatusPage } from "@/components/status-page";

export const metadata = { title: "Hors connexion" };

export default function OfflinePage() {
  return (
    <StatusPage icon={WifiOff} title="Vous êtes hors connexion">
      Les pages déjà consultées restent disponibles. Les séances saisies hors connexion seront envoyées dès le retour du réseau.
    </StatusPage>
  );
}
