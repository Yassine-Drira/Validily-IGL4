"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock, Mail, User, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(
          "Registration initiated! Check your university email inbox to verify your account or sign in."
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 shadow-xs">
      <div className="text-center mb-6">
        <div className="w-9 h-9 rounded-md bg-[#2855D9] text-white flex items-center justify-center font-bold text-base mx-auto mb-3 shadow-xs">
          V
        </div>
        <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
          Create Student Account
        </h1>
        <p className="text-xs text-[#68748A] mt-1">
          Join validily-IGL4 to upload and track your exam revision progress
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#182235] mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Yassine Drira"
              required
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
            />
          </div>
        </div>

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
          <label className="block text-xs font-medium text-[#182235] mb-1">
            Password (Min 6 characters)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
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
          {loading ? "Registering..." : "Create Account"}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-[#E4E8F0] text-center text-xs text-[#68748A]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#2855D9] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
