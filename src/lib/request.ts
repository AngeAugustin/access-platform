import "server-only";
import { headers } from "next/headers";
import { clientIpConfigFromEnv, clientIpFrom } from "@/lib/client-ip";

export async function requestInfo() {
  const h = await headers();
  const ip = clientIpFrom((name) => h.get(name), clientIpConfigFromEnv());
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}
