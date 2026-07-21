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

function getRegisterErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already exists")
  ) {
    return "Bu e-posta adresiyle daha önce kayıt olunmuş. Giriş yapmayı deneyin.";
  }

  if (
    normalizedMessage.includes("weak password") ||
    normalizedMessage.includes("password should be at least") ||
    (normalizedMessage.includes("password") &&
      normalizedMessage.includes("characters"))
  ) {
    return "Şifre yeterince güçlü değil. En az 6 karakter kullanın.";
  }

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
    return "Çok fazla kayıt denemesi yapıldı. Biraz bekleyip tekrar deneyin.";
  }

  if (
    normalizedMessage.includes("signup is disabled") ||
    normalizedMessage.includes("signups not allowed")
  ) {
    return "Yeni hesap oluşturma işlemi şu anda kullanılamıyor.";
  }

  return "Kayıt işlemi tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.";
}

export async function registerAction(formData: FormData) {
  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");

  if (!fullName) {
    redirectWithError("Adınızı ve soyadınızı girin.");
  }

  if (fullName.length < 2) {
    redirectWithError("Ad ve soyad en az 2 karakter olmalıdır.");
  }

  if (!email) {
    redirectWithError("E-posta adresinizi girin.");
  }

  if (!email.includes("@") || !email.includes(".")) {
    redirectWithError("Geçerli bir e-posta adresi girin.");
  }

  if (!password) {
    redirectWithError("Şifrenizi girin.");
  }

  if (password.length < 6) {
    redirectWithError("Şifre en az 6 karakter olmalıdır.");
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
    redirectWithError(getRegisterErrorMessage(signUpError.message));
  }

  if (data.session) {
    const { error: workspaceError } = await supabase.rpc(
      "ensure_current_user_workspace"
    );

    if (workspaceError) {
      redirectWithError(
        "Hesap oluşturuldu ancak çalışma alanı hazırlanamadı. Lütfen giriş yapmayı deneyin."
      );
    }

    redirect("/dashboard");
  }

  redirectWithLoginMessage(
    "Kaydınız oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunuza gönderilen bağlantıyı açıp giriş yapın."
  );
}