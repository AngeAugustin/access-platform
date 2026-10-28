"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui";
import { StatusPage } from "@/components/status-page";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPage icon={TriangleAlert} title="Une erreur est survenue" action={<Button onClick={reset}>Réessayer</Button>}>
      Réessayez dans un instant. Si le problème persiste, contactez le support Access.
    </StatusPage>
  );
}
