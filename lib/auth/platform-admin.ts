export function getPlatformAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isPlatformAdmin(
  email: string | null | undefined
) {
  if (!email) {
    return false;
  }

  return getPlatformAdminEmails().has(
    email.trim().toLowerCase()
  );
}