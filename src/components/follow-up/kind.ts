import { BookOpen, NotebookPen, School, Sparkles, type LucideIcon } from "lucide-react";
import type { TaskKind } from "@/lib/constants";

// Partagé entre composants serveur et client : un module « use client » ne peut pas exporter de données vers le serveur.
export const kindIcons: Record<TaskKind, LucideIcon> = { LESSONS: BookOpen, HOMEWORK: NotebookPen, SCHOOL_VISIT: School, OTHER: Sparkles };
export const kindTones: Record<TaskKind, string> = {
  LESSONS: "bg-brand-50 text-brand-700",
  HOMEWORK: "bg-accent-50 text-accent-700",
  SCHOOL_VISIT: "bg-emerald-50 text-emerald-700",
  OTHER: "bg-slate-100 text-slate-600",
};
