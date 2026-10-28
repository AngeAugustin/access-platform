import { BookOpenCheck, CalendarClock, ClipboardCheck, CreditCard, GraduationCap, Smile, UserRoundPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { Card, IconTile, LinkButton, List, ListRow, Notice, PageHeader, Stat, TextLink } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { InstallmentBadge } from "@/components/status";

export const metadata = { title: "Accueil" };

export default async function ParentHome() {
  const user = await requireRole("PARENT");
  const [childrenCount, activeTutorings, nextInstallments, toConfirm] = await Promise.all([
    db.child.count({ where: { parentId: user.id } }),
    db.tutoring.findMany({
      where: { parentId: user.id, status: "ACTIVE" },
      include: { child: true, educator: { include: { user: true, documents: { where: { type: "PHOTO" }, select: { id: true } } } } },
      orderBy: { startDate: "asc" },
    }),
    db.installment.findMany({
      where: { status: "PENDING", tutoring: { parentId: user.id } },
      include: { tutoring: { include: { child: true } } },
      orderBy: { dueDate: "asc" },
      take: 4,
    }),
    db.lesson.findMany({ where: { status: "RECORDED", tutoring: { parentId: user.id } }, select: { tutoringId: true } }),
  ]);
  const now = new Date();
  const next = nextInstallments[0];

  if (childrenCount === 0) {
    return (
      <>
        <PageHeader eyebrow="Bienvenue sur Access" title={`Bonjour ${user.firstName}`} subtitle="Trois étapes pour trouver le bon éducateur pour votre enfant." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: UserRoundPlus, title: "Inscrivez votre enfant", text: "Classe, école et niveau par matière.", href: "/parent/enfants/nouveau", cta: "Inscrire mon enfant" },
            { icon: GraduationCap, title: "Choisissez un éducateur", text: "Filtrez par matière, jour et quartier.", href: "/parent/educateurs", cta: "Voir le catalogue" },
            { icon: ClipboardCheck, title: "Suivez les séances", text: "Confirmez chaque compte rendu." },
          ].map((s, i) => (
            <Card key={s.title}>
              <div className="flex items-center justify-between">
                <IconTile icon={s.icon} />
                <span className="text-sm font-semibold text-slate-300">0{i + 1}</span>
              </div>
              <p className="mt-4 font-semibold text-ink">{s.title}</p>
              <p className="mt-1 text-sm text-slate-500">{s.text}</p>
              {s.href && (
                <LinkButton href={s.href} variant={i === 0 ? "primary" : "secondary"} className="mt-5">
                  {s.cta}
                </LinkButton>
              )}
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Tableau de bord" title={`Bonjour ${user.firstName}`} subtitle="Le suivi scolaire de vos enfants, en un coup d'œil." />
      {toConfirm.length > 0 && (
        <div className="mb-6">
          <Notice
            tone="amber"
            icon={ClipboardCheck}
            title={`${toConfirm.length} séance${toConfirm.length > 1 ? "s" : ""} à confirmer`}
            action={<LinkButton href={`/parent/tutorats/${toConfirm[0].tutoringId}`} variant="secondary" size="sm">Voir</LinkButton>}
          >
            Confirmez que la séance a eu lieu, ou signalez un problème.
          </Notice>
        </div>
      )}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Enfants" value={childrenCount} icon={Smile} href="/parent/enfants" />
        <Stat label="Tutorats en cours" value={activeTutorings.length} icon={BookOpenCheck} href="/parent/tutorats" tone="green" />
        <Stat label="À confirmer" value={toConfirm.length} icon={ClipboardCheck} href="/parent/tutorats" tone="amber" />
        <Stat
          label="Prochaine échéance"
          value={next ? formatFcfa(next.amount) : "—"}
          hint={next ? `avant le ${formatDate(next.dueDate)}` : "Rien à payer"}
          icon={CreditCard}
          href="/parent/paiements"
          tone="slate"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Tutorats en cours" action={<TextLink href="/parent/educateurs">Nouveau</TextLink>}>
          {activeTutorings.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun tutorat en cours. Choisissez un éducateur dans le catalogue.</p>
          ) : (
            <List>
              {activeTutorings.map((t) => (
                <ListRow
                  key={t.id}
                  href={`/parent/tutorats/${t.id}`}
                  leading={<Avatar name={fullName(t.educator.user)} documentId={t.educator.documents[0]?.id} size={40} />}
                  title={fullName(t.child)}
                  meta={
                    <>
                      avec {fullName(t.educator.user)}
                      <span className="mt-0.5 flex items-center gap-1 text-slate-400">
                        <CalendarClock className="size-3.5" aria-hidden /> {t.slotsLabel}
                      </span>
                    </>
                  }
                />
              ))}
            </List>
          )}
        </Card>
        <Card title="Échéances à venir" action={<TextLink href="/parent/paiements">Tout voir</TextLink>}>
          {nextInstallments.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune échéance en attente.</p>
          ) : (
            <List>
              {nextInstallments.map((i) => (
                <ListRow
                  key={i.id}
                  title={formatFcfa(i.amount)}
                  meta={`${fullName(i.tutoring.child)} · avant le ${formatDate(i.dueDate)}`}
                  trailing={<InstallmentBadge status={i.status} overdue={i.dueDate < now} />}
                />
              ))}
            </List>
          )}
        </Card>
      </div>
    </>
  );
}
