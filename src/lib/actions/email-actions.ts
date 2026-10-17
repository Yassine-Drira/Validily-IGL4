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
  const authCheck = await assertAdmin();
  if (!authCheck.authorized) {
    return {
      configuredSender: "",
      isBroadcastEnabled: false,
      hasSmtpPassword: false,
      totalRegisteredUsers: 0,
      sampleRecipients: [],
    };
  }

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

import { getDistributedJson, setDistributedJson } from "@/lib/kv/redis";

export interface CustomEmailTemplate {
  subject: string;
  html: string;
  text?: string;
  updatedAt?: string;
}

export async function getCustomEmailTemplateAction(): Promise<CustomEmailTemplate | null> {
  const adminCheck = await assertAdmin();
  if (!adminCheck.authorized) return null;

  try {
    const saved = await getDistributedJson<CustomEmailTemplate>("global:custom_email_broadcast_template");
    if (saved && saved.html) return saved;
  } catch {}

  return null;
}

export async function saveCustomEmailTemplateAction(data: {
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  const adminCheck = await assertAdmin();
  if (!adminCheck.authorized) {
    return { success: false, error: "Privilèges administrateur requis." };
  }

  try {
    const template: CustomEmailTemplate = {
      subject: data.subject.trim() || "Validily IGL4 — Annonce Officielle",
      html: data.html.trim(),
      text: data.text?.trim() || data.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      updatedAt: new Date().toISOString(),
    };
    await setDistributedJson("global:custom_email_broadcast_template", template);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function resetCustomEmailTemplateAction(): Promise<{
  success: boolean;
  defaultTemplate: { subject: string; html: string; text: string };
}> {
  const adminCheck = await assertAdmin();
  const defaultTemplate = generateReleaseEmailHtml({
    releaseVersion: "v1.1",
    releaseDate: "Octobre 2026",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://validily.vercel.app",
  });

  if (!adminCheck.authorized) {
    return { success: false, defaultTemplate };
  }

  try {
    await setDistributedJson("global:custom_email_broadcast_template", null);
  } catch {}

  return { success: true, defaultTemplate };
}

export async function getReleaseEmailPreviewAction(version: string = "v1.1") {
  // Check if admin has saved a custom HTML template in distributed Redis
  try {
    const custom = await getDistributedJson<CustomEmailTemplate>("global:custom_email_broadcast_template");
    if (custom && custom.html) {
      return {
        subject: custom.subject,
        html: custom.html,
        text: custom.text || custom.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        isCustom: true,
      };
    }
  } catch {}

  const standard = generateReleaseEmailHtml({
    releaseVersion: version,
    releaseDate: "Octobre 2026",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://validily.vercel.app",
  });

  return {
    ...standard,
    isCustom: false,
  };
}

export async function executeReleaseEmailBroadcastAction(
  params: {
    dryRun?: boolean;
    targetVersion?: string;
    customSubject?: string;
    customHtml?: string;
    customText?: string;
  } = {}
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

    let subject: string;
    let html: string;
    let text: string;

    if (params.customHtml && params.customHtml.trim().length > 10) {
      html = params.customHtml.trim();
      subject = params.customSubject?.trim() || "Validily IGL4 — Annonce Officielle";
      text =
        params.customText?.trim() ||
        html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      // Check if custom template is saved
      const saved = await getDistributedJson<CustomEmailTemplate>("global:custom_email_broadcast_template");
      if (saved && saved.html) {
        html = saved.html;
        subject = params.customSubject?.trim() || saved.subject;
        text = saved.text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      } else {
        const generated = generateReleaseEmailHtml({
          releaseVersion: params.targetVersion || "v1.1",
          releaseDate: "Octobre 2026",
        });
        subject = params.customSubject?.trim() || generated.subject;
        html = generated.html;
        text = generated.text;
      }
    }

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
        subject,
        isCustomHtml: Boolean(params.customHtml),
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
