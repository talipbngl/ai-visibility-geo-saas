export type CitationSource = {
  uri: string;
  title: string;
};

const GEMINI_REDIRECT_HOSTS = new Set([
  "vertexaisearch.cloud.google.com",
]);

function getHostname(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  try {
    const url = new URL(
      normalizedValue.startsWith("http://") ||
        normalizedValue.startsWith("https://")
        ? normalizedValue
        : `https://${normalizedValue}`
    );

    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getHostnameFromTitle(title: string) {
  const directHostname = getHostname(title);

  if (directHostname) {
    return directHostname;
  }

  const domainMatch = title
    .toLowerCase()
    .match(/(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i);

  return domainMatch ? getHostname(domainMatch[0]) : null;
}

export function getCitationSourceHostname(
  source: CitationSource
) {
  const uriHostname = getHostname(source.uri);

  if (
    uriHostname &&
    !GEMINI_REDIRECT_HOSTS.has(uriHostname)
  ) {
    return uriHostname;
  }

  return getHostnameFromTitle(source.title) ?? uriHostname;
}

export function citationSourceMatchesWebsite(
  source: CitationSource,
  websiteUrl: string | null | undefined
) {
  const websiteHostname = getHostname(websiteUrl);
  const sourceHostname = getCitationSourceHostname(source);

  if (!websiteHostname || !sourceHostname) {
    return false;
  }

  return (
    sourceHostname === websiteHostname ||
    sourceHostname.endsWith(`.${websiteHostname}`)
  );
}