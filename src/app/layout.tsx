import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "validily-IGL4 — University Academic Library & Revision Platform",
  description:
    "Organized university revision materials by semester, subject, and resource category. Lecture notes, exams, labs, cheat sheets, and progress tracking for software engineering.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <head>
        <script
          id="validily-intro-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=window.location.search;var p=new URLSearchParams(s).get('intro');var l=sessionStorage.getItem('validily_login_event')==='true';var c=document.cookie.indexOf('validily_intro_pending=1')!==-1;var r=p==='replay'||p==='true'||p==='hold';var pl=sessionStorage.getItem('validily_intro_played')==='true';var init=sessionStorage.getItem('validily_session_initialized');if(r||l||c||(!pl&&!init)){document.documentElement.classList.add('validily-intro-holding');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#F4F6FA] text-[#182235] antialiased">
        {children}
      </body>
    </html>
  );
}
