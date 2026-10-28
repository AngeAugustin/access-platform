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
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#4b48e3",
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
