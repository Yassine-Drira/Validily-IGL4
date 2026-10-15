"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock, Mail, AlertCircle } from "lucide-react";
import { ValidilySymbol } from "@/components/brand/validily-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to sign in. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 shadow-xs">
      <div className="text-center mb-6">
        <ValidilySymbol size="lg" className="mx-auto mb-3" />
        <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
          Sign In to validily-IGL4
        </h1>
        <p className="text-xs text-[#68748A] mt-1">
          Access your private uploads, bookmarks, and revision progress
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#182235] mb-1">
            Student Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.tn"
              required
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium text-[#182235]">
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-[11px] text-[#2855D9] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
            />
          </div>
        </div>

        <Button
          type="submit"
          size="md"
          variant="primary"
          disabled={loading}
          className="w-full text-xs"
        >
          {loading ? "Authenticating..." : "Sign In to Workspace"}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-[#E4E8F0] text-center text-xs text-[#68748A]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-[#2855D9] hover:underline">
          Create student account
        </Link>
      </div>
    </div>
  );
}
