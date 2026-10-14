import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fbfbfa] flex flex-col justify-between p-6">
      <div className="max-w-md w-full mx-auto">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto">{children}</div>

      <div className="text-center text-xs text-stone-400 py-4 font-mono">
        Validily • IGL4 Academic Revision Platform
      </div>
    </div>
  );
}
