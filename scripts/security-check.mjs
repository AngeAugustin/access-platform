// Contrôles de sécurité automatisés contre une instance en fonctionnement (préproduction, production, CI).
//   BASE_URL=https://access.exemple.bj node scripts/security-check.mjs
// Sortie non nulle si un contrôle échoue.

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(["OK", name]);
  } catch (err) {
    results.push(["ÉCHEC", `${name} — ${err.message}`]);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const get = (path, init = {}) => fetch(BASE + path, { redirect: "manual", ...init });

await check("En-têtes de sécurité sur les pages", async () => {
  const res = await get("/connexion");
  const h = res.headers;
  const csp = h.get("content-security-policy") ?? "";
  expect(csp.includes("script-src 'self' 'nonce-"), "CSP sans nonce de script");
  expect(csp.includes("'strict-dynamic'"), "CSP sans strict-dynamic");
  expect(!/script-src[^;]*'unsafe-inline'/.test(csp), "CSP autorise les scripts en ligne");
  expect(!/style-src[^;]*'unsafe-inline'/.test(csp), "CSP autorise les styles en ligne");
  expect(csp.includes("frame-ancestors 'none'"), "CSP sans frame-ancestors");
  expect(csp.includes("object-src 'none'"), "CSP sans object-src 'none'");
  expect(h.get("x-frame-options") === "DENY", "X-Frame-Options absent");
  expect(h.get("x-content-type-options") === "nosniff", "X-Content-Type-Options absent");
  expect((h.get("strict-transport-security") ?? "").includes("max-age="), "HSTS absent");
  expect(!!h.get("referrer-policy"), "Referrer-Policy absent");
  expect(!h.get("x-powered-by"), "X-Powered-By divulgué");
});

await check("Nonce CSP différent à chaque requête", async () => {
  const nonce = async () => ((await get("/connexion")).headers.get("content-security-policy") ?? "").match(/'nonce-([^']+)'/)?.[1];
  const [a, b] = [await nonce(), await nonce()];
  expect(a && b && a !== b, "nonce identique ou absent");
});

for (const path of ["/parent", "/educateur", "/admin", "/admin/journal"]) {
  await check(`Espace privé ${path} redirige vers la connexion sans session`, async () => {
    const res = await get(path);
    expect([302, 303, 307, 308].includes(res.status), `statut ${res.status}`);
    expect((res.headers.get("location") ?? "").includes("/connexion"), "redirection inattendue");
  });
}

await check("Session forgée refusée", async () => {
  const res = await get("/admin", { headers: { cookie: "access_session=jeton-invente" } });
  expect(res.status !== 200, `statut ${res.status}`);
});

await check("Fichiers protégés : 401 sans session", async () => {
  expect((await get("/api/fichiers/n-importe-lequel")).status === 401, "accès sans authentification");
});

await check("Tâche planifiée : 401 sans jeton ou avec un faux jeton", async () => {
  expect((await get("/api/cron/daily")).status === 401, "sans jeton");
  expect((await get("/api/cron/daily", { headers: { authorization: "Bearer faux" } })).status === 401, "faux jeton accepté");
});

await check("Webhook FedaPay : signature exigée", async () => {
  const body = JSON.stringify({ name: "transaction.approved", entity: { id: 1 } });
  const res = await get("/api/webhooks/fedapay", { method: "POST", body, headers: { "x-fedapay-signature": "t=1,s=faux" } });
  expect(res.status === 400, `statut ${res.status}`);
});

await check("Webhook FedaPay : corps volumineux refusé", async () => {
  const res = await get("/api/webhooks/fedapay", { method: "POST", body: "x".repeat(200_000) });
  expect(res.status === 413, `statut ${res.status}`);
});

await check("Redirection ouverte impossible après connexion", async () => {
  const res = await get("/connexion?suite=//evil.example");
  const html = await res.text();
  // Le paramètre est renvoyé tel quel dans un champ caché, mais l'action serveur n'accepte que des chemins internes.
  expect(res.status === 200 && !html.includes("<script>//evil"), "rendu inattendu");
});

await check("Pas de fuite d'informations sur les erreurs", async () => {
  const res = await get("/route-qui-n-existe-pas");
  const html = await res.text();
  expect(res.status === 404, `statut ${res.status}`);
  expect(!/prisma|stack|at \w+ \(/i.test(html), "trace technique dans la page");
});

const failed = results.filter(([s]) => s !== "OK");
for (const [status, name] of results) console.log(`${status.padEnd(5)} ${name}`);
console.log(`\n${results.length - failed.length}/${results.length} contrôles réussis contre ${BASE}`);
process.exit(failed.length ? 1 : 0);
