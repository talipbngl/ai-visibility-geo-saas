import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0];

  const address =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    forwardedFor?.trim() ??
    `unknown:${
      request.headers.get("user-agent") ??
      "no-user-agent"
    }`;

  const salt = process.env.RATE_LIMIT_SALT;

  if (!salt || salt.length < 32) {
    throw new Error(
      "RATE_LIMIT_SALT eksik veya yeterince uzun değil."
    );
  }

  return createHash("sha256")
    .update(`${salt}:${address}`)
    .digest("hex");
}

export async function consumeLeadRequestRateLimit(
  request: Request
) {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.rpc(
    "consume_lead_request_rate_limit",
    {
      p_identifier_hash:
        getClientIdentifier(request),

      p_limit: 5,

      p_window_seconds: 3600,
    }
  );

  if (error) {
    throw new Error(
      `Talep limiti kontrol edilemedi: ${error.message}`
    );
  }

  return data === true;
}