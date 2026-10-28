import { CalendarDays, ClipboardList, FolderOpen, Hourglass, NotebookPen, Smile, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { Card, LinkButton, List, ListRow, Notice, PageHeader, Stat, TextLink } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { LessonBadge } from "@/components/status";

export const metadata = { title: "Accueil" };

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export default async function EducatorHome() {
  const user = await requireRole("EDUCATOR");
  const profile = await db.educatorProfile.findUnique({ where: { userId: user.id } });
  const [active, lessonsThisMonth, toConfirm, pendingPayouts, recent] = profile
    ? await Promise.all([
        db.tutoring.findMany({ where: { educatorId: profile.id, status: "ACTIVE" }, include: { child: true }, orderBy: { startDate: "asc" } }),
        db.lesson.count({ where: { tutoring: { educatorId: profile.id }, date: { gte: monthStart() } } }),
        db.lesson.count({ where: { tutoring: { educatorId: profile.id }, status: "RECORDED" } }),
        db.payout.aggregate({ where: { educatorId: profile.id, status: { in: ["PENDING", "PROCESSING"] } }, _sum: { netAmount: true } }),
        db.lesson.findMany({ where: { tutoring: { educatorId: profile.id } }, include: { tutoring: { include: { child: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
      ])
    : [[], 0, 0, { _sum: { netAmount: 0 } }, []];

  const status = profile?.status ?? "INCOMPLETE";
  const banner = {
    INCOMPLETE: { tone: "blue", title: "Complétez votre dossier", text: "Renseignez votre parcours, vos disponibilités et vos pièces, puis transmettez le dossier pour apparaître dans le catalogue." },
    SUBMITTED: { tone: "amber", title: "Dossier en cours de vérification", text: "L'équipe Access vérifie vos pièces. Vous serez visible des familles dès la validation." },
    REJECTED: { tone: "red", title: "Dossier à corriger", text: `Motif : ${profile?.rejectionReason ?? "non précisé"}. Corrigez-le puis transmettez-le à nouveau.` },
    VALIDATED: null,
  }[status];

  return (
    <>
      <PageHeader eyebrow="Tableau de bord" title={`Bonjour ${user.firstName}`} subtitle="Vos élèves, vos séances et vos revenus." />
      {banner && (
        <div className="mb-6">
          <Notice
            tone={banner.tone as "blue" | "amber" | "red"}
            icon={FolderOpen}
            title={banner.title}
            action={status !== "SUBMITTED" ? <LinkButton href="/educateur/dossier" size="sm">Ouvrir mon dossier</LinkButton> : undefined}
          >
            {banner.text}
          </Notice>
        </div>
      )}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Élèves suivis" value={active.length} icon={Smile} href="/educateur/eleves" />
        <Stat label="Séances ce mois" value={lessonsThisMonth} icon={NotebookPen} href="/educateur/seances" tone="green" />
        <Stat label="En attente de confirmation" value={toConfirm} icon={Hourglass} tone="amber" />
        <Stat label="À recevoir" value={formatFcfa(pendingPayouts._sum.netAmount ?? 0)} icon={Wallet} href="/educateur/paiements" tone="slate" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Mes élèves" action={<TextLink href="/educateur/eleves">Tout voir</TextLink>}>
          {active.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun élève pour le moment. Les familles vous choisissent dans le catalogue une fois votre dossier validé.</p>
          ) : (
            <List>
              {active.map((t) => (
                <ListRow
                  key={t.id}
                  href={`/educateur/eleves/${t.id}`}
                  leading={<Avatar name={fullName(t.child)} size={40} />}
                  title={fullName(t.child)}
                  meta={
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden /> {t.slotsLabel}
                    </span>
                  }
                  trailing={<span className="text-xs text-slate-400">{t.classLevel}</span>}
                />
              ))}
            </List>
          )}
        </Card>
        <Card title="Dernières séances" action={<TextLink href="/educateur/seances">Historique</TextLink>}>
          {recent.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <ClipboardList className="size-4" aria-hidden /> Aucune séance saisie.
            </p>
          ) : (
            <List>
              {recent.map((l) => (
                <ListRow
                  key={l.id}
                  href={`/educateur/eleves/${l.tutoringId}`}
                  title={fullName(l.tutoring.child)}
                  meta={`${formatDate(l.date)} · ${TIME_SLOTS[l.slot]} · ${l.workDone.slice(0, 60)}${l.workDone.length > 60 ? "…" : ""}`}
                  trailing={<LessonBadge status={l.status} />}
                />
              ))}
            </List>
          )}
        </Card>
      </div>
    </>
  );
}
