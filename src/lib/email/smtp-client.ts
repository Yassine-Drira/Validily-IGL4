/**
 * VALIDILY-IGL4 — Native Zero-Dependency SMTP Client
 * 
 * Implements RFC 5321 / RFC 5322 over Node.js TLS (port 465).
 * Supports safe dry-run mode, batching, and automated simulation.
 */

import tls from "node:tls";
import crypto from "node:crypto";

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

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  dryRun?: boolean;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  recipientsCount: number;
  accepted: string[];
  rejected: string[];
  isDryRun: boolean;
  error?: string;
  details?: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class SmtpClient {
  private config: SmtpConfig;

  constructor(customConfig?: Partial<SmtpConfig>) {
    this.config = {
      ...getSmtpConfig(),
      ...customConfig,
    };
  }

  /**
   * Dispatches an email to one or multiple recipients.
   * If dryRun is true, or if broadcasting is disabled in config, performs a safe simulation.
   */
  async send(options: SendMailOptions): Promise<SendMailResult> {
    const rawRecipients = Array.isArray(options.to) ? options.to : [options.to];
    const recipients = Array.from(
      new Set(
        rawRecipients
          .map((r) => r.trim().toLowerCase())
          .filter((r) => EMAIL_REGEX.test(r))
      )
    );

    const rejected = rawRecipients.filter((r) => !EMAIL_REGEX.test(r.trim()));

    if (recipients.length === 0) {
      return {
        success: false,
        recipientsCount: 0,
        accepted: [],
        rejected: rawRecipients,
        isDryRun: Boolean(options.dryRun),
        error: "Aucune adresse de destinataire valide fournie.",
      };
    }

    const messageId = `<validily-${Date.now()}-${crypto.randomBytes(4).toString("hex")}@validely.app>`;

    // Safety Gate: Enforce dry-run if requested OR if live broadcasting is not enabled in environment
    const shouldDryRun =
      options.dryRun !== false ||
      !this.config.isBroadcastEnabled ||
      !this.config.pass;

    if (shouldDryRun) {
      const reason = options.dryRun
        ? "Exécution demandée en mode simulation (Dry-Run)"
        : !this.config.isBroadcastEnabled
        ? "Diffusion désactivée par mesure de sécurité (ENABLE_EMAIL_BROADCAST != true)"
        : "Mot de passe SMTP d'application non configuré";

      return {
        success: true,
        messageId,
        recipientsCount: recipients.length,
        accepted: recipients,
        rejected,
        isDryRun: true,
        details: `Simulation réussie. ${reason}. ${recipients.length} destinataire(s) validé(s).`,
      };
    }

    // Live TLS Dispatch via SMTP over Port 465
    try {
      await this.executeTlsSmtp(recipients, options, messageId);

      return {
        success: true,
        messageId,
        recipientsCount: recipients.length,
        accepted: recipients,
        rejected,
        isDryRun: false,
        details: `Diffusion SMTP en direct effectuée vers ${recipients.length} destinataire(s).`,
      };
    } catch (err: any) {
      return {
        success: false,
        messageId,
        recipientsCount: recipients.length,
        accepted: [],
        rejected: recipients,
        isDryRun: false,
        error: err.message || "Erreur de connexion SMTP.",
      };
    }
  }

  /**
   * Internal TLS SMTP socket dialog (RFC 5321)
   */
  private executeTlsSmtp(
    recipients: string[],
    options: SendMailOptions,
    messageId: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: this.config.host,
          port: this.config.port,
          minVersion: "TLSv1.2",
          timeout: 15000,
        },
        () => {
          // Connected securely
        }
      );

      let buffer = "";
      let step = 0;
      let rcptIndex = 0;

      const cleanup = (err?: Error) => {
        socket.removeAllListeners();
        socket.destroy();
        if (err) reject(err);
      };

      socket.on("timeout", () => {
        cleanup(new Error("Délai d'attente SMTP dépassé (timeout 15s)."));
      });

      socket.on("error", (err) => {
        cleanup(err);
      });

      socket.on("data", (data) => {
        buffer += data.toString("utf8");

        // Process full lines
        while (buffer.includes("\r\n")) {
          const lineEnd = buffer.indexOf("\r\n");
          const line = buffer.substring(0, lineEnd);
          buffer = buffer.substring(lineEnd + 2);

          // Handle multiline replies (e.g. 250-something)
          if (/^\d{3}-/.test(line)) {
            continue;
          }

          const code = parseInt(line.substring(0, 3), 10);

          try {
            switch (step) {
              case 0: // Server greeting (220)
                if (code !== 220) throw new Error(`Salutation SMTP inattendue: ${line}`);
                step = 1;
                socket.write("EHLO validely.app\r\n");
                break;

              case 1: // EHLO response (250)
                if (code !== 250) throw new Error(`EHLO rejeté: ${line}`);
                step = 2;
                socket.write("AUTH LOGIN\r\n");
                break;

              case 2: // Challenge for username (334)
                if (code !== 334) throw new Error(`AUTH LOGIN non supporté: ${line}`);
                step = 3;
                socket.write(Buffer.from(this.config.user).toString("base64") + "\r\n");
                break;

              case 3: // Challenge for password (334)
                if (code !== 334) throw new Error(`Nom d'utilisateur SMTP rejeté: ${line}`);
                step = 4;
                socket.write(Buffer.from(this.config.pass).toString("base64") + "\r\n");
                break;

              case 4: // Auth success (235)
                if (code !== 235) throw new Error(`Authentification SMTP échouée: ${line}`);
                step = 5;
                socket.write(`MAIL FROM:<${this.config.fromEmail}>\r\n`);
                break;

              case 5: // MAIL FROM response (250)
                if (code !== 250) throw new Error(`MAIL FROM rejeté: ${line}`);
                step = 6;
                rcptIndex = 0;
                socket.write(`RCPT TO:<${recipients[0]}>\r\n`);
                break;

              case 6: // RCPT TO response
                if (code !== 250 && code !== 251) {
                  throw new Error(`Destinataire ${recipients[rcptIndex]} rejeté: ${line}`);
                }
                rcptIndex++;
                if (rcptIndex < recipients.length) {
                  socket.write(`RCPT TO:<${recipients[rcptIndex]}>\r\n`);
                } else {
                  step = 7;
                  socket.write("DATA\r\n");
                }
                break;

              case 7: // DATA greeting (354)
                if (code !== 354) throw new Error(`DATA refusé: ${line}`);
                step = 8;

                const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`;
                const dateHeader = new Date().toUTCString();
                const mimeBoundary = `----=_Part_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

                let rawMessage = "";
                rawMessage += `From: "${this.config.fromName}" <${this.config.fromEmail}>\r\n`;
                rawMessage += `Reply-To: <${this.config.replyTo}>\r\n`;
                rawMessage += `To: <undisclosed-recipients:;>\r\n`;
                rawMessage += `Subject: ${encodedSubject}\r\n`;
                rawMessage += `Date: ${dateHeader}\r\n`;
                rawMessage += `Message-ID: ${messageId}\r\n`;
                rawMessage += `MIME-Version: 1.0\r\n`;
                rawMessage += `Content-Type: multipart/alternative; boundary="${mimeBoundary}"\r\n\r\n`;

                // Plain text part
                if (options.text) {
                  rawMessage += `--${mimeBoundary}\r\n`;
                  rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n`;
                  rawMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;
                  rawMessage += Buffer.from(options.text).toString("base64") + "\r\n\r\n";
                }

                // HTML part
                rawMessage += `--${mimeBoundary}\r\n`;
                rawMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
                rawMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;
                rawMessage += Buffer.from(options.html).toString("base64") + "\r\n\r\n";

                rawMessage += `--${mimeBoundary}--\r\n`;
                rawMessage += ".\r\n";

                socket.write(rawMessage);
                break;

              case 8: // Delivery acknowledgement (250)
                if (code !== 250) throw new Error(`Envoi du message échoué: ${line}`);
                step = 9;
                socket.write("QUIT\r\n");
                break;

              case 9: // Quit acknowledgement (221)
                socket.end();
                resolve();
                break;
            }
          } catch (e: any) {
            cleanup(e);
          }
        }
      });
    });
  }
}
