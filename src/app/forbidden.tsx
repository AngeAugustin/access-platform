import { ShieldX } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { StatusPage } from "@/components/status-page";

export default function Forbidden() {
  return (
    <StatusPage icon={ShieldX} code="Erreur 403" title="Accès refusé" action={<LinkButton href="/">Revenir à l&apos;accueil</LinkButton>}>
      Cette page n&apos;est pas accessible avec votre compte.
    </StatusPage>
  );
}
