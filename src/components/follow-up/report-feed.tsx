import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { OCCURRENCE_RESULTS, TASK_KINDS, type TaskKind } from "@/lib/constants";
import { occurrenceState, readGrades } from "@/lib/follow-up";
import { Badge, cx } from "@/components/ui";
import { kindIcons, kindTones } from "./kind";

export type FeedOccurrence = {
  id: string;
  date: Date;
  dueAt: Date;
  status: string;
  comment: string | null;
  grades: unknown;
  reportedAt: Date | null;
  parentSeenAt: Date | null;
  parentComment: string | null;
  child: { firstName: string };
  task: { kind: TaskKind; title: string };
  photos: { id: string }[];
};

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Porto-Novo", hour: "2-digit", minute: "2-digit" });
const stateBadges = {
  todo: ["blue", "À venir"],
  late: ["amber", "En attente du retour"],
  missed: ["red", "Pas de retour"],
  DONE: ["green", OCCURRENCE_RESULTS.DONE],
  PARTIAL: ["amber", OCCURRENCE_RESULTS.PARTIAL],
  NOT_DONE: ["red", OCCURRENCE_RESULTS.NOT_DONE],
} as const;

// Fil des retours d'un suivi, regroupés par jour (le plus récent en premier).
export function ReportFeed({ occurrences, now, footer }: { occurrences: FeedOccurrence[]; now: Date; footer?: (o: FeedOccurrence) => ReactNode }) {
  const days = new Map<string, FeedOccurrence[]>();
  for (const o of occurrences) {
    const key = o.date.toISOString().slice(0, 10);
    days.set(key, [...(days.get(key) ?? []), o]);
  }
  return (
    <div className="space-y-6">
      {[...days.entries()].map(([key, items]) => {
        const label = dayFmt.format(items[0].date);
        return (
          <section key={key}>
            <h3 className="mb-2 text-13px font-semibold text-slate-500">{label.charAt(0).toUpperCase() + label.slice(1)}</h3>
            <ul className="space-y-2.5">
              {items.map((o) => {
                const state = occurrenceState(o, now);
                const [tone, text] = stateBadges[state];
                const Icon = kindIcons[o.task.kind];
                const grades = readGrades(o.grades);
                return (
                  <li key={o.id} className="rounded-2xl border border-slate-200/80 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl", kindTones[o.task.kind])} aria-hidden>
                        <Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">
                            {o.child.firstName} · {o.task.title || TASK_KINDS[o.task.kind]}
                          </p>
                          <Badge tone={tone}>{text}</Badge>
                        </div>
                        {o.reportedAt && <p className="text-xs text-slate-400">Retour à {timeFmt.format(o.reportedAt)}</p>}
                        {o.comment && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-600">{o.comment}</p>}
                        {grades.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {grades.map((g, i) => (
                              <li key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-13px text-slate-700">
                                {g.subject} <span className="font-semibold text-ink tabular-nums">{String(g.score).replace(".", ",")}</span>/{g.outOf}
                              </li>
                            ))}
                          </ul>
                        )}
                        {o.photos.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {o.photos.map((p) => (
                              <a key={p.id} href={`/api/fichiers/${p.id}`} target="_blank" rel="noopener" className="block size-20 overflow-hidden rounded-xl bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element -- fichier privé servi avec contrôle d'accès */}
                                <img src={`/api/fichiers/${p.id}`} alt={`Photo · ${o.child.firstName}`} className="size-full object-cover" loading="lazy" />
                              </a>
                            ))}
                          </div>
                        )}
                        {o.parentComment && (
                          <p className="mt-3 flex gap-2 rounded-xl bg-brand-50 p-2.5 text-13px text-brand-900">
                            <MessageCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {o.parentComment}
                          </p>
                        )}
                        {footer?.(o)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
