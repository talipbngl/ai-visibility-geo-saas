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
async function notifyLeadRequest(args: {
  name: string;
  email: string;
  companyName: string | null;
  websiteUrl: string | null;
  industry: string | null;
  message: string | null;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return;
  }

  const text = [
    "Yeni rapor talebi geldi 🚀",
    "",
    `Ad: ${args.name}`,
    `Email: ${args.email}`,
    `Şirket: ${args.companyName ?? "-"}`,
    `Website: ${args.websiteUrl ?? "-"}`,
    `Sektör: ${args.industry ?? "-"}`,
    "",
    `Mesaj: ${args.message ?? "-"}`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
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
await notifyLeadRequest({
  name,
  email,
  companyName,
  websiteUrl,
  industry,
  message,
});
  return redirectTo("/request-report?success=1", request.url);
}