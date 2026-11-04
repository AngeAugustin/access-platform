import Link from "next/link";
import {
  Ban,
  BookOpen,
  Check,
  CircleAlert,
  FileClock,
  FileText,
  KeyRound,
  Lock,
  LockOpen,
  LogIn,
  Mail,
  PauseCircle,
  Send,
  Settings2,
  ShieldAlert,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/constants";
import { formatFcfa, fullName } from "@/lib/format";
import {
  AUDIT_CATEGORIES,
  actionsFor,
  describeAudit,
  type AuditIcon,
} from "@/lib/audit-labels";
import { EmptyState, IconTile, PageHeader, Stat, cx } from "@/components/ui";
import { SearchBar, userSearch } from "@/components/admin/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { paginate } from "@/lib/pagination";

export const metadata = { title: "Journal d'audit" };

const PAGE_SIZE = 50;
const TZ = "Africa/Porto-Novo";
const DAY_MS = 24 * 60 * 60 * 1000;

const ICONS: Record<AuditIcon, LucideIcon> = {
  login: LogIn,
  lock: Lock,
  unlock: LockOpen,
  key: KeyRound,
  user: UserRound,
  ban: Ban,
  file: FileText,
  check: Check,
  x: X,
  book: BookOpen,
  pause: PauseCircle,
  wallet: Wallet,
  send: Send,
  alert: CircleAlert,
  settings: Settings2,
  mail: Mail,
};

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const shortDay = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});
const shortDayYear = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const time = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

type Filter = keyof typeof AUDIT_CATEGORIES;
type Target = { label: string; href?: string };
type Person = {
  id: string;
  firstName: string;
  lastName: string;
  role: keyof typeof ROLE_LABELS;
  educatorProfile: { id: string } | null;
  tutorProfile?: { id: string } | null;
};

function personHref(p: Person) {
  if (p.role === "PARENT") return `/admin/parents/${p.id}`;
  if (p.role === "EDUCATOR" && p.educatorProfile)
    return `/admin/educateurs/${p.educatorProfile.id}`;
  if (p.role === "TUTOR" && p.tutorProfile) return `/admin/tuteurs/${p.tutorProfile.id}`;
  return "/admin/administrateurs";
}

// Adresse IPv4 écrite en notation IPv6 (« ::ffff:1.2.3.4 ») ramenée à sa forme courante.
function displayIp(ip: string) {
  const plain = ip.replace(/^::ffff:/, "");
  return plain === "::1" || plain === "127.0.0.1"
    ? "Poste local"
    : `IP ${plain}`;
}

// Nom et lien de l'objet de chaque événement, chargés par type en une requête chacun.
async function resolveTargets(
  logs: { entityType: string; entityId: string | null; metadata: unknown }[],
) {
  const ids = (type: string) => [
    ...new Set(
      logs
        .filter((l) => l.entityType === type && l.entityId)
        .map((l) => l.entityId!),
    ),
  ];
  const person = {
    id: true,
    firstName: true,
    lastName: true,
    role: true,
    educatorProfile: { select: { id: true } },
    tutorProfile: { select: { id: true } },
  } as const;
  const [
    users,
    profiles,
    tutorings,
    lessons,
    installments,
    payments,
    payouts,
    complaints,
  ] = await Promise.all([
    db.user.findMany({ where: { id: { in: ids("User") } }, select: person }),
    db.educatorProfile.findMany({
      where: { id: { in: ids("EducatorProfile") } },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    db.tutoring.findMany({
      where: { id: { in: ids("Tutoring") } },
      select: {
        id: true,
        reference: true,
        child: { select: { firstName: true, lastName: true } },
      },
    }),
    db.lesson.findMany({
      where: { id: { in: ids("Lesson") } },
      select: {
        id: true,
        tutoring: {
          select: {
            id: true,
            reference: true,
            child: { select: { firstName: true } },
          },
        },
      },
    }),
    db.installment.findMany({
      where: { id: { in: ids("Installment") } },
      select: { id: true, reference: true, amount: true, tutoringId: true },
    }),
    db.payment.findMany({
      where: { id: { in: ids("Payment") } },
      select: {
        id: true,
        amount: true,
        installment: { select: { reference: true, tutoringId: true } },
      },
    }),
    db.payout.findMany({
      where: { id: { in: ids("Payout") } },
      select: {
        id: true,
        netAmount: true,
        educator: {
          select: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    db.complaint.findMany({
      where: { id: { in: ids("Complaint") } },
      select: { id: true, subject: true },
    }),
  ]);
  const map = new Map<string, Target>();
  for (const u of users)
    map.set(`User:${u.id}`, { label: fullName(u), href: personHref(u) });
  for (const p of profiles)
    map.set(`EducatorProfile:${p.id}`, {
      label: fullName(p.user),
      href: `/admin/educateurs/${p.id}`,
    });
  for (const t of tutorings)
    map.set(`Tutoring:${t.id}`, {
      label: `${t.child.firstName} ${t.child.lastName} · ${t.reference}`,
      href: `/admin/tutorats/${t.id}`,
    });
  for (const l of lessons)
    map.set(`Lesson:${l.id}`, {
      label: `Séance de ${l.tutoring.child.firstName} · ${l.tutoring.reference}`,
      href: `/admin/tutorats/${l.tutoring.id}`,
    });
  for (const i of installments)
    map.set(`Installment:${i.id}`, {
      label: `Échéance ${i.reference} · ${formatFcfa(i.amount)}`,
      href: `/admin/tutorats/${i.tutoringId}`,
    });
  for (const p of payments)
    map.set(`Payment:${p.id}`, {
      label: `${formatFcfa(p.amount)} · ${p.installment.reference}`,
      href: `/admin/tutorats/${p.installment.tutoringId}`,
    });
  for (const p of payouts)
    map.set(`Payout:${p.id}`, {
      label: `${formatFcfa(p.netAmount)} à ${fullName(p.educator.user)}`,
      href: "/admin/paiements?onglet=reversements",
    });
  for (const c of complaints)
    map.set(`Complaint:${c.id}`, {
      label: c.subject,
      href: `/admin/reclamations/${c.id}`,
    });
  return (l: {
    entityType: string;
    entityId: string | null;
    metadata: unknown;
  }): Target | null => {
    if (l.entityId && map.has(`${l.entityType}:${l.entityId}`))
      return map.get(`${l.entityType}:${l.entityId}`)!;
    const m = (l.metadata ?? {}) as Record<string, unknown>;
    if (l.entityType === "Subject" && (m.label || m.key))
      return { label: String(m.label ?? m.key), href: "/admin/referentiel" };
    if (l.entityType === "ClassLevel" && m.name)
      return { label: String(m.name), href: "/admin/referentiel" };
    if (l.entityType === "Tariff" && l.entityId)
      return { label: `Classe ${l.entityId}`, href: "/admin/tarifs" };
    if (l.entityType === "Setting")
      return { label: "Commission, durée et échéances", href: "/admin/tarifs" };
    return null;
  };
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; q?: string; page?: string }>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const filter =
    sp.filtre && sp.filtre in AUDIT_CATEGORIES
      ? (sp.filtre as Filter)
      : undefined;
  const q = sp.q?.trim() || undefined;

  // Recherche par personne : ses propres actions et celles qui la concernent.
  const people = q
    ? await db.user.findMany({
        where: userSearch(q),
        select: { id: true, educatorProfile: { select: { id: true } } },
        take: 50,
      })
    : [];
  const personIds = people.flatMap((p) => [
    p.id,
    ...(p.educatorProfile ? [p.educatorProfile.id] : []),
  ]);
  const where = {
    ...(filter ? { action: { in: actionsFor(filter) } } : {}),
    ...(q
      ? {
          OR: [{ actorId: { in: personIds } }, { entityId: { in: personIds } }],
        }
      : {}),
  };

  const now = new Date();
  const todayStart = new Date(`${dayKey.format(now)}T00:00:00+01:00`);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const info = paginate(await db.auditLog.count({ where }), sp.page, PAGE_SIZE);
  const [logs, todayCount, alertCount, loginCount] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            educatorProfile: { select: { id: true } },
            tutorProfile: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: info.skip,
      take: info.take,
    }),
    db.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
    db.auditLog.count({
      where: {
        createdAt: { gte: weekAgo },
        action: { in: actionsFor("alertes") },
      },
    }),
    db.auditLog.count({
      where: { createdAt: { gte: weekAgo }, action: "user.login" },
    }),
  ]);
  const targetOf = await resolveTargets(logs);

  // Jour affiché sur chaque ligne : « Aujourd'hui », « Hier », sinon la date courte (l'année seulement si elle diffère).
  const today = dayKey.format(now);
  const yesterday = dayKey.format(new Date(now.getTime() - DAY_MS));
  const dayOf = (date: Date) => {
    const key = dayKey.format(date);
    if (key === today) return "Aujourd'hui";
    if (key === yesterday) return "Hier";
    return key.slice(0, 4) === today.slice(0, 4)
      ? shortDay.format(date)
      : shortDayYear.format(date);
  };

  const href = (next: { filtre?: Filter | null }) => {
    const params = new URLSearchParams();
    const f = next.filtre === undefined ? filter : next.filtre;
    if (f) params.set("filtre", f);
    if (q) params.set("q", q);
    const s = params.toString();
    return `/admin/journal${s ? `?${s}` : ""}`;
  };
  const chip =
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-13px font-medium transition";

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        subtitle="Qui a fait quoi, et quand. Les alertes signalent les accès suspects et les anomalies de paiement."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Aujourd'hui"
          value={todayCount}
          hint={
            todayCount > 1 ? "événements enregistrés" : "événement enregistré"
          }
          icon={FileClock}
        />
        <Stat
          label="Alertes sur 7 jours"
          value={alertCount}
          hint={
            alertCount > 0
              ? "échecs de connexion, contestations, anomalies"
              : "rien à signaler"
          }
          icon={ShieldAlert}
          tone={alertCount > 0 ? "rose" : "green"}
          href={href({ filtre: "alertes" })}
        />
        <Stat
          label="Connexions sur 7 jours"
          value={loginCount}
          hint="parents, éducateurs et administrateurs"
          icon={LogIn}
          tone="slate"
          href={href({ filtre: "acces" })}
        />
      </div>

      <nav
        aria-label="Type d'événement"
        className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <Link
          href={href({ filtre: null })}
          aria-current={!filter ? "page" : undefined}
          className={cx(
            chip,
            !filter
              ? "bg-ink text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
          )}
        >
          Tout
        </Link>
        {(Object.entries(AUDIT_CATEGORIES) as [Filter, string][]).map(
          ([key, text]) => {
            const on = filter === key;
            const alert = key === "alertes";
            return (
              <Link
                key={key}
                href={href({ filtre: key })}
                aria-current={on ? "page" : undefined}
                className={cx(
                  chip,
                  on
                    ? alert
                      ? "bg-rose-600 text-white"
                      : "bg-ink text-white"
                    : alert
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                )}
              >
                {alert && <ShieldAlert className="size-3.5" aria-hidden />}
                {text}
              </Link>
            );
          },
        )}
      </nav>

      <SearchBar
        q={q}
        placeholder="Rechercher une personne (nom, e-mail, téléphone)"
      >
        {filter && <input type="hidden" name="filtre" value={filter} />}
      </SearchBar>

      {logs.length === 0 ? (
        <EmptyState icon={FileClock} title="Aucun événement">
          {q || filter
            ? "Rien ne correspond à ces critères."
            : "Le journal est encore vide."}
        </EmptyState>
      ) : (
        <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-soft">
          {logs.map((l) => {
            const d = describeAudit(l.action, l.metadata);
            const target = targetOf(l);
            const actor = l.actor
              ? { label: fullName(l.actor), href: personHref(l.actor) }
              : null;
            // Quand la personne agit sur son propre compte (connexion, mot de passe…), on ne la nomme qu'une fois.
            const subject = target ?? actor;
            const by =
              actor && target && actor.label !== target.label ? actor : null;
            return (
              <li
                key={l.id}
                className={cx(
                  "flex gap-3.5 px-4 py-3.5 sm:px-5",
                  d.alert && "bg-rose-50/40",
                )}
              >
                <IconTile icon={ICONS[d.icon]} tone={d.tone} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">
                    <span className="font-semibold">{d.title}</span>
                    {subject && (
                      <>
                        <span className="text-slate-300"> · </span>
                        {subject.href ? (
                          <Link
                            href={subject.href}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {subject.label}
                          </Link>
                        ) : (
                          <span className="font-medium">{subject.label}</span>
                        )}
                      </>
                    )}
                  </p>
                  {d.details && (
                    <p className="mt-0.5 text-13px break-words text-slate-600">
                      {d.details}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                    {by ? (
                      <span>
                        par{" "}
                        <Link
                          href={by.href}
                          className="font-medium text-slate-600 hover:text-brand-700 hover:underline"
                        >
                          {by.label}
                        </Link>
                        {l.actor && (
                          <> ({ROLE_LABELS[l.actor.role].toLowerCase()})</>
                        )}
                      </span>
                    ) : !actor ? (
                      <span>Automatique</span>
                    ) : (
                      <span>{ROLE_LABELS[l.actor!.role]}</span>
                    )}
                    {l.ip && <span>{displayIp(l.ip)}</span>}
                    <span
                      className="hidden font-mono text-slate-300 sm:inline"
                      title="Code technique"
                    >
                      {l.action}
                    </span>
                  </p>
                </div>
                <time
                  dateTime={l.createdAt.toISOString()}
                  className="shrink-0 pt-0.5 text-right tabular-nums"
                >
                  <span className="block text-13px font-medium text-slate-600">
                    {dayOf(l.createdAt)}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {time.format(l.createdAt)}
                  </span>
                </time>
              </li>
            );
          })}
        </ol>
      )}

      <Pagination
        info={info}
        path="/admin/journal"
        params={{ filtre: filter, q }}
        label="événement"
      />
    </>
  );
}
