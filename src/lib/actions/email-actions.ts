"use server";

import { assertAdmin } from "@/lib/auth/authorization";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getSmtpConfig, SmtpClient, SendMailResult } from "@/lib/email/smtp-client";
import { generateReleaseEmailHtml } from "@/lib/email/release-email-template";
import { logAuditEvent } from "@/lib/audit/audit-logger";

export interface BroadcastSummary {
  configuredSender: string;
  isBroadcastEnabled: boolean;
  hasSmtpPassword: boolean;
  totalRegisteredUsers: number;
  sampleRecipients: string[];
}

export async function getBroadcastSettingsSummary(): Promise<BroadcastSummary> {
  const config = getSmtpConfig();
  let totalUsers = 0;
  let sampleRecipients: string[] = [];

  try {
    const serviceSupabase = getServiceSupabase();
    if (serviceSupabase) {
      const { data: authData } = await serviceSupabase.auth.admin.listUsers();
      const users = (authData?.users || []) as Array<{ email?: string }>;
      totalUsers = users.length;
      sampleRecipients = users
        .map((u: { email?: string }) => u.email)
        .filter((e: string | undefined): e is string => Boolean(e))
        .slice(0, 5);
    }
  } catch {
    // If running in isolated test or offline environment
  }

  return {
    configuredSender: config.user,
    isBroadcastEnabled: config.isBroadcastEnabled,
    hasSmtpPassword: Boolean(config.pass),
    totalRegisteredUsers: totalUsers,
    sampleRecipients,
  };
}

export async function getReleaseEmailPreviewAction(version: string = "v1.1") {
  return generateReleaseEmailHtml({
    releaseVersion: version,
    releaseDate: "Octobre 2026",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://validily.vercel.app",
  });
}

export async function executeReleaseEmailBroadcastAction(
  params: { dryRun?: boolean; targetVersion?: string } = {}
): Promise<{ success: boolean; result?: SendMailResult; error?: string }> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return {
        success: false,
        error: adminCheck.error || "Accès refusé. Privilèges administrateur requis.",
      };
    }

    const config = getSmtpConfig();
    const isDryRun = params.dryRun !== false;

    // Hard Safety Gate: If not dry-run, check that broadcasting is explicitly enabled in environment
    if (!isDryRun && !config.isBroadcastEnabled) {
      return {
        success: false,
        error:
          "Envoi bloqué : La diffusion en direct est verrouillée. Activez ENABLE_EMAIL_BROADCAST=true dans vos variables d'environnement une fois le déploiement Git validé.",
      };
    }

    // Retrieve recipient list from Supabase
    let recipientEmails: string[] = [];
    try {
      const serviceSupabase = getServiceSupabase();
      if (serviceSupabase) {
        const { data: authData } = await serviceSupabase.auth.admin.listUsers();
        const users = (authData?.users || []) as Array<{ email?: string }>;
        recipientEmails = users
          .map((u: { email?: string }) => u.email?.trim().toLowerCase())
          .filter((e: string | undefined): e is string => Boolean(e));
      }
    } catch {
      // In isolated test runner without Supabase service role
    }

    // Fallback if testing locally without users
    if (recipientEmails.length === 0) {
      recipientEmails = ["etudiant.igl4@university.tn", "delegate.igl4@university.tn"];
    }

    const { subject, html, text } = generateReleaseEmailHtml({
      releaseVersion: params.targetVersion || "v1.1",
      releaseDate: "Octobre 2026",
    });

    const client = new SmtpClient();
    const result = await client.send({
      to: recipientEmails,
      subject,
      html,
      text,
      dryRun: isDryRun,
    });

    logAuditEvent({
      actor_id: adminCheck.user?.id || "admin",
      action: "ANNOUNCEMENT_BROADCAST",
      target_type: "announcement",
      target_id: "release-announcement",
      metadata: {
        recipientsCount: result.recipientsCount,
        isDryRun: result.isDryRun,
        messageId: result.messageId,
      },
    });

    return {
      success: result.success,
      result,
      error: result.error,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erreur lors de la diffusion de l'annonce par email.",
    };
  }
}
