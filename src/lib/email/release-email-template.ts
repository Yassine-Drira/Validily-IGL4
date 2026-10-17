/**
 * VALIDILY-IGL4 — Premium Release Announcement Email Template
 * 
 * Aesthetic: Dark slate & emerald luxury engineering design.
 * Strict Constraint: Zero cheap AI emojis. Clean typographic badges and geometric accents only.
 */

export interface ReleaseEmailOptions {
  recipientName?: string;
  releaseVersion?: string;
  releaseDate?: string;
  siteUrl?: string;
  customPillars?: Array<{
    title: string;
    badge: string;
    description: string;
    badgeColor?: string;
    borderColor?: string;
  }>;
}

export function generateReleaseEmailHtml(options: ReleaseEmailOptions = {}): {
  subject: string;
  html: string;
  text: string;
} {
  const version = options.releaseVersion || "v1.1";
  const dateStr = options.releaseDate || "Octobre 2026";
  const baseUrl = options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://validily.vercel.app";
  const recipientGreeting = options.recipientName ? `Bonjour ${options.recipientName},` : "Bonjour,";

  const pillars = options.customPillars || [
    {
      title: "Partage & Arborescence de Ressources",
      badge: "ORGANISATION",
      description:
        "Classement hiérarchique par matière, gestion fluide des dossiers et recherche instantanée de supports académiques.",
      badgeColor: "#38bdf8",
      borderColor: "#0284c7",
    },
    {
      title: "Nouveaux Formats d'Apprentissage",
      badge: "MULTIMÉDIA",
      description:
        "Intégration de quiz interactifs HTML en bac à sable sécurisé, visionneuse PDF haute performance et fiches de synthèse.",
      badgeColor: "#a78bfa",
      borderColor: "#7c3aed",
    },
    {
      title: "Système de Vote Communautaire",
      badge: "ENTRAIDE",
      description:
        "Mise en valeur collaborative des meilleures fiches de révision de la promotion IGL4 grâce à un barème de vote par les pairs.",
      badgeColor: "#fbbf24",
      borderColor: "#d97706",
    },
    {
      title: "Focus Hub & Audio Persistant",
      badge: "IMMERSION",
      description:
        "Minuteur Pomodoro synchronisé avec diffusion audio Lo-Fi ininterrompue lors de la navigation inter-pages.",
      badgeColor: "#34d399",
      borderColor: "#059669",
    },
    {
      title: "Focus Forest & Bosquet Interactif",
      badge: "PROGRESSION",
      description:
        "Historique immuable de vos sessions de travail, matérialisation d'arbres virtuels et encouragements en temps réel entre camarades.",
      badgeColor: "#4ade80",
      borderColor: "#16a34a",
    },
    {
      title: "Performance & Architecture Zéro Quota",
      badge: "OPTIMISATION",
      description:
        "Temps de réponse inférieur à 200ms, mise en cache mémoire optimisée et préservation rigoureuse des ressources d'hébergement.",
      badgeColor: "#22d3ee",
      borderColor: "#0891b2",
    },
  ];

  const subject = `Validily IGL4 — Mise à jour officielle (${version})`;

  const text = `${recipientGreeting}

Une nouvelle version de VALIDILY-IGL4 (${version}) est disponible pour l'ensemble des étudiants de la promotion IGL4.

Nouveautés majeures :
${pillars.map((p) => `- [${p.badge}] ${p.title} : ${p.description}`).join("\n")}

Accédez à votre espace de travail : ${baseUrl}/my-space

--
Promotion IGL4 — Plateforme Académique & Révision Collaborative
Contact : validely.app@gmail.com
`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <!-- Outer Wrapper Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0f19; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px 60px 16px;">
        
        <!-- Main Email Container (Max 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Brand Header Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #064e3b 0%, #065f46 50%, #0f766e 100%); padding: 24px 32px; border-bottom: 1px solid #047857;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase;">
                      VALIDILY<span style="color: #34d399; margin-left: 2px;">•</span><span style="font-size: 14px; font-weight: 600; color: #a7f3d0; margin-left: 4px;">IGL4</span>
                    </span>
                    <div style="font-size: 11px; font-weight: 500; color: #d1fae5; margin-top: 3px; letter-spacing: 0.3px;">
                      UNIVERSITÉ • PLATEFORME ACADÉMIQUE DE RÉVISION
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(6, 78, 59, 0.8); border: 1px solid #34d399; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ecfdf5; letter-spacing: 0.5px;">
                      ${version}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="padding: 36px 32px 24px 32px; background-color: #111827;">
              <div style="display: inline-block; padding: 3px 9px; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; font-size: 11px; font-weight: 700; color: #10b981; letter-spacing: 0.6px; margin-bottom: 16px; text-transform: uppercase;">
                COMMUNIQUÉ DE PUBLICATION
              </div>
              <h1 style="margin: 0 0 14px 0; font-size: 24px; font-weight: 700; line-height: 1.3; color: #ffffff; letter-spacing: -0.4px;">
                Une nouvelle dimension pour vos révisions universitaires.
              </h1>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                ${recipientGreeting} Nous avons le plaisir de vous annoncer le déploiement de la version <strong style="color: #ffffff;">${version}</strong> de Validily-IGL4. Cette mise à jour intègre des outils structurés pour consolider votre travail individuel et vos révisions collectives.
              </p>
            </td>
          </tr>

          <!-- Subtle Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #1f2937;"></div>
            </td>
          </tr>

          <!-- Pillars Grid Section -->
          <tr>
            <td style="padding: 28px 32px 32px 32px; background-color: #111827;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 18px;">
                CAPACITÉS & OPTIMISATIONS DÉPLOYÉES
              </div>

              <!-- Feature Cards -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                ${pillars
                  .map(
                    (pillar) => `
                <tr>
                  <td style="padding-bottom: 14px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1e293b; border: 1px solid #334155; border-left: 3px solid ${
                      pillar.borderColor || "#10b981"
                    }; border-radius: 8px; padding: 14px 16px;">
                      <tr>
                        <td>
                          <div style="margin-bottom: 5px;">
                            <span style="display: inline-block; padding: 2px 7px; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; font-size: 9px; font-weight: 700; color: ${
                              pillar.badgeColor || "#38bdf8"
                            }; letter-spacing: 0.5px; text-transform: uppercase; margin-right: 6px;">
                              ${pillar.badge}
                            </span>
                            <span style="font-size: 14px; font-weight: 600; color: #f8fafc;">
                              ${pillar.title}
                            </span>
                          </div>
                          <div style="font-size: 12px; line-height: 1.5; color: #94a3b8;">
                            ${pillar.description}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`
                  )
                  .join("")}
              </table>

              <!-- Call To Action Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                          <a href="${baseUrl}/my-space" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">
                            Accéder à Validily IGL4 &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #0b0f19; padding: 28px 32px; border-top: 1px solid #1f2937;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="font-size: 11px; line-height: 1.6; color: #64748b;">
                    <strong style="color: #94a3b8;">Validily IGL4</strong> — Promotion IGL4, Génie Logiciel.<br>
                    Ce message vous est adressé en tant qu'étudiant inscrit avec votre adresse universitaire.<br>
                    Contact d'administration & support : <a href="mailto:validely.app@gmail.com" style="color: #10b981; text-decoration: none;">validely.app@gmail.com</a>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top: 14px; font-size: 10px; color: #475569;">
                    Date d'émission : ${dateStr} • Version officielle vérifiée : ${version} • Hébergement cloud certifié.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Main Container -->

      </td>
    </tr>
  </table>

</body>
</html>`;

  return { subject, html, text };
}
