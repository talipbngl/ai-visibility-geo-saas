"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function forgotPasswordAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();

  if (!email) {
    redirect("/forgot-password?error=Email zorunlu.");
  }

  const supabase = await createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?message=Şifre sıfırlama bağlantısı gönderildi.");
}