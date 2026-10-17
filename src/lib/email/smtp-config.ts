/**
 * VALIDILY-IGL4 — SMTP & Email Service Configuration
 * 
 * Official Sender: validely.app@gmail.com
 * Security: Zero-leakage environment configuration with dry-run safety gates.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  isBroadcastEnabled: boolean;
}

export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER || "validely.app@gmail.com";
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
  const fromName = process.env.SMTP_FROM_NAME || "Validily IGL4";
  const fromEmail = user;
  const replyTo = process.env.SMTP_REPLY_TO || user;
  const isBroadcastEnabled = process.env.ENABLE_EMAIL_BROADCAST === "true";

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    fromName,
    fromEmail,
    replyTo,
    isBroadcastEnabled,
  };
}
