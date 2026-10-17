import test from "node:test";
import assert from "node:assert/strict";

import { generateReleaseEmailHtml } from "../src/lib/email/release-email-template.ts";
import { SmtpClient } from "../src/lib/email/smtp-client.ts";
import { getSmtpConfig } from "../src/lib/email/smtp-config.ts";

test("Email Template: Generates top-tier design adhering to VALIDILY-IGL4 visual chart", () => {
  const result = generateReleaseEmailHtml({
    releaseVersion: "v1.1",
    recipientName: "Amine",
  });

  assert.ok(result.subject.includes("Validily IGL4"));
  assert.ok(result.subject.includes("v1.1"));

  // Check visual chart brand tokens
  assert.ok(result.html.includes("#0b0f19"), "Uses midnight slate background token");
  assert.ok(result.html.includes("#10b981"), "Uses emerald brand accent token");
  assert.ok(result.html.includes("#111827"), "Uses dark container card background");
  assert.ok(result.html.includes("validely.app@gmail.com"), "Features official app email in footer");
  assert.ok(result.html.includes("Bonjour Amine,"), "Includes personalized student greeting");

  // Check the 6 structural pillars
  assert.ok(result.html.includes("Partage & Arborescence de Ressources"));
  assert.ok(result.html.includes("Nouveaux Formats d&#39;Apprentissage") || result.html.includes("Nouveaux Formats d'Apprentissage"));
  assert.ok(result.html.includes("Système de Vote Communautaire"));
  assert.ok(result.html.includes("Focus Hub & Audio Persistant"));
  assert.ok(result.html.includes("Focus Forest & Bosquet Interactif"));
  assert.ok(result.html.includes("Performance & Architecture Zéro Quota"));

  // STRICT REQUIREMENT: ZERO cheap/corny AI emojis
  const cheapAiEmojis = ["🚀", "🔥", "🤖", "🎉", "🥳", "✨", "💡", "💪", "💥"];
  for (const emoji of cheapAiEmojis) {
    assert.strictEqual(
      result.html.includes(emoji),
      false,
      `HTML template must not contain poor AI emoji: ${emoji}`
    );
    assert.strictEqual(
      result.text.includes(emoji),
      false,
      `Text template must not contain poor AI emoji: ${emoji}`
    );
  }
});

test("SMTP Config: Defaults to validely.app@gmail.com and enforces safety gates", () => {
  const config = getSmtpConfig();
  assert.strictEqual(config.user, "validely.app@gmail.com");
  assert.strictEqual(config.fromEmail, "validely.app@gmail.com");
  assert.strictEqual(config.host, "smtp.gmail.com");
  assert.strictEqual(config.port, 465);
  assert.strictEqual(config.secure, true);
});

test("SMTP Client: Dry-run safely validates recipients without opening sockets", async () => {
  const client = new SmtpClient({
    user: "validely.app@gmail.com",
    pass: "", // No password
    isBroadcastEnabled: false, // Broadcasting disabled
  });

  const res = await client.send({
    to: [
      "STUDENT.1@UNIVERSITY.TN",
      "student.1@university.tn ", // duplicate uppercase/whitespace
      "valid.student@gmail.com",
      "invalid-email-address",
    ],
    subject: "Test Subject",
    html: "<p>Hello</p>",
    dryRun: true,
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.isDryRun, true);
  assert.strictEqual(res.recipientsCount, 2, "Deduplicates and cleans emails");
  assert.ok(res.accepted.includes("student.1@university.tn"));
  assert.ok(res.accepted.includes("valid.student@gmail.com"));
  assert.ok(res.rejected.includes("invalid-email-address"));
  assert.ok(res.messageId?.startsWith("<validily-"));
});

test("SMTP Client: Hard safety gate prevents live sending when broadcasting is disabled", async () => {
  const client = new SmtpClient({
    user: "validely.app@gmail.com",
    pass: "fake-pass",
    isBroadcastEnabled: false, // Hard disabled
  });

  // Attempting dryRun: false must be automatically intercepted into dry-run mode
  const res = await client.send({
    to: "student@university.tn",
    subject: "Test Safety Gate",
    html: "<p>Hello</p>",
    dryRun: false,
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.isDryRun, true, "Safety lock overrides live dispatch into dry-run");
  assert.ok(res.details?.includes("Diffusion désactivée par mesure de sécurité"));
});
