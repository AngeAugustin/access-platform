import { Compass } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { StatusPage } from "@/components/status-page";

export default function NotFound() {
  return (
    <StatusPage icon={Compass} code="Erreur 404" title="Page introuvable" action={<LinkButton href="/">Revenir à l&apos;accueil</LinkButton>}>
      Le lien est peut-être incorrect, ou la page a été déplacée.
    </StatusPage>
  );
}
