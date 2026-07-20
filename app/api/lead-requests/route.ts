import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeLeadRequestRateLimit } from "@/lib/security/request-rate-limit";
import { createClient } from "@/lib/supabase/server";

const leadRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(120),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254),

  companyName: z
    .string()
    .trim()
    .max(120)
    .nullable(),

  websiteUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .nullable(),

  industry: z
    .string()
    .trim()
    .max(100)
    .nullable(),

  message: z
    .string()
    .trim()
    .max(2000)
    .nullable(),
});

function redirectTo(
  path: string,
  requestUrl: string
) {
  return NextResponse.redirect(
    new URL(path, requestUrl),
    {
      status: 303,
    }
  );
}

function normalizeWebsiteUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://")
  ) {
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
  const botToken =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_CHAT_ID;

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

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Telegram ${response.status} durum kodu döndürdü.`
    );
  }
}

export async function POST(request: Request) {
  const contentLength = Number(
    request.headers.get("content-length") ?? 0
  );

  if (contentLength > 20_000) {
    return redirectTo(
      `/request-report?error=${encodeURIComponent(
        "Gönderilen form çok büyük."
      )}`,
      request.url
    );
  }

  let isAllowed = false;

  try {
    isAllowed =
      await consumeLeadRequestRateLimit(
        request
      );
  } catch (error) {
    console.error(
      "Lead rate limit kontrolü başarısız:",
      error
    );

    return redirectTo(
      `/request-report?error=${encodeURIComponent(
        "Talep şu anda alınamıyor. Lütfen daha sonra tekrar dene."
      )}`,
      request.url
    );
  }

  if (!isAllowed) {
    return redirectTo(
      `/request-report?error=${encodeURIComponent(
        "Çok fazla talep gönderildi. Bir saat sonra tekrar dene."
      )}`,
      request.url
    );
  }

  const formData =
    await request.formData();

  const honeypotValue = String(
    formData.get("companyWebsite") ?? ""
  ).trim();

  if (honeypotValue) {
    return redirectTo(
      "/request-report?success=1",
      request.url
    );
  }

  const parsed =
    leadRequestSchema.safeParse({
      name: String(
        formData.get("name") ?? ""
      ),

      email: String(
        formData.get("email") ?? ""
      ),

      companyName:
        String(
          formData.get("companyName") ?? ""
        ).trim() || null,

      websiteUrl: normalizeWebsiteUrl(
        String(
          formData.get("websiteUrl") ?? ""
        )
      ),

      industry:
        String(
          formData.get("industry") ?? ""
        ).trim() || null,

      message:
        String(
          formData.get("message") ?? ""
        ).trim() || null,
    });

  if (!parsed.success) {
    return redirectTo(
      `/request-report?error=${encodeURIComponent(
        "Form bilgileri geçerli değil veya izin verilen uzunluğu aşıyor."
      )}`,
      request.url
    );
  }

  const {
    name,
    email,
    companyName,
    websiteUrl,
    industry,
    message,
  } = parsed.data;

  const supabase = await createClient();

  const { error: insertError } =
    await supabase
      .from("lead_requests")
      .insert({
        name,
        email,
        company_name: companyName,
        website_url: websiteUrl,
        industry,
        message,
      });

  if (insertError) {
    console.error(
      "Lead kaydedilemedi:",
      insertError
    );

    return redirectTo(
      `/request-report?error=${encodeURIComponent(
        "Talep kaydedilemedi. Lütfen daha sonra tekrar dene."
      )}`,
      request.url
    );
  }

  try {
    await notifyLeadRequest({
      name,
      email,
      companyName,
      websiteUrl,
      industry,
      message,
    });
  } catch (notificationError) {
    console.error(
      "Lead Telegram bildirimi gönderilemedi:",
      notificationError
    );
  }

  return redirectTo(
    "/request-report?success=1",
    request.url
  );
}