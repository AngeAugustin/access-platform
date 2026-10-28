import "server-only";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px">
<div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:24px">
<h1 style="font-size:20px;color:#1d4ed8;margin:0 0 16px">Access</h1>
<h2 style="font-size:17px;margin:0 0 12px">${escapeHtml(title)}</h2>${bodyHtml}
<p style="color:#6b7280;font-size:12px;margin-top:24px">Message automatique, merci de ne pas y répondre.</p>
</div></body></html>`;
}

// Envoi via l'API Resend. Sans clé (développement), le message est écrit dans la console.
export async function sendMail(to: string, subject: string, title: string, bodyHtml: string): Promise<void> {
  const html = layout(title, bodyHtml);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mail] RESEND_API_KEY manquante : e-mail non envoyé à", to);
      return;
    }
    console.info(`[mail:dev] À ${to} — ${subject}\n${bodyHtml.replace(/<[^>]+>/g, " ")}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) console.error("[mail] échec d'envoi", res.status, await res.text().catch(() => ""));
}
