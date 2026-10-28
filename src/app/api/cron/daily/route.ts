import { timingSafeEqual } from "node:crypto";
import { runDailyJobs } from "@/server/services/cron";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Déclenché une fois par jour par le planificateur de l'hébergeur (cron Vercel, crontab, etc.).
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Non autorisé", { status: 401 });
  const result = await runDailyJobs();
  return Response.json({ ok: true, ...result });
}

export const POST = GET;
