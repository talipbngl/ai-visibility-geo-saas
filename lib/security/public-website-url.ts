import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
]);

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return true;
  }

  const [first = 0, second = 0] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  const ipv4MappedMatch = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);

  return ipv4MappedMatch?.[1] ? isPrivateIpv4(ipv4MappedMatch[1]) : false;
}

function isPrivateIpAddress(address: string) {
  const version = isIP(address);

  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);

  return true;
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  return (
    BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  );
}

export async function assertPublicWebsiteUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Website URL geçerli değil.");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Sadece http veya https website adresleri analiz edilebilir.");
  }

  if (url.username || url.password) {
    throw new Error("Kullanıcı bilgisi içeren website adresleri analiz edilemez.");
  }

  if (url.port && !['80', '443'].includes(url.port)) {
    throw new Error("Yalnızca standart website portları analiz edilebilir.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error("Yerel veya dahili ağ adresleri analiz edilemez.");
  }

  if (isIP(url.hostname)) {
    if (isPrivateIpAddress(url.hostname)) {
      throw new Error("Özel veya yerel IP adresleri analiz edilemez.");
    }

    return url;
  }

  let addresses: Array<{ address: string }>;

  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Website alan adı çözümlenemedi.");
  }

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateIpAddress(address))
  ) {
    throw new Error("Website güvenli ve public bir IP adresine çözümlenmedi.");
  }

  return url;
}
