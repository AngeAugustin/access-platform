import type { Metadata, Viewport } from "next";
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
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
