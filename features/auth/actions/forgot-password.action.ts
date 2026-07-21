"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(message: string): never {
  redirect(`/forgot-password?error=${encodeURIComponent(message)}`);
}

function redirectWithMessage(message: string): never {
  redirect(`/forgot-password?message=${encodeURIComponent(message)}`);
}

function getPasswordResetErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid email") ||
    normalizedMessage.includes("email address is invalid")
  ) {
    return "Geçerli bir e-posta adresi girin.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return "Çok fazla şifre sıfırlama isteği gönderildi. Biraz bekleyip tekrar deneyin.";
  }

  return "Şifre sıfırlama bağlantısı şu anda gönderilemedi. Lütfen tekrar deneyin.";
}

export async function forgotPasswordAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();

  if (!email) {
    redirectWithError("E-posta adresinizi girin.");
  }

  if (!email.includes("@") || !email.includes(".")) {
    redirectWithError("Geçerli bir e-posta adresi girin.");
  }

  const supabase = await createClient();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    redirectWithError(getPasswordResetErrorMessage(error.message));
  }

  redirectWithMessage(
    "Bu e-posta adresine bağlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi."
  );
}