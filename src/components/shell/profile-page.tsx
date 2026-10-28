import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, DefinitionList, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { ChangePasswordForm } from "@/components/auth/password-forms";
import { ProfileForm } from "./profile-form";
import { LogoutButton } from "./logout-button";

export async function ProfilePage({ user }: { user: CurrentUser }) {
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const sessions = await db.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } });
  const name = `${full.firstName} ${full.lastName}`;
  return (
    <>
      <PageHeader title="Mon profil" />
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-6">
        <Avatar name={name} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-tight text-ink">{name}</p>
          <p className="truncate text-sm text-slate-500">
            {ROLE_LABELS[full.role]} · inscrit le {formatDate(full.createdAt)}
          </p>
        </div>
        <div className="hidden sm:block">
          <LogoutButton variant="full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Coordonnées" description="Visibles par les familles ou éducateurs avec qui vous êtes en relation.">
          <ProfileForm
            defaults={{ firstName: full.firstName, lastName: full.lastName, phone: full.phone, city: full.city ?? "", address: full.address ?? "" }}
          />
        </Card>
        <div className="space-y-6">
          <Card title="Identifiants" description="Pour modifier votre NPI ou votre e-mail, déposez une réclamation.">
            <DefinitionList
              items={[
                ["NPI", full.npi],
                ["E-mail", full.email],
                ["Dernière connexion", formatDateTime(full.lastLoginAt)],
                ["Appareils connectés", String(sessions)],
              ]}
            />
          </Card>
          <Card title="Mot de passe" description="Changer le mot de passe déconnecte vos autres appareils.">
            <ChangePasswordForm />
          </Card>
          <div className="sm:hidden">
            <LogoutButton variant="full" />
          </div>
        </div>
      </div>
    </>
  );
}
