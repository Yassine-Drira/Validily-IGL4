"use server";

import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server action for student & admin authentication.
 * Bypasses client-side browser extension interference, ad-blockers,
 * and third-party CORS issues by executing directly on the Node.js server.
 * Sets standard HTTP-only session cookies via @supabase/ssr.
 */
export async function loginWithEmailAction(
  email: string,
  password: string
): Promise<AuthActionResult> {
  const trimmedEmail = (email || "").trim().toLowerCase();
  const trimmedPassword = password || "";

  if (!trimmedEmail || !trimmedPassword) {
    return {
      success: false,
      error: "Veuillez renseigner votre adresse email et votre mot de passe.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (error) {
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_grant") ||
        error.message.includes("invalid_credentials")
      ) {
        return {
          success: false,
          error: "Email ou mot de passe incorrect. Vérifiez vos identifiants.",
        };
      }

      if (error.message.includes("Email not confirmed")) {
        return {
          success: false,
          error: "Veuillez confirmer votre adresse email universitaire avant de vous connecter.",
        };
      }

      return {
        success: false,
        error: error.message || "Échec de connexion.",
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: "Session introuvable après authentification.",
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("loginWithEmailAction unexpected error:", err);
    return {
      success: false,
      error:
        err?.message?.includes("Failed to fetch")
          ? "Impossible d'atteindre le serveur d'authentification. Vérifiez votre connexion internet."
          : err?.message || "Erreur interne lors de la tentative de connexion.",
    };
  }
}

/**
 * Server action for student account registration.
 */
export async function registerWithEmailAction(
  email: string,
  password: string,
  fullName: string
): Promise<AuthActionResult> {
  const trimmedEmail = (email || "").trim().toLowerCase();
  const trimmedPassword = password || "";
  const trimmedName = (fullName || "").trim();

  if (!trimmedEmail || !trimmedPassword) {
    return {
      success: false,
      error: "Veuillez renseigner votre email et un mot de passe.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: trimmedPassword,
      options: {
        data: {
          full_name: trimmedName,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("registerWithEmailAction unexpected error:", err);
    return {
      success: false,
      error:
        err?.message?.includes("Failed to fetch")
          ? "Impossible de joindre le serveur. Vérifiez votre connexion internet."
          : err?.message || "Échec d'inscription. Veuillez réessayer.",
    };
  }
}

