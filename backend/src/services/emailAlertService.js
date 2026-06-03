import axios from "axios";
import { env } from "../config/env.js";

export function isEmailAlertConfigured() {
  return Boolean(env.resendApiKey && env.alertFromEmail);
}

export async function sendEmailAlert({ to, subject, html = "", text = "" }) {
  if (!isEmailAlertConfigured()) {
    return { skipped: true };
  }

  const recipient = String(to || "").trim().toLowerCase();
  const emailSubject = String(subject || "").trim();

  if (!recipient || !emailSubject) {
    return { skipped: true };
  }

  await axios.post(
    "https://api.resend.com/emails",
    {
      from: env.alertFromEmail,
      to: [recipient],
      subject: emailSubject,
      html: html || `<p>${text || emailSubject}</p>`,
      text: text || subject,
      reply_to: env.alertReplyToEmail || undefined
    },
    {
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 10000
    }
  );

  return { skipped: false };
}
