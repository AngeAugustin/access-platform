import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { CLASS_LEVELS } from "@/lib/constants";
import { formatFcfa } from "@/lib/format";
import { amountForWeeks } from "@/lib/billing";
import { getSettings } from "@/server/services/settings";
import { Card, PageHeader } from "@/components/ui";
import { SettingsForm, TariffForm } from "@/components/admin/forms";

export const metadata = { title: "Tarifs et paramètres" };

export default async function TariffsPage() {
  const admin = await requireRole("ADMIN");
  const [tariffs, settings] = await Promise.all([db.tariff.findMany(), getSettings()]);
  const ordered = CLASS_LEVELS.map((c) => tariffs.find((t) => t.classLevel === c)).filter((t) => t !== undefined);
  const missing = CLASS_LEVELS.filter((c) => !tariffs.some((t) => t.classLevel === c));

  return (
    <>
      <PageHeader title="Tarifs et paramètres" subtitle="Une modification s'applique aux nouveaux tutorats ; les contrats en cours gardent leur tarif." />
      <Card title="Paramètres de facturation" className="mb-5">
        {admin.isSuperAdmin ? (
          <SettingsForm defaults={settings} />
        ) : (
          <p className="text-sm text-slate-700">
            Commission {settings.commissionPercent} % · durée maximale {settings.maxDurationWeeks} semaines · une échéance toutes les {settings.weeksPerInstallment} semaines. Seul un super-administrateur peut les modifier.
          </p>
        )}
      </Card>
      {missing.length > 0 && (
        <Card title="Ajouter un tarif" className="mb-5">
          <p className="mb-3 text-sm text-amber-800">Sans tarif, aucun tutorat ne peut être créé pour : {missing.join(", ")}.</p>
          <TariffForm classes={missing} />
        </Card>
      )}
      <Card title="Grille tarifaire">
        <div className="space-y-4">
          {ordered.map((t) => (
            <div key={t.id} className="border-b border-slate-100 pb-4 last:border-0">
              <TariffForm classes={[]} defaults={t} />
              <p className="mt-1 text-xs text-slate-500">Soit {formatFcfa(amountForWeeks(t, settings.weeksPerInstallment))} par échéance de {settings.weeksPerInstallment} semaines.</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
