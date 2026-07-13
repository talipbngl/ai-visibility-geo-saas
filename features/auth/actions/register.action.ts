"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(message: string): never {
  redirect(`/register?error=${encodeURIComponent(message)}`);
}

function redirectWithLoginMessage(message: string): never {
  redirect(`/login?message=${encodeURIComponent(message)}`);
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already exists")
  ) {
    return "Bu email adresiyle daha önce kayıt olunmuş. Giriş yapmayı deneyin.";
  }

  if (
    normalizedMessage.includes("password") &&
    normalizedMessage.includes("characters")
  ) {
    return "Şifre yeterince güçlü değil. En az 6 karakter kullanın.";
  }

  if (normalizedMessage.includes("invalid email")) {
    return "Geçerli bir email adresi giriniz.";
  }

  if (normalizedMessage.includes("rate limit")) {
    return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.";
  }

  return message || "Kayıt sırasında bilinmeyen bir hata oluştu.";
}

export async function registerAction(formData: FormData) {
  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");

  if (!fullName) {
    redirectWithError("Tam ad giriniz.");
  }

  if (!email) {
    redirectWithError("Email giriniz.");
  }

  if (!email.includes("@") || !email.includes(".")) {
    redirectWithError("Geçerli bir email adresi giriniz.");
  }

  if (!password) {
    redirectWithError("Şifre giriniz.");
  }

  if (password.length < 6) {
    redirectWithError("Şifre en az 6 karakter olmalı.");
  }

  const supabase = await createClient();

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (signUpError) {
    redirectWithError(getAuthErrorMessage(signUpError.message));
  }

  if (data.session) {
    const { error: workspaceError } = await supabase.rpc(
      "ensure_current_user_workspace"
    );

    if (workspaceError) {
      redirectWithError(
        `Hesap oluşturuldu ama çalışma alanı hazırlanamadı: ${workspaceError.message}`
      );
    }

    redirect("/dashboard");
  }

  redirectWithLoginMessage(
    "Kayıt oluşturuldu. Email onayı gerekiyorsa onaylayıp giriş yapınız."
  );
}