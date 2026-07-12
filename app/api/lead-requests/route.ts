import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

function normalizeWebsiteUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  if (trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const websiteUrl = normalizeWebsiteUrl(
    String(formData.get("websiteUrl") ?? "")
  );
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;

  if (!name) {
    return redirectTo(
      `/request-report?error=${encodeURIComponent("Ad soyad zorunludur.")}`,
      request.url
    );
  }

  if (!email || !email.includes("@")) {
    return redirectTo(
      `/request-report?error=${encodeURIComponent(
        "Geçerli bir e-posta adresi gir."
      )}`,
      request.url
    );
  }

  const { error } = await supabase.from("lead_requests").insert({
    name,
    email,
    company_name: companyName,
    website_url: websiteUrl,
    industry,
    message,
  });

  if (error) {
    return redirectTo(
      `/request-report?error=${encodeURIComponent(error.message)}`,
      request.url
    );
  }

  return redirectTo("/request-report?success=1", request.url);
}