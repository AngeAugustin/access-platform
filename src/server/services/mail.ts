import "server-only";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Gabarit des e-mails : tableaux et styles en ligne, seuls compris par tous les clients de messagerie.
const BLUE = "#004aad";
const ORANGE = "#ff914d";
const INK = "#0f172a";
const TEXT = "#334155";
const MUTED = "#64748b";
const FONT = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const PARAGRAPH = `margin:0 0 16px;${FONT};font-size:15px;line-height:1.6;color:${TEXT}`;

const appUrl = () => process.env.APP_URL ?? "";

// Bouton compatible avec les clients qui ignorent le padding des liens (Outlook).
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr>
<td bgcolor="${BLUE}" style="border-radius:12px">
<a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 26px;${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${escapeHtml(label)}&nbsp;&rarr;</a>
</td></tr></table>`;
}

// Liste d'étapes numérotées, pastilles orange.
export function emailSteps(steps: string[]): string {
  const rows = steps
    .map(
      (step, i) => `<tr>
<td width="40" valign="top" style="padding:0 0 14px">
<div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:${ORANGE};color:#ffffff;text-align:center;${FONT};font-size:13px;font-weight:700">${i + 1}</div>
</td>
<td valign="top" style="padding:4px 0 14px;${FONT};font-size:15px;line-height:1.5;color:${TEXT}">${step}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 12px;background:#f6f8fc;border-radius:14px"><tr><td style="padding:18px 18px 4px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
</td></tr></table>`;
}

// Code à usage unique, mis en évidence.
export function emailCode(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px"><tr>
<td align="center" style="padding:18px;background:#eef5ff;border:1px dashed #80b0f5;border-radius:14px;${FONT};font-size:30px;font-weight:700;letter-spacing:8px;color:${BLUE}">${escapeHtml(code)}</td>
</tr></table>`;
}

function layout(title: string, bodyHtml: string, preheader: string): string {
  const url = appUrl();
  const body = bodyHtml.replace(/<p>/g, `<p style="${PARAGRAPH}">`);
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef2f8">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px">
<tr><td bgcolor="${BLUE}" style="background:${BLUE};border-radius:20px 20px 0 0;padding:28px 32px">
<a href="${escapeHtml(url || "#")}" target="_blank" style="text-decoration:none">
<img src="${escapeHtml(url)}/icons/email-logo.png" width="138" height="60" alt="Access Tutorat" style="display:block;border:0;${FONT};font-size:20px;font-weight:700;color:#ffffff" />
</a>
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${ORANGE}">&nbsp;</td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:0 0 20px 20px;padding:36px 32px 28px">
<h1 style="margin:0 0 20px;${FONT};font-size:24px;line-height:1.25;font-weight:700;color:${INK}">${escapeHtml(title)}</h1>
${body}
<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;${FONT};font-size:14px;line-height:1.6;color:${TEXT}">L'équipe Access Tutorat</p>
</td></tr>
<tr><td align="center" style="padding:24px 16px 0;${FONT};font-size:12px;line-height:1.6;color:${MUTED}">
Access Tutorat · Accompagnement scolaire à domicile · Partout au Bénin<br />
Message automatique, merci de ne pas y répondre.${url ? ` <a href="${escapeHtml(url)}" target="_blank" style="color:${MUTED};text-decoration:underline">Ouvrir Access</a>` : ""}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Envoi via l'API Resend. Sans clé (développement), le message est écrit dans la console.
// `preheader` : aperçu affiché par la messagerie à côté de l'objet (par défaut, le titre).
export async function sendMail(to: string, subject: string, title: string, bodyHtml: string, preheader = title): Promise<void> {
  const html = layout(title, bodyHtml, preheader);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mail] RESEND_API_KEY manquante : e-mail non envoyé à", to);
      return;
    }
    console.info(`[mail:dev] À ${to} : ${subject}\n${bodyHtml.replace(/<[^>]+>/g, " ")}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) console.error("[mail] échec d'envoi", res.status, await res.text().catch(() => ""));
}
