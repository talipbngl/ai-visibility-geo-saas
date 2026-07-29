import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientWebsiteScoreComparison } from "@/features/reports/components/ClientWebsiteScoreComparison";
import { PrintReportButton } from "@/features/reports/components/PrintReportButton";
import { AuditChangeSummary } from "@/features/reports/components/AuditChangeSummary";
import { PromptVisibilityChanges } from "@/features/reports/components/PromptVisibilityChanges";
import { CitationSourceIntelligence } from "@/features/reports/components/CitationSourceIntelligence";
import { ClientEvidenceActionPlan } from "@/features/reports/components/ClientEvidenceActionPlan";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  buildClientReportBriefs,
  resolveReportIntent,
} from "@/lib/reports/client-action-briefs";
import { buildIntentPerformance } from "@/lib/reports/intent-performance";
import { getIntentLabel } from "@/lib/ui/labels";
import {
  buildCompetitorMentionTerms,
  findFirstMentionIndex,
  uniqueMentionTerms,
} from "@/lib/analysis/mention-detection";
export const metadata = {
  title: "AI Yanıt Görünürlüğü Ölçüm Raporu",
};
type ClientReportPageProps = {
  params: Promise<{
    auditId: string;
  }>;
};

type CompetitorVisibility = {
  name: string;
  mentioned: boolean;
  rank: number | null;
};

type NestedPrompt = {
  text?: string | null;
  intent?: string | null;
  priority?: number | null;
};

type NestedRun = {
  id?: string | null;
  prompt_text_snapshot?: string | null;
  prompt_intent_snapshot?: string | null;
  prompt_priority_snapshot?: number | null;
  citations_json?: unknown;
  raw_answer?: string | null;
  engine?: string | null;
  model?: string | null;
  prompts?: NestedPrompt | NestedPrompt[] | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getNestedRun(value: NestedRun | NestedRun[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;

  return value ?? null;
}

function getNestedPrompt(run: NestedRun | null) {
  if (!run?.prompts) return null;

  return Array.isArray(run.prompts) ? run.prompts[0] ?? null : run.prompts;
}

function getPromptText(run: NestedRun | null) {
  if (run?.prompt_text_snapshot) return run.prompt_text_snapshot;

  const prompt = getNestedPrompt(run);

  return prompt?.text ?? "Test sorusu bulunamadı";
}
function getPromptIntent(run: NestedRun | null) {
  if (run?.prompt_intent_snapshot) {
    return run.prompt_intent_snapshot;
  }

  const prompt = getNestedPrompt(run);

  return prompt?.intent ?? null;
}
function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getCategoryScore(value: unknown, key: string) {
  const record = toRecord(value);
  const score = Number(record[key] ?? 0);

  if (!Number.isFinite(score)) return 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasCategoryScores(value: unknown) {
  const record = toRecord(value);

  return ["technical", "structure", "content", "trust"].some((key) =>
    Number.isFinite(Number(record[key]))
  );
}
function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>

      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function MetricBox({
  label,
  value,
  helper,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "blue" | "green" | "purple" | "orange" | "rose";
}) {
  const toneClass = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-emerald-500 to-teal-500",
    purple: "from-violet-500 to-fuchsia-500",
    orange: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-500",
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r ${toneClass}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default async function ClientReportPage({
  params,
}: ClientReportPageProps) {
  const { auditId } = await params;

  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select(
      "id, brand_id, status, total_prompts, completed_prompts, created_at, completed_at"
    )
    .eq("id", auditId)
    .maybeSingle();

  if (!audit) {
    notFound();
  }

  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id, name, website_url, industry, country, language, description, target_audience, primary_offer"
    )
    .eq("id", audit.brand_id)
    .maybeSingle();

  if (!brand) {
    notFound();
  }
  const { data: citationCompetitors } = await supabase
  .from("competitors")
  .select("id, name, website_url")
  .eq("brand_id", brand.id);
  const { data: brandAliasRows } = await supabase
  .from("brand_aliases")
  .select("alias")
  .eq("brand_id", brand.id);

const seededPromptTerms = uniqueMentionTerms([
  ...buildCompetitorMentionTerms({
    name: brand.name,
    aliases: (brandAliasRows ?? []).map((row) => row.alias),
    websiteUrl: brand.website_url,
  }),
  ...(citationCompetitors ?? []).flatMap((competitor) =>
    buildCompetitorMentionTerms({
      name: competitor.name,
      websiteUrl: competitor.website_url,
    })
  ),
]);

  const { data: score } = await supabase
    .from("audit_scores")
    .select(
      "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, citation_score, competitor_gap_score, opportunity_score"
    )
    .eq("audit_id", audit.id)
    .maybeSingle();
const { data: previousAuditRows } = await supabase
  .from("audits")
  .select("id, total_prompts, created_at")
  .eq("brand_id", brand.id)
  .eq("status", "completed")
  .lt("created_at", audit.created_at)
  .order("created_at", { ascending: false })
  .limit(10);

const previousAuditIds = (previousAuditRows ?? []).map(
  (previousAudit) => previousAudit.id
);

const previousScoreResult =
  previousAuditIds.length > 0
    ? await supabase
        .from("audit_scores")
        .select(
          "audit_id, visibility_score, share_of_voice, average_rank, positive_sentiment_rate"
        )
        .in("audit_id", previousAuditIds)
    : { data: [] };

const previousScoreByAuditId = new Map(
  (previousScoreResult.data ?? []).map(
    (previousScoreItem) => [
      previousScoreItem.audit_id,
      previousScoreItem,
    ]
  )
);

const previousAudit =
  (previousAuditRows ?? []).find((previousAuditItem) =>
    previousScoreByAuditId.has(previousAuditItem.id)
  ) ?? null;

const previousScore = previousAudit
  ? previousScoreByAuditId.get(previousAudit.id) ?? null
  : null;
const { data: analyses } = await supabase
  .from("analyses")
  .select(
    `
    id,
    audit_run_id,
    brand_mentioned,
    brand_rank,
    brand_sentiment,
    competitors_json,
    summary,
    risk_notes_json,
    opportunity_notes_json,
    audit_runs!inner (
      id,
      audit_id,
      prompt_text_snapshot,
      prompt_intent_snapshot,
      prompt_priority_snapshot,
      citations_json,
      raw_answer,
      engine,
      model,
      prompts (
        id,
        text,
        intent,
        priority
      )
    )
  `
  )
  .eq("audit_runs.audit_id", audit.id);
const previousAnalysesResult = previousAudit
  ? await supabase
      .from("analyses")
      .select(
        `
        id,
        brand_mentioned,
        brand_rank,
        audit_runs!inner (
          audit_id,
          prompt_text_snapshot,
          prompts (
            text
          )
        )
      `
      )
      .eq(
        "audit_runs.audit_id",
        previousAudit.id
      )
  : { data: [] };

const currentPromptResults = (analyses ?? []).map(
  (analysis) => {
    const run = getNestedRun(analysis.audit_runs);

    return {
      promptText: getPromptText(run),
      mentioned: analysis.brand_mentioned,
      rank: analysis.brand_rank,
    };
  }
);
const citationRuns = (analyses ?? []).map((analysis) => {
  const run = getNestedRun(analysis.audit_runs);
  const promptText = getPromptText(run);

  return {
    id: analysis.id,
    promptText,
    promptIntent: resolveReportIntent(
      promptText,
      getPromptIntent(run)
    ),
    brandMentioned: analysis.brand_mentioned,
    citationsValue: run?.citations_json ?? null,
  };
});
const clientReportRuns = (analyses ?? []).map((analysis) => {
  const run = getNestedRun(analysis.audit_runs);
  const promptText = getPromptText(run);
  const competitors = Array.isArray(analysis.competitors_json)
    ? (analysis.competitors_json as CompetitorVisibility[])
    : [];

  return {
    id: analysis.id,
    promptText,
    promptIntent: resolveReportIntent(
      promptText,
      getPromptIntent(run)
    ),
    promptPriority:
      run?.prompt_priority_snapshot ??
      getNestedPrompt(run)?.priority ??
      null,
    brandMentioned: analysis.brand_mentioned,
    brandRank: analysis.brand_rank,
    brandSentiment: analysis.brand_sentiment,
    rawAnswer: run?.raw_answer ?? "",
        engine: run?.engine ?? null,
    model: run?.model ?? null,
    competitors,
    isSeededPrompt:
      findFirstMentionIndex(
        promptText,
        seededPromptTerms
      ) !== null,
  };
});
const discoveryRuns = clientReportRuns.filter(
  (run) => !run.isSeededPrompt
);

const seededRuns = clientReportRuns.filter(
  (run) => run.isSeededPrompt
);

const discoveryVisibleRuns = discoveryRuns.filter(
  (run) => run.brandMentioned
);

const seededVisibleRuns = seededRuns.filter(
  (run) => run.brandMentioned
);

const discoveryPromptCount = discoveryRuns.length;

const discoveryVisibilityScore =
  discoveryPromptCount > 0
    ? Math.round(
        (discoveryVisibleRuns.length /
          discoveryPromptCount) *
          100
      )
    : 0;

const discoveryCompetitorMentionCount =
  discoveryRuns.reduce(
    (total, run) =>
      total +
      run.competitors.filter(
        (competitor) => competitor.mentioned
      ).length,
    0
  );

const discoveryTotalMentions =
  discoveryVisibleRuns.length +
  discoveryCompetitorMentionCount;

const discoveryShareOfVoice =
  discoveryTotalMentions > 0
    ? Math.round(
        (discoveryVisibleRuns.length /
          discoveryTotalMentions) *
          100
      )
    : 0;

const discoveryRanks = discoveryVisibleRuns
  .map((run) => run.brandRank)
  .filter((rank): rank is number => rank !== null);

const discoveryAverageRank =
  discoveryRanks.length > 0
    ? Math.round(
        (discoveryRanks.reduce(
          (total, rank) => total + rank,
          0
        ) /
          discoveryRanks.length) *
          10
      ) / 10
    : null;
const previousPromptResults = (
  previousAnalysesResult.data ?? []
).map((analysis) => {
  const run = getNestedRun(analysis.audit_runs);

  return {
    promptText: getPromptText(run),
    mentioned: analysis.brand_mentioned,
    rank: analysis.brand_rank,
  };
});
  const { data: websiteSnapshots } = await supabase
    .from("brand_website_snapshots")
    .select(
  `
  id,
  website_url,
  title,
  meta_description,
  word_count,
  content_score,
  service_signals_json,
  technical_signals_json,
  trust_signals_json,
  category_scores_json,
  created_at
  `
)
    .eq("brand_id", brand.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1);

  const websiteSnapshot = websiteSnapshots?.[0] ?? null;

  const { data: competitorWebsiteSnapshots } = await supabase
    .from("competitor_website_snapshots")
    .select(
      `
      id,
      competitor_id,
      website_url,
      content_score,
      word_count,
      service_signals_json,
      trust_signals_json,
      technical_signals_json,
      category_scores_json,
      created_at,
      competitors (
        id,
        name
      )
    `
    )
    .eq("brand_id", brand.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  type CompetitorWebsiteSnapshotRow = NonNullable<
    typeof competitorWebsiteSnapshots
  >[number];

  const latestCompetitorWebsiteSnapshotMap = new Map<
    string,
    CompetitorWebsiteSnapshotRow
  >();

  (competitorWebsiteSnapshots ?? []).forEach((snapshot) => {
    if (!latestCompetitorWebsiteSnapshotMap.has(snapshot.competitor_id)) {
      latestCompetitorWebsiteSnapshotMap.set(snapshot.competitor_id, snapshot);
    }
  });

  const latestCompetitorWebsiteSnapshots = Array.from(
    latestCompetitorWebsiteSnapshotMap.values()
  ).map((snapshot) => {
    const competitor = Array.isArray(snapshot.competitors)
      ? snapshot.competitors[0]
      : snapshot.competitors;

    return {
      id: snapshot.id,
      technical_signals_json:
  snapshot.technical_signals_json,
      competitor_id: snapshot.competitor_id,
      competitor_name: competitor?.name ?? "Rakip",
      website_url: snapshot.website_url,
      content_score: Number(snapshot.content_score ?? 0),
      word_count: Number(snapshot.word_count ?? 0),
      service_signals_json: snapshot.service_signals_json,
      trust_signals_json: snapshot.trust_signals_json,
category_scores_json: snapshot.category_scores_json,
created_at: snapshot.created_at,
    };
  });
  const citationScore =
    score?.citation_score === null ||
    score?.citation_score === undefined
      ? null
      : Math.round(
          Number(score.citation_score)
        );
  const intentPerformance = buildIntentPerformance(
  discoveryRuns.map((run) => ({
      intent: run.promptIntent,
      brandMentioned: run.brandMentioned,
      brandRank: run.brandRank,
    }))
  );

  const comparableIntents = intentPerformance.filter(
    (item) => item.total >= 2
  );

  const strongestIntent =
    [...comparableIntents].sort(
      (first, second) =>
        second.visibilityRate - first.visibilityRate
    )[0] ?? null;

  const weakestIntent =
    [...comparableIntents].sort(
      (first, second) =>
        first.visibilityRate - second.visibilityRate
    )[0] ?? null;

  const hasIntentDifference =
    strongestIntent !== null &&
    weakestIntent !== null &&
    strongestIntent.visibilityRate !== weakestIntent.visibilityRate;

  const competitorStatsMap = new Map<
    string,
    {
      name: string;
      mentionCount: number;
      rankSum: number;
      rankCount: number;
    }
  >();

  discoveryRuns.forEach((run) => {
  run.competitors.forEach((competitor) => {
    if (!competitor.mentioned) return;

    const current = competitorStatsMap.get(
      competitor.name
    ) ?? {
      name: competitor.name,
      mentionCount: 0,
      rankSum: 0,
      rankCount: 0,
    };

    current.mentionCount += 1;

    if (competitor.rank) {
      current.rankSum += competitor.rank;
      current.rankCount += 1;
    }

    competitorStatsMap.set(
      competitor.name,
      current
    );
  });
});

  const competitorStats = Array.from(competitorStatsMap.values())
    .map((competitor) => ({
      ...competitor,
      averageRank:
        competitor.rankCount > 0
          ? Math.round((competitor.rankSum / competitor.rankCount) * 10) / 10
          : null,
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);

const brandWebsiteScore =
  websiteSnapshot &&
  hasCategoryScores(websiteSnapshot.category_scores_json)
    ? getCategoryScore(
        websiteSnapshot.category_scores_json,
        "overall"
      )
    : null;

const competitorWebsiteScores =
  latestCompetitorWebsiteSnapshots
    .filter((snapshot) =>
      hasCategoryScores(snapshot.category_scores_json)
    )
    .map((snapshot) =>
      getCategoryScore(snapshot.category_scores_json, "overall")
    );

  const strongestCompetitor = competitorStats[0] ?? null;
  const hasWebsiteComparison =
    brandWebsiteScore !== null &&
    competitorWebsiteScores.length > 0;
  const hasCitationMeasurement = citationScore !== null;
  const clientReportBriefs = buildClientReportBriefs({
    brandName: brand.name,
    brandContext: {
      industry: brand.industry,
      description: brand.description,
      targetAudience: brand.target_audience,
      primaryOffer: brand.primary_offer,
    },
    runs: discoveryRuns,
    serviceSignalsValue:
      websiteSnapshot?.service_signals_json ?? null,
    technicalSignalsValue:
      websiteSnapshot?.technical_signals_json ?? null,
  });
  const completedPromptCount = Math.max(
    audit.completed_prompts,
    analyses?.length ?? 0
  );
  const primaryPromptAction =
  clientReportBriefs.actionBriefs.find(
    (action) => action.id.startsWith("prompt-")
  );

const primaryGap = primaryPromptAction
  ? discoveryRuns.find(
      (run) =>
        run.promptText ===
        primaryPromptAction.targetPrompt
    ) ??
    discoveryRuns.find(
      (run) => !run.brandMentioned
    )
  : discoveryRuns.find(
      (run) => !run.brandMentioned
    );
  const productName =
    process.env.NEXT_PUBLIC_PRODUCT_NAME?.trim() || "ASPEQO";
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
    const contactName =
  process.env.NEXT_PUBLIC_CONTACT_NAME?.trim() || "";

const contactPhone =
  process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "";

const contactLinkedIn =
  process.env.NEXT_PUBLIC_CONTACT_LINKEDIN?.trim() || "";

const contactLinkedInUrl = contactLinkedIn
  ? /^https?:\/\//i.test(contactLinkedIn)
    ? contactLinkedIn
    : `https://${contactLinkedIn}`
  : "";

const contactLinkedInLabel = contactLinkedIn
  .replace(/^https?:\/\//i, "")
  .replace(/\/$/, "");
const executiveSummary =
  discoveryPromptCount === 0
    ? "Bu ölçüm setinde marka veya takip edilen rakip adı geçmeyen yönlendirmesiz bir keşif sorusu bulunmuyor. Doğal görünürlüğü ölçebilmek için en az beş tarafsız kullanıcı sorusu eklenmelidir."
    : primaryGap
      ? `${brand.name}, marka veya takip edilen rakip adı geçmeyen ${discoveryPromptCount} yönlendirmesiz sorunun ${discoveryVisibleRuns.length} tanesinde görünürken “${primaryGap.promptText}” sorusunda görünmedi. ${
          strongestCompetitor
            ? `${strongestCompetitor.name}, yönlendirmesiz soruların ${strongestCompetitor.mentionCount}/${discoveryPromptCount} tanesinde görünerek en sık görülen takip edilen rakip oldu.`
            : "Yönlendirmesiz sorularda takip edilen rakiplerden belirgin bir görünürlük üstünlüğü tespit edilmedi."
        } Öncelik, aşağıdaki kanıt kartında belirtilen kullanıcı ihtiyacını doğrudan karşılayan mevcut sayfayı güçlendirmek veya uygun sayfa bulunmuyorsa yeni bir karar sayfası hazırlamaktır.`
      : `${brand.name}, marka veya takip edilen rakip adı geçmeyen ${discoveryPromptCount} yönlendirmesiz sorunun tamamında görünür durumda. Sonraki adım, bu konumu daha geniş bir tarafsız soru setinde doğrulamak ve ilk iki öneri arasındaki yerini korumaktır.`;
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 print:bg-white">
      <div className="mx-auto max-w-6xl px-6 py-6 print:max-w-none print:px-0 print:py-0">
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <Button asChild variant="outline">
            <Link href={`/dashboard/audits/${audit.id}/report`}>
              Dashboard raporuna dön
            </Link>
          </Button>

          <PrintReportButton />
        </div>

          <article className="client-report space-y-8 rounded-[2rem] bg-white p-8 shadow-xl print:rounded-none print:p-0 print:shadow-none">
            <section className="client-report-cover relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white">
              <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />

              <div className="relative z-10 flex h-full flex-col justify-between gap-12">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-black text-slate-950">
                      AS
                    </span>
                    <div>
                      <p className="text-sm font-bold tracking-[0.22em] text-white">
                        {productName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        AI yanıt görünürlüğü analizi
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                      AI Yanıt Görünürlüğü Ölçüm Raporu
                    </p>

                    <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-tight">
                      {brand.name}
                    </h1>

                    <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                      Bu rapor, seçilen kullanıcı sorularında markanın ve takip
                      edilen rakiplerin Gemini cevaplarındaki görünürlüğünü
                      gösterir. Sonuçlar yalnızca belirtilen test kapsamını
                      temsil eder.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                        Gemini
                      </span>
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                        {completedPromptCount} tamamlanan soru
                      </span>
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                        {citationCompetitors?.length ?? 0} tanımlı rakip
                      </span>
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                          Web kaynakları:{" "}
                          {hasCitationMeasurement
                            ? "Kullanıldı"
                            : "Kullanılmadı"}
                        </span>
                                            </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur">
  <p className="text-sm text-slate-300">
    Yönlendirmesiz keşif görünürlüğü
  </p>

  <p className="mt-3 text-7xl font-bold">
    %{discoveryVisibilityScore}
  </p>

  <p className="mt-3 text-sm font-semibold text-cyan-200">
    {discoveryVisibleRuns.length}/
    {discoveryPromptCount} tarafsız soruda marka
    görünür
  </p>

  <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
    <div
      className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
      style={{
        width: `${Math.min(
          discoveryVisibilityScore,
          100
        )}%`,
      }}
    />
  </div>

  <div className="mt-6 grid gap-2 text-xs leading-5 text-slate-400">
    <p>Rapor tarihi: {formatDate(audit.created_at)}</p>
    <p>Sektör: {brand.industry ?? "Belirtilmedi"}</p>
    <p>
      Pazar: {brand.country ?? "TR"} /{" "}
      {brand.language ?? "tr"}
    </p>
  </div>
</div>
                </div>
              </div>
            </section>

          <section>
            <SectionTitle
              eyebrow="01 - Yönetici Özeti"
              title="Ölçüm sonucu ve alınacak karar"
              description={`${completedPromptCount} soruluk test setinin sonucu, rakip konumu ve ölçüm kapsamı.`}
            />

            <div className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
              <p className="text-lg leading-8 text-slate-700">
                {executiveSummary}
              </p>
            </div>

            <div
              className={`mt-6 grid gap-4 ${
                hasCitationMeasurement
                  ? "md:grid-cols-4"
                  : "md:grid-cols-3"
              }`}
            >
              <MetricBox
                  label="Yönlendirmesiz görünürlük"
                  value={`%${discoveryVisibilityScore}`}
                  helper={`${discoveryVisibleRuns.length}/${discoveryPromptCount} tarafsız soruda marka adı geçti`}
                  tone="blue"
                />

                <MetricBox
                    label="Yönlendirmesiz görünürlük payı"
                    value={
                      discoveryTotalMentions > 0
                        ? `${discoveryShareOfVoice}%`
                        : "-"
                    }
                    helper={
                      discoveryTotalMentions > 0
                        ? "Tarafsız sorularda marka ve takip edilen rakiplerin toplam görünürlüğü içindeki pay"
                        : "Tarafsız cevaplarda ölçülen marka veya takip edilen rakip görünmediği için pay hesaplanamadı"
                    }
                    tone="purple"
                  />

                <MetricBox
                  label="Yönlendirmesiz ortalama sıra"
                  value={discoveryAverageRank ?? "-"}
                  helper="Marka tarafsız cevapta geçtiğinde rakiplere göre yaklaşık konum"
                  tone="green"
                />

              {hasCitationMeasurement ? (
                <MetricBox
                  label="Kaynak Kullanımı"
                  value={`${citationScore}/100`}
                  helper="Web kaynağı kullanılan cevaplarda marka sitesinin kaynak gücü"
                  tone="orange"
                />
              ) : null}
            </div>
            {seededRuns.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-950">
                      İsim içeren kontrol soruları ayrı hesaplandı
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Marka veya takip edilen rakip adının soru
                      metninde geçtiği {seededRuns.length} sorunun{" "}
                      {seededVisibleRuns.length} tanesinde marka
                      görünmüştür. Bu sonuçlar yönlendirmesiz keşif
                      skoruna eklenmemiştir.
                    </p>
                  </div>
                ) : null}

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-semibold text-slate-950">
                Bu sonuç nasıl yorumlanmalı?
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Yüzde değerleri genel pazar payı veya tüm yapay zekâ
                platformlarının ortak sonucu değildir. Bu rapor, ölçüm
                tarihinde Gemini üzerinde çalıştırılan{" "}
                {completedPromptCount} soru ve tanımlanmış{" "}
                {citationCompetitors?.length ?? 0} rakip ile sınırlıdır.
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {hasCitationMeasurement
                  ? "Bazı cevaplarda web kaynakları kullanılmıştır. Kaynak kullanımı, markanın Google aramasındaki sıralamasını veya Google AI sonuçlarında kesin olarak gösterildiğini kanıtlamaz."
                  : "Bu ölçümde Gemini web kaynakları kullanılmadan cevap üretmiştir. Bu nedenle sonuçlar modelin mevcut bilgi ve yanıt üretme davranışını gösterir; Google Arama veya Google AI Mode görünürlüğü olarak yorumlanmamalıdır."}
              </p>
            </div>
          </section>

              {score ? (
                <AuditChangeSummary
                  currentScore={score}
                  previousScore={previousScore}
                  currentPromptCount={audit.total_prompts}
                  previousPromptCount={
                    previousAudit?.total_prompts ?? null
                  }
                  currentPromptTexts={currentPromptResults.map(
                    (result) => result.promptText
                  )}
                  previousPromptTexts={previousPromptResults.map(
                    (result) => result.promptText
                  )}
                  previousDate={
                    previousAudit?.created_at ?? null
                  }
                />
              ) : null}
               <PromptVisibilityChanges
                    currentResults={currentPromptResults}
                    previousResults={previousPromptResults}
                  />
              {hasIntentDifference ? (
              <section className="report-page">
              <SectionTitle
                eyebrow="Ek analiz · Soru niyetleri"
                title="Marka hangi kullanıcı ihtiyaçlarında görünür?"
                description="Markanın satın alma, karşılaştırma, yerel öneri ve diğer kullanıcı niyetlerindeki görünürlüğünü gösterir."
              />

              <div className="grid gap-4 md:grid-cols-2">
                {comparableIntents.map((item) => {
                  const isStrongest =
                    hasIntentDifference &&
                    strongestIntent?.intent === item.intent;

                  const isWeakest =
                    hasIntentDifference &&
                    weakestIntent?.intent === item.intent;

                  return (
                    <div
                      key={item.intent}
                        className="print-avoid rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-950">
                              {getIntentLabel(item.intent)}
                            </h3>

                            {isStrongest ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                En güçlü alan
                              </span>
                            ) : null}

                            {isWeakest ? (
                              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                                Gelişim alanı
                              </span>
                            ) : null}

                          </div>

                          <p className="mt-2 text-sm text-slate-600">
                            {item.mentionCount}/{item.total} soruda görünür
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-3xl font-bold text-slate-950">
                            %{item.visibilityRate}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Ortalama sıra: {item.averageRank ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={
                            item.visibilityRate >= 75
                              ? "h-full rounded-full bg-emerald-500"
                              : item.visibilityRate >= 50
                                ? "h-full rounded-full bg-blue-500"
                                : item.visibilityRate >= 25
                                  ? "h-full rounded-full bg-amber-500"
                                  : "h-full rounded-full bg-rose-500"
                          }
                          style={{
                            width: `${item.visibilityRate}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Bu bölüm, her biri en az iki yönlendirmesiz soruyla ölçülen ve
                görünürlük oranları birbirinden farklı kullanıcı niyetlerini
                karşılaştırır.
              </p>
            </section>
          ) : null}
          {competitorStats.length > 0 ? (
            <section>
              <SectionTitle
                eyebrow="02 - Rakip Görünürlüğü"
                title="AI cevaplarında rakip karşılaştırması"
description={`${discoveryPromptCount} yönlendirmesiz soruda markanın ve cevapta gerçekten görünen rakiplerin konumu.`}
              />

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-5 py-4 font-semibold">
                        Marka / Rakip
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Göründüğü soru
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Ortalama sıra
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Ölçümdeki rolü
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="border-b bg-indigo-50">
                      <td className="px-5 py-4 font-semibold text-indigo-900">
                        {brand.name}
                      </td>
                      <td className="px-5 py-4">
                       {discoveryVisibleRuns.length}/{discoveryPromptCount}
                      </td>
                      <td className="px-5 py-4">
                        {discoveryAverageRank ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        Ölçülen marka
                      </td>
                    </tr>

                    {competitorStats.map((competitor) => (
                      <tr
                        key={competitor.name}
                        className="border-b last:border-0"
                      >
                        <td className="px-5 py-4 font-medium">
                          {competitor.name}
                        </td>
                        <td className="px-5 py-4">
                          {competitor.mentionCount}/{discoveryPromptCount}
                        </td>
                        <td className="px-5 py-4">
                          {competitor.averageRank ?? "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          AI cevabında görünen rakip
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                            <p className="mt-3 text-xs leading-5 text-slate-500">
                Tanımlanan{" "}
                {citationCompetitors?.length ?? 0} rakip
                içinden yalnızca yönlendirmesiz AI
                cevaplarında en az bir kez görünen rakipler
                listelenmiştir.
              </p>
            </section>
          ) : (
              <section className="print-avoid">
              <SectionTitle
                eyebrow="02 - Rakip Görünürlüğü"
                title="Yönlendirmesiz cevaplarda rakip görünürlüğü"
                description={`${discoveryPromptCount} tarafsız soruda takip edilen rakiplerin doğal görünürlüğü incelendi.`}
              />

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">
                  Takip edilen rakipler tarafsız cevaplarda görünmedi
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Marka veya rakip adı soru metninde
                  geçmeyen cevaplarda takip edilen{" "}
                  {citationCompetitors?.length ?? 0} rakibin
                  hiçbiri tespit edilmedi. Bu sonuç,
                  rakiplerin genel olarak görünmez olduğu
                  anlamına gelmez; yalnızca bu ölçümdeki{" "}
                  {discoveryPromptCount} yönlendirmesiz
                  soruyu temsil eder.
                </p>
              </div>
            </section>
          )}
          {hasCitationMeasurement ? (
            <CitationSourceIntelligence
              brandName={brand.name}
              brandWebsiteUrl={brand.website_url}
              competitors={(citationCompetitors ?? []).map((competitor) => ({
                name: competitor.name,
                websiteUrl: competitor.website_url,
              }))}
              runs={citationRuns}
              variant="client"
            />
          ) : null}

          {hasWebsiteComparison ? (
            <ClientWebsiteScoreComparison
              brandName={brand.name}
              brandScoresValue={
                websiteSnapshot?.category_scores_json ?? null
              }
              competitors={latestCompetitorWebsiteSnapshots.map(
                (snapshot) => ({
                  id: snapshot.id,
                  name: snapshot.competitor_name,
                  scoresValue: snapshot.category_scores_json,
                })
              )}
            />
          ) : null}

          <ClientEvidenceActionPlan
            brandName={brand.name}
            evidenceItems={clientReportBriefs.evidenceItems}
            actionBriefs={clientReportBriefs.actionBriefs}
          />

          <section className="print-avoid rounded-3xl border border-slate-200 bg-slate-50 p-5">
  <h2 className="font-semibold text-slate-950">
    Ölçüm kapsamı ve sınırlar
  </h2>

  <p className="mt-2 text-sm leading-6 text-slate-600">
  Rapor; Gemini üzerinde çalıştırılan{" "}
  {completedPromptCount} test sorusundan{" "}
  {discoveryPromptCount} yönlendirmesiz keşif sorusu ve{" "}
  {seededRuns.length} isim içeren kontrol sorusu kullanılarak
  hazırlanmıştır. Takip edilen{" "}
  {citationCompetitors?.length ?? 0} rakip
  {websiteSnapshot
    ? " ve otomatik olarak taranabilen marka web sayfaları"
    : ""}
  {" "}analize dahil edilmiştir.
</p>

  <p className="mt-3 text-sm leading-6 text-slate-600">
    {hasCitationMeasurement
      ? "Ölçüm sırasında bazı cevaplarda web kaynakları kullanılmıştır. Bununla birlikte sonuçlar Google Arama sıralaması, Google AI Mode görünürlüğü veya tüm yapay zekâ platformlarındaki görünürlük anlamına gelmez."
      : "Ölçüm sırasında Gemini web kaynakları kullanılmadan cevap üretmiştir. Bu nedenle görünürlük sonuçları model yanıtlarıyla sınırlıdır ve güncel Google arama sonuçlarının doğrudan ölçümü değildir."}
  </p>

  <p className="mt-3 text-sm leading-6 text-slate-600">
    Google yorumları, backlink profili, canlı harita sonuçları,
    reklam görünürlüğü, tüm web’in taranması ve diğer yapay zekâ
    motorları bu raporun kapsamına dahil değildir.
  </p>
</section>
          <section className="client-report-closing report-page">
  <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-7 text-white">
    <div className="w-full">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Sonraki Adım
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            İlk teslimatı netleştirelim
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            İlk görüşmede genel tavsiyeleri tekrar
            etmeyeceğiz. Birinci hafta için önerilen
            teslimatın hedef sayfasını, sorumlusunu,
            kapsamını ve yayın tarihini birlikte
            netleştireceğiz.
          </p>

          {contactName ||
          contactEmail ||
          contactPhone ||
          contactLinkedIn ? (
            <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Raporu hazırlayan
              </p>

              {contactName ? (
                <p className="mt-2 text-xl font-semibold text-white">
                  {contactName}
                </p>
              ) : null}

              <p className="mt-1 text-sm text-slate-300">
                {productName} · AI Görünürlük Analizi
              </p>

              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                {contactEmail ? (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="w-fit transition-colors hover:text-cyan-200"
                  >
                    {contactEmail}
                  </a>
                ) : null}

                {contactPhone ? (
                  <a
                    href={`tel:${contactPhone.replace(
                      /[^\d+]/g,
                      ""
                    )}`}
                    className="w-fit transition-colors hover:text-cyan-200"
                  >
                    {contactPhone}
                  </a>
                ) : null}

                {contactLinkedInUrl ? (
                  <a
                    href={contactLinkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit break-all transition-colors hover:text-cyan-200"
                  >
                    {contactLinkedInLabel}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/20">
          <p className="text-sm text-slate-300">
            Önerilen görüşme
          </p>

          <p className="mt-1 text-2xl font-bold">
            15 dakika
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            Hedef soru, önerilen URL ve başarı ölçütü
            üzerinden ilk teslimatı karara bağlamak için.
          </p>

          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                `${brand.name} AI görünürlük raporu görüşmesi`
              )}`}
              className="report-cta mt-4 inline-flex rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              15 dakikalık görüşme talep et
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-10 border-t border-white/15 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          Görüşmede netleştirilecekler
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-white">
              1. Hedef sayfa
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Mevcut sayfanın mı güçlendirileceği, yeni
              sayfa mı hazırlanacağı.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-white">
              2. Teslimat kapsamı
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              İçerik, teknik kanıt, karşılaştırma ve
              yapısal veri ihtiyaçları.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-white">
              3. Yeniden ölçüm
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Yayın sonrası aynı sorularla kontrol tarihi
              ve başarı ölçütü.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
                       <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 print:hidden">
  <summary className="cursor-pointer list-none p-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Ek · Teknik ayrıntı
        </p>

        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
          Analiz edilen test soruları
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ham test sorularını ve markanın bu sorularda görünüp
          görünmediğini inceleyin.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          {Math.min(analyses?.length ?? 0, 12)} soru
        </span>

        <span className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white group-open:hidden">
          Ayrıntıları göster
        </span>

        <span className="hidden rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white group-open:inline">
          Ayrıntıları gizle
        </span>
      </div>
    </div>
  </summary>

  <div className="border-t border-slate-200 bg-white p-5">
    {analyses && analyses.length > 0 ? (
      <div className="grid gap-3 lg:grid-cols-2">
        {analyses.slice(0, 12).map((analysis, index) => {
          const run = getNestedRun(
            analysis.audit_runs
          );

          return (
            <div
              key={analysis.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
            >
              <div className="mb-2 flex flex-wrap gap-2">
                <span
                  className={
                    analysis.brand_mentioned
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
                      : "rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200"
                  }
                >
                  {analysis.brand_mentioned
                    ? "Göründü"
                    : "Görünmedi"}
                </span>

                {analysis.brand_rank ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Sıra: {analysis.brand_rank}
                  </span>
                ) : null}
              </div>

              <p className="font-medium leading-6 text-slate-950">
                {index + 1}. {getPromptText(run)}
              </p>

              {analysis.summary ? (
                <p className="mt-2 leading-6 text-slate-600">
                  {analysis.summary}
                </p>
              ) : (
                <p className="mt-2 text-slate-500">
                  Bu soru için kısa analiz özeti bulunmuyor.
                </p>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-sm text-slate-600">
        Bu ölçüm için analiz edilmiş test sorusu bulunmuyor.
      </p>
    )}
  </div>
</details>
        </article>
      </div>
    </main>
  );
}