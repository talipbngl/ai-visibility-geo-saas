"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function createSlugFromEmail(email: string) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function registerAction(formData: FormData) {
  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect("/register?error=Email ve şifre zorunlu.");
  }

  if (password.length < 6) {
    redirect("/register?error=Şifre en az 6 karakter olmalı.");
  }

  const supabase = await createClient();

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (signUpError) {
    redirect(`/register?error=${encodeURIComponent(signUpError.message)}`);
  }

  const user = authData.user;

  if (!user) {
    redirect("/login?message=Kayıt oluşturuldu. Lütfen giriş yap.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      full_name: fullName || null,
      email,
    })
    .select("id")
    .single();

  if (profileError) {
    redirect(`/register?error=${encodeURIComponent(profileError.message)}`);
  }

  const workspaceName = fullName
    ? `${fullName} Workspace`
    : `${email} Workspace`;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: workspaceName,
      slug: createSlugFromEmail(email),
      owner_id: profile.id,
      plan: "free",
    })
    .select("id")
    .single();

  if (workspaceError) {
    redirect(`/register?error=${encodeURIComponent(workspaceError.message)}`);
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: profile.id,
      role: "owner",
    });

  if (memberError) {
    redirect(`/register?error=${encodeURIComponent(memberError.message)}`);
  }

  redirect("/dashboard");
}