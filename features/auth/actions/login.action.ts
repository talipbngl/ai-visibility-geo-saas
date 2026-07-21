"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getSafeNext(nextPath: string) {
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

function redirectWithError(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

function getLoginErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid credentials")
  ) {
    return "E-posta adresi veya şifre hatalı.";
  }

  if (
    normalizedMessage.includes("email not confirmed") ||
    normalizedMessage.includes("email_not_confirmed")
  ) {
    return "E-posta adresiniz henüz doğrulanmamış. Gelen kutunuzu kontrol edin.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return "Çok fazla giriş denemesi yapıldı. Biraz bekleyip tekrar deneyin.";
  }

  if (
    normalizedMessage.includes("user is disabled") ||
    normalizedMessage.includes("user banned")
  ) {
    return "Bu hesap geçici olarak kullanıma kapatılmış.";
  }

  return "Giriş yapılamadı. Bilgilerinizi kontrol edip tekrar deneyin.";
}

export async function loginAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const nextPath = getSafeNext(
    getString(formData, "next") || "/dashboard"
  );

  if (!email || !password) {
    redirectWithError("E-posta adresi ve şifre zorunludur.");
  }

  if (!email.includes("@") || !email.includes(".")) {
    redirectWithError("Geçerli bir e-posta adresi girin.");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithError(getLoginErrorMessage(error.message));
  }

  const { error: workspaceError } = await supabase.rpc(
    "ensure_current_user_workspace"
  );

  if (workspaceError) {
    redirectWithError(
      "Hesabınıza giriş yapıldı ancak çalışma alanınız hazırlanamadı. Lütfen tekrar deneyin."
    );
  }

  redirect(nextPath);
}