import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteIntroOverlay } from "@/components/brand/site-intro-overlay";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://validily-igl-4.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "validily-IGL4 — University Academic Library & Revision Platform",
    template: "%s | validily-IGL4",
  },
  description:
    "Plateforme universitaire collaborative de révision pour le génie logiciel (IGL4). Cours, devoirs surveillés, examens corrigés, travaux dirigés, quiz interactifs et suivi de révision.",
  applicationName: "validily-IGL4",
  keywords: [
    "validily",
    "validily-igl-4",
    "validily igl4",
    "validity-igl-4",
    "IGL4",
    "FST",
    "génie logiciel",
    "software engineering revision",
    "cours et examens",
    "revision universitaire",
    "academic revision",
    "bibliotheque academique",
    "devoirs surveilles",
    "examens corriges",
    "quizzes interactifs",
    "forest focus",
  ],
  authors: [{ name: "validily-IGL4 Community" }],
  creator: "validily-IGL4",
  publisher: "validily-IGL4",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "validily-IGL4",
    title: "validily-IGL4 — University Academic Library & Revision Platform",
    description:
      "Accédez aux ressources organisées par semestre et matière : cours, examens corrigés, devoirs surveillés, quiz interactifs et suivi de révision en génie logiciel.",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "validily-IGL4 Academic Revision Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "validily-IGL4 — University Academic Library & Revision Platform",
    description:
      "Plateforme collaborative de révision : cours, examens, travaux dirigés et quiz pour étudiants en génie logiciel.",
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  verification: {
    google: "google13e3042a0a58aebc",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "validily-IGL4",
  alternateName: ["validity-igl-4", "validily igl4", "Validily Academic Platform"],
  url: siteUrl,
  logo: `${siteUrl}/logo.svg`,
  description:
    "Plateforme universitaire collaborative de révision académique pour le génie logiciel : cours, examens, travaux dirigés et quiz interactifs.",
  educationalCredentialAwarded: "Génie Logiciel (Software Engineering)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#F4F6FA] text-[#182235] antialiased">
        <SiteIntroOverlay />
        {children}
      </body>
    </html>
  );
}
