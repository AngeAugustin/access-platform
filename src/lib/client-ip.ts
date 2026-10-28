// Détermination de l'adresse IP du client derrière un ou plusieurs proxys de confiance.
//
// Chaque proxy ajoute à droite de X-Forwarded-For l'adresse qui l'a contacté : seules les
// TRUSTED_PROXY_COUNT dernières entrées sont fiables, tout ce qui est à gauche peut être forgé par le client.
// Sans proxy de confiance (TRUSTED_PROXY_COUNT=0), aucun en-tête n'est cru : l'adresse est « inconnue »
// et la limitation de débit repose sur les autres clés (e-mail, compte).

export type ClientIpConfig = {
  // Nombre de proxys de confiance devant l'application (0 = aucun).
  trustedProxyCount: number;
  // En-tête posé par un proxy unique de confiance (ex. cf-connecting-ip, x-real-ip) ; prioritaire s'il est défini.
  ipHeader?: string;
};

const UNKNOWN = "inconnue";

function clean(value: string | undefined | null): string | null {
  const v = value?.trim();
  if (!v || v.length > 64 || !/^[0-9a-fA-F:.]+$/.test(v)) return null;
  return v;
}

export function clientIpFrom(get: (name: string) => string | null, config: ClientIpConfig): string {
  if (config.trustedProxyCount <= 0) return UNKNOWN;
  if (config.ipHeader) return clean(get(config.ipHeader)) ?? UNKNOWN;
  const forwarded = get("x-forwarded-for");
  if (!forwarded) return UNKNOWN;
  const hops = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
  const index = hops.length - config.trustedProxyCount;
  return clean(hops[Math.max(0, index)]) ?? UNKNOWN;
}

export function clientIpConfigFromEnv(): ClientIpConfig {
  const count = Number.parseInt(process.env.TRUSTED_PROXY_COUNT ?? "1", 10);
  return {
    trustedProxyCount: Number.isFinite(count) && count >= 0 ? count : 1,
    ipHeader: process.env.CLIENT_IP_HEADER?.trim().toLowerCase() || undefined,
  };
}
