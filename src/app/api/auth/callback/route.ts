import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  // Prevent open redirect attacks by sanitizing relative next path
  let safeNext = "/";
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    safeNext = next;
  }

  const isRecovery =
    safeNext.includes("reset-password") ||
    safeNext.includes("forgot-password") ||
    type === "recovery";

  if (error) {
    const errorParam = encodeURIComponent(error_description || error);
    const target = isRecovery
      ? `${origin}/reset-password?error=${errorParam}`
      : `${origin}/login?error=${errorParam}`;
    return NextResponse.redirect(target);
  }

  const supabase = await createClient();

  // 1. PKCE Code Exchange
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // 2. Email Token Hash / OTP Verification (used in Supabase recovery email templates)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (!verifyError) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Return user to relevant destination if verification fails or link expired
  const fallbackUrl = isRecovery
    ? `${origin}/reset-password?error=expired-or-invalid`
    : `${origin}/login?error=auth-code-error`;

  return NextResponse.redirect(fallbackUrl);
}

