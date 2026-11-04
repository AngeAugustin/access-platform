import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "@fontsource-variable/inter";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Access — Tutorat scolaire", template: "%s · Access" },
  description: "Trouvez un éducateur vérifié pour votre enfant, suivez chaque séance et payez en Mobile Money.",
  applicationName: "Access",
  appleWebApp: { capable: true, title: "Access", statusBarStyle: "default" },
  // Safari iOS transforme sinon numéros, dates et adresses en liens et modifie le HTML avant l'hydratation
  // (attributs x-apple-data-detectors), ce que React signale comme une erreur. Les liens tel: utiles sont déjà explicites.
  formatDetection: { telephone: false, date: false, address: false, email: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#004aad",
  width: "device-width",
  initialScale: 1,
};

// Toutes les pages sont rendues à la demande : la Content-Security-Policy repose sur un nonce par requête,
// qu'une page générée à l'avance ne peut pas porter (ses scripts seraient bloqués).
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="fr">
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
