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
          "Registration initiated! Check your email inbox to verify your account or sign in."
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#e6e3da] rounded-xl p-8 shadow-xs">
      <div className="text-center mb-6">
        <div className="w-9 h-9 rounded-md bg-[#3730a3] text-white flex items-center justify-center font-bold text-base mx-auto mb-3 shadow-xs">
          V
        </div>
        <h1 className="text-xl font-serif font-bold text-stone-900 tracking-tight">
          Create Student Account
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Join the IGL4 revision platform to upload and track your progress
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
          <label className="block text-xs font-medium text-stone-700 mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Yassine Drira"
              required
              className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1">
            Student Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.tn"
              required
              className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1">
            Password (Min 6 characters)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
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

      <div className="mt-6 pt-5 border-t border-[#f0ede6] text-center text-xs text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#3730a3] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
