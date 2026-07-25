import { assertPublicWebsiteUrl } from "@/lib/security/public-website-url";

const REQUEST_TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 3;
const MAX_TEXT_BYTES = 100 * 1024;

export type AiCrawlerAccessStatus =
  | "allowed"
  | "partial"
  | "blocked"
  | "unknown";

export type AiCrawlerAccessItem = {
  name: string;
  userAgent: string;
  status: AiCrawlerAccessStatus;
};

export type AiCrawlerAccessResult = {
  robotsTxtFound: boolean;
  robotsTxtUrl: string | null;
  llmsTxtFound: boolean;
  llmsTxtUrl: string | null;
  crawlers: AiCrawlerAccessItem[];
};

type RobotsRule = {
  directive: "allow" | "disallow";
  value: string;
};

type RobotsGroup = {
  agents: string[];
  rules: RobotsRule[];
};

type OptionalTextResult = {
  state: "found" | "missing" | "unavailable";
  text: string | null;
  finalUrl: string | null;
  contentType: string | null;
};

const crawlerDefinitions = [
  {
    name: "ChatGPT arama",
    userAgent: "OAI-SearchBot",
  },
  {
    name: "OpenAI model tarayıcısı",
    userAgent: "GPTBot",
  },
  {
    name: "Google-Extended",
    userAgent: "Google-Extended",
  },
  {
    name: "Claude",
    userAgent: "ClaudeBot",
  },
  {
    name: "Perplexity",
    userAgent: "PerplexityBot",
  },
];

function normalizeHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

function isSameWebsite(firstUrl: string, secondUrl: string) {
  return (
    normalizeHostname(new URL(firstUrl).hostname) ===
    normalizeHostname(new URL(secondUrl).hostname)
  );
}

async function readTextWithLimit(
  response: Response,
  byteLimit: number
) {
  const declaredLength = Number(
    response.headers.get("content-length") ?? 0
  );

  if (declaredLength > byteLimit) {
    throw new Error("Metin dosyası izin verilen sınırı aşıyor.");
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    totalBytes += value.byteLength;

    if (totalBytes > byteLimit) {
      await reader.cancel();

      throw new Error(
        "Metin dosyası izin verilen sınırı aşıyor."
      );
    }

    text += decoder.decode(value, {
      stream: true,
    });
  }

  return text + decoder.decode();
}

async function fetchOptionalPublicText({
  url,
  homepageUrl,
}: {
  url: string;
  homepageUrl: string;
}): Promise<OptionalTextResult> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    let currentUrl = (
      await assertPublicWebsiteUrl(url)
    ).toString();

    if (!isSameWebsite(currentUrl, homepageUrl)) {
      return {
        state: "unavailable",
        text: null,
        finalUrl: null,
        contentType: null,
      };
    }

    for (
      let redirectCount = 0;
      redirectCount <= MAX_REDIRECTS;
      redirectCount += 1
    ) {
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AIVisibilityAnalyzer/2.0)",
          Accept: "text/plain,*/*",
        },
        redirect: "manual",
        signal: controller.signal,
        cache: "no-store",
      });

      if (
        response.status >= 300 &&
        response.status < 400
      ) {
        const location =
          response.headers.get("location");

        if (
          !location ||
          redirectCount === MAX_REDIRECTS
        ) {
          return {
            state: "unavailable",
            contentType: null,
            text: null,
            finalUrl: null,
          };
        }

        const redirectedUrl = (
          await assertPublicWebsiteUrl(
            new URL(location, currentUrl).toString()
          )
        ).toString();

        if (!isSameWebsite(redirectedUrl, homepageUrl)) {
          return {
            state: "unavailable",
            contentType: null,
            text: null,
            finalUrl: null,
          };
        }

        currentUrl = redirectedUrl;
        continue;
      }

      if (
        response.status === 404 ||
        response.status === 410
      ) {
        return {
          state: "missing",
          text: null,
          finalUrl: currentUrl,
          contentType:
            response.headers.get("content-type"),
        };
      }

      if (!response.ok) {
        return {
          state: "unavailable",
          contentType: null,
          text: null,
          finalUrl: currentUrl,
        };
      }

      const contentType =
        response.headers.get("content-type") ?? "";

      const text = await readTextWithLimit(
        response,
        MAX_TEXT_BYTES
      );

      return {
        state: text.trim() ? "found" : "missing",
        text: text.trim() ? text : null,
        finalUrl: currentUrl,
        contentType,
      };
    }

    return {
      state: "unavailable",
      contentType: null,
      text: null,
      finalUrl: null,
    };
  } catch {
    return {
      state: "unavailable",
      contentType: null,
      text: null,
      finalUrl: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobotsGroups(robotsText: string) {
  const groups: RobotsGroup[] = [];

  let agents: string[] = [];
  let rules: RobotsRule[] = [];
  let hasRules = false;

  function saveCurrentGroup() {
    if (agents.length === 0) return;

    groups.push({
      agents,
      rules,
    });

    agents = [];
    rules = [];
    hasRules = false;
  }

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]?.trim();

    if (!line) continue;

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) continue;

    const directive = line
      .slice(0, separatorIndex)
      .trim()
      .toLowerCase();

    const value = line
      .slice(separatorIndex + 1)
      .trim();

    if (directive === "user-agent") {
      if (hasRules) {
        saveCurrentGroup();
      }

      if (value) {
        agents.push(value.toLowerCase());
      }

      continue;
    }

    if (
      directive !== "allow" &&
      directive !== "disallow"
    ) {
      continue;
    }

    if (agents.length === 0) continue;

    hasRules = true;

    if (directive === "disallow" && !value) {
      continue;
    }

    rules.push({
      directive,
      value,
    });
  }

  saveCurrentGroup();

  return groups;
}

function getRulesForAgent(
  groups: RobotsGroup[],
  userAgent: string
) {
  const normalizedAgent = userAgent.toLowerCase();

  const exactGroups = groups.filter((group) =>
    group.agents.includes(normalizedAgent)
  );

  const selectedGroups =
    exactGroups.length > 0
      ? exactGroups
      : groups.filter((group) =>
          group.agents.includes("*")
        );

  return selectedGroups.flatMap((group) => group.rules);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ruleMatchesPath(pathname: string, ruleValue: string) {
  if (!ruleValue) return false;

  const endsAtPathEnd = ruleValue.endsWith("$");
  const valueWithoutEndMarker = endsAtPathEnd
    ? ruleValue.slice(0, -1)
    : ruleValue;

  const pattern = escapeRegex(valueWithoutEndMarker)
    .replace(/\\\*/g, ".*");

  const regex = new RegExp(
    `^${pattern}${endsAtPathEnd ? "$" : ""}`
  );

  return regex.test(pathname);
}

function getRootAccessDecision(rules: RobotsRule[]) {
  const matchingRules = rules
    .filter((rule) => ruleMatchesPath("/", rule.value))
    .sort((first, second) => {
      const lengthDifference =
        second.value.length - first.value.length;

      if (lengthDifference !== 0) {
        return lengthDifference;
      }

      if (
        first.directive === "allow" &&
        second.directive === "disallow"
      ) {
        return -1;
      }

      return 0;
    });

  return matchingRules[0]?.directive ?? "allow";
}
function looksLikeHtml(text: string | null) {
  if (!text) return false;

  const beginning = text
    .trim()
    .slice(0, 2_000)
    .toLowerCase();

  return (
    beginning.includes("<!doctype html") ||
    beginning.includes("<html") ||
    beginning.includes("<head") ||
    beginning.includes("<body")
  );
}

function isValidRobotsFile(result: OptionalTextResult) {
  if (result.state !== "found" || !result.text) {
    return false;
  }

  if (looksLikeHtml(result.text)) {
    return false;
  }

  return /(^|\n)\s*(user-agent|allow|disallow|sitemap)\s*:/i.test(
    result.text
  );
}

function isValidLlmsFile(result: OptionalTextResult) {
  if (result.state !== "found" || !result.text) {
    return false;
  }

  if (looksLikeHtml(result.text)) {
    return false;
  }

  const text = result.text
    .replace(/^\uFEFF/, "")
    .trim();

  if (text.length < 20) {
    return false;
  }

  const firstContentLine = text
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0)
    ?.trim();

  if (!firstContentLine) {
    return false;
  }

  return /^#\s+\S+/.test(firstContentLine);
}
function getCrawlerStatus({
  robotsState,
  robotsText,
  userAgent,
}: {
  robotsState: OptionalTextResult["state"];
  robotsText: string | null;
  userAgent: string;
}): AiCrawlerAccessStatus {
  if (robotsState === "unavailable") {
    return "unknown";
  }

  if (robotsState === "missing" || !robotsText) {
    return "allowed";
  }

  const groups = parseRobotsGroups(robotsText);
  const rules = getRulesForAgent(groups, userAgent);

  if (getRootAccessDecision(rules) === "disallow") {
    return "blocked";
  }

  const hasRestrictedPaths = rules.some(
    (rule) =>
      rule.directive === "disallow" &&
      Boolean(rule.value)
  );

  return hasRestrictedPaths ? "partial" : "allowed";
}

export async function analyzeAiCrawlerAccess(
  homepageUrl: string
): Promise<AiCrawlerAccessResult> {
  const robotsUrl = new URL(
    "/robots.txt",
    homepageUrl
  ).toString();

  const llmsUrl = new URL(
    "/llms.txt",
    homepageUrl
  ).toString();

  const llmsFullUrl = new URL(
    "/llms-full.txt",
    homepageUrl
  ).toString();

  const [robots, llms, llmsFull] = await Promise.all([
    fetchOptionalPublicText({
      url: robotsUrl,
      homepageUrl,
    }),
    fetchOptionalPublicText({
      url: llmsUrl,
      homepageUrl,
    }),
    fetchOptionalPublicText({
      url: llmsFullUrl,
      homepageUrl,
    }),
  ]);

  const robotsIsValid = isValidRobotsFile(robots);

  const foundLlms = isValidLlmsFile(llms)
    ? llms
    : isValidLlmsFile(llmsFull)
      ? llmsFull
      : null;

  const robotsState = robotsIsValid
    ? "found"
    : robots.state === "unavailable"
      ? "unavailable"
      : "missing";

  return {
    robotsTxtFound: robotsIsValid,
    robotsTxtUrl: robotsIsValid
      ? robots.finalUrl
      : null,
    llmsTxtFound: Boolean(foundLlms),
    llmsTxtUrl: foundLlms?.finalUrl ?? null,
    crawlers: crawlerDefinitions.map((crawler) => ({
      ...crawler,
      status: getCrawlerStatus({
        robotsState,
        robotsText: robotsIsValid
          ? robots.text
          : null,
        userAgent: crawler.userAgent,
      }),
    })),
  };
}