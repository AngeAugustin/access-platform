import { TIME_SLOTS, WEEKDAYS, type TimeSlotKey, type WeekdayKey } from "@/lib/constants";
import { cx } from "@/components/ui";

type Slot = { day: WeekdayKey; slot: TimeSlotKey };

const days = Object.keys(WEEKDAYS) as WeekdayKey[];
const slots = Object.keys(TIME_SLOTS) as TimeSlotKey[];

// Semaine type d'un éducateur : créneaux proposés, et parmi eux ceux déjà réservés par un accompagnement.
export function AvailabilityGrid({ availabilities, booked }: { availabilities: Slot[]; booked: Slot[] }) {
  const has = (list: Slot[], day: WeekdayKey, slot: TimeSlotKey) => list.some((s) => s.day === day && s.slot === slot);
  return (
    <div className="scroll-x -mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[460px] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="w-16" />
            {days.map((d) => (
              <th key={d} scope="col" className="pb-1 font-medium text-slate-500">
                <abbr title={WEEKDAYS[d]} className="no-underline">
                  {WEEKDAYS[d].slice(0, 3)}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s}>
              <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap text-slate-500">
                {TIME_SLOTS[s]}
              </th>
              {days.map((d) => {
                const taken = has(booked, d, s);
                const free = !taken && has(availabilities, d, s);
                return (
                  <td key={d}>
                    <span
                      className={cx(
                        "block rounded-lg py-2 font-medium",
                        taken ? "bg-slate-100 text-slate-400 line-through" : free ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset" : "bg-slate-50/60 text-transparent",
                      )}
                    >
                      {taken ? "Pris" : free ? "Libre" : "·"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AvailabilityLegend() {
  return (
    <div className="flex gap-3 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-emerald-400" aria-hidden />
        Libre
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-slate-300" aria-hidden />
        Déjà pris
      </span>
    </div>
  );
}
