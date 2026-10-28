import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Card, DefinitionList, PageHeader } from "@/components/ui";
import { ChangePasswordForm } from "@/components/auth/password-forms";
import { ProfileForm } from "./profile-form";

export async function ProfilePage({ user }: { user: CurrentUser }) {
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const sessions = await db.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } });
  return (
    <>
      <PageHeader title="Mon profil" subtitle={`${ROLE_LABELS[full.role]} depuis le ${formatDate(full.createdAt)}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Identité">
          <DefinitionList
            items={[
              ["NPI", full.npi],
              ["E-mail", full.email],
              ["Dernière connexion", formatDate(full.lastLoginAt)],
              ["Sessions ouvertes", String(sessions)],
            ]}
          />
          <p className="mt-3 text-xs text-slate-500">Pour modifier votre NPI ou votre e-mail, déposez une réclamation.</p>
        </Card>
        <Card title="Coordonnées">
          <ProfileForm
            defaults={{ firstName: full.firstName, lastName: full.lastName, phone: full.phone, city: full.city ?? "", address: full.address ?? "" }}
          />
        </Card>
        <Card title="Mot de passe">
          <ChangePasswordForm />
        </Card>
      </div>
    </>
  );
}
