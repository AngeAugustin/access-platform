import { isLocked } from "@/lib/auth/lockout";
import {
  ACCOUNT_STATUS,
  INSTALLMENT_STATUS,
  LESSON_STATUS,
  PAYOUT_STATUS,
  PROFILE_STATUS,
  TUTORING_STATUS,
} from "@/lib/constants";
import { Badge } from "@/components/ui";

// État de connexion d'un compte : le verrou après échecs de connexion prime sur le statut.
export function AccountBadge({ status, lockedUntil }: { status: keyof typeof ACCOUNT_STATUS; lockedUntil?: Date | null }) {
  if (status === "ACTIVE" && isLocked(lockedUntil)) return <Badge tone="amber">Verrouillé</Badge>;
  const tone = { ACTIVE: "green", SUSPENDED: "red", DEACTIVATED: "gray" } as const;
  return <Badge tone={tone[status]}>{ACCOUNT_STATUS[status]}</Badge>;
}

export function accountSummary(status: keyof typeof ACCOUNT_STATUS, lockedUntil?: Date | null): string {
  if (status === "SUSPENDED") return "Suspendu · ne peut plus se connecter";
  if (status === "DEACTIVATED") return "Désactivé · compte fermé";
  return isLocked(lockedUntil) ? "Verrouillé · trop d'échecs de connexion" : "Actif · peut se connecter";
}

export function TutoringBadge({ status }: { status: keyof typeof TUTORING_STATUS }) {
  const tone = { ACTIVE: "green", COMPLETED: "gray", STOPPED: "red" } as const;
  return <Badge tone={tone[status]}>{TUTORING_STATUS[status]}</Badge>;
}

export function InstallmentBadge({ status, overdue }: { status: keyof typeof INSTALLMENT_STATUS; overdue?: boolean }) {
  if (status === "PENDING" && overdue) return <Badge tone="red">En retard</Badge>;
  const tone = { PENDING: "amber", PAID: "green", CANCELLED: "gray" } as const;
  return <Badge tone={tone[status]}>{INSTALLMENT_STATUS[status]}</Badge>;
}

export function LessonBadge({ status }: { status: keyof typeof LESSON_STATUS }) {
  const tone = { RECORDED: "amber", CONFIRMED: "green", DISPUTED: "red" } as const;
  return <Badge tone={tone[status]}>{LESSON_STATUS[status]}</Badge>;
}

export function PayoutBadge({ status }: { status: keyof typeof PAYOUT_STATUS }) {
  const tone = { PENDING: "amber", PROCESSING: "blue", DONE: "green", FAILED: "red" } as const;
  return <Badge tone={tone[status]}>{PAYOUT_STATUS[status]}</Badge>;
}

export function ProfileBadge({ status }: { status: keyof typeof PROFILE_STATUS }) {
  const tone = { INCOMPLETE: "gray", SUBMITTED: "amber", VALIDATED: "green", REJECTED: "red" } as const;
  return <Badge tone={tone[status]}>{PROFILE_STATUS[status]}</Badge>;
}
