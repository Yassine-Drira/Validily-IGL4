import Link from "next/link";
import { Compass, BookOpen, User, FolderArchive, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-[#E4E8F0] rounded-3xl p-8 sm:p-10 text-center shadow-xs space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center mx-auto border border-[#2855D9]/20 font-mono font-bold text-2xl">
          404
        </div>

        <div className="space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FAFAF7] border border-[#E4E8F0] text-[#68748A]">
            validily-IGL4 • Navigation Académique
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111A2E] tracking-tight">
            Page ou Ressource Introuvable
          </h1>
          <p className="text-xs sm:text-sm text-[#68748A] leading-relaxed max-w-sm mx-auto">
            L&apos;élément demandé n&apos;existe pas, a été déplacé ou ses droits d&apos;accès ont été restreints.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Link href="/">
            <Button size="sm" variant="primary" className="w-full text-xs py-2 h-auto flex items-center justify-center space-x-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Accueil</span>
            </Button>
          </Link>
          <Link href="/library">
            <Button size="sm" variant="outline" className="w-full text-xs py-2 h-auto flex items-center justify-center space-x-1.5">
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Bibliothèque</span>
            </Button>
          </Link>
          <Link href="/subjects">
            <Button size="sm" variant="outline" className="w-full text-xs py-2 h-auto flex items-center justify-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Matières</span>
            </Button>
          </Link>
          <Link href="/my-space">
            <Button size="sm" variant="outline" className="w-full text-xs py-2 h-auto flex items-center justify-center space-x-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Mon Espace</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
