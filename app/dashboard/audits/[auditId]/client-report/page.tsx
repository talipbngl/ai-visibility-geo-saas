import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintReportButton } from "@/features/reports/components/PrintReportButton";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
export const metadata = {
  title: "AI Görünürlük Ön Teşhis Raporu",
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

type Signal = {
  keyword: string;
  count: number;
  found: boolean;
};

type NestedPrompt = {
  text?: string | null;
  intent?: string | null;
  priority?: number | null;
};

type NestedRun = {
  prompt_text_snapshot?: string | null;
  prompt_intent_snapshot?: string | null;
  prompt_priority_snapshot?: number | null;
  prompts?: NestedPrompt | NestedPrompt[] | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getScoreLevel(score: number) {
  if (score >= 75) return "Güçlü";
  if (score >= 50) return "Orta";
  if (score >= 25) return "Zayıf";

  return "Kritik";
}

function getScoreComment(score: number, brandName: string) {
  if (score >= 75) {
    return `${brandName}, analiz edilen AI cevaplarında güçlü bir görünürlük gösteriyor. Bu durum markanın kategori içinde iyi tanındığını ve öneri cevaplarında yer alma ihtimalinin yüksek olduğunu gösterir.`;
  }

  if (score >= 50) {
    return `${brandName}, bazı AI cevaplarında görünür durumda ancak rakiplerle kıyaslandığında iyileştirme alanları bulunuyor.`;
  }

  if (score >= 25) {
    return `${brandName} için AI görünürlüğü sınırlı. Marka, birçok önemli kullanıcı niyetinde rakiplerin gerisinde kalabilir.`;
  }

  return `${brandName}, analiz edilen AI cevaplarında ciddi şekilde düşük görünürlük gösteriyor. Bu durum içerik, otorite ve kategori sinyalleri açısından önemli bir fırsat alanı yaratıyor.`;
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

function toSignalArray(value: unknown): Signal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const signal = item as Partial<Signal>;

      return {
        keyword: String(signal.keyword ?? ""),
        count: Number(signal.count ?? 0),
        found: Boolean(signal.found),
      };
    })
    .filter((item): item is Signal => Boolean(item?.keyword));
}

function getFoundSignals(value: unknown) {
  return toSignalArray(value).filter((signal) => signal.found);
}

function getMissingSignals(value: unknown) {
  return toSignalArray(value).filter((signal) => !signal.found);
}

function getAverageScore(values: number[]) {
  if (values.length === 0) return null;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getBadgeColor(index: number) {
  const colors = [
    "bg-blue-50 text-blue-700 ring-blue-200",
    "bg-violet-50 text-violet-700 ring-violet-200",
    "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "bg-amber-50 text-amber-700 ring-amber-200",
    "bg-rose-50 text-rose-700 ring-rose-200",
  ];

  return colors[index % colors.length];
}
function getPriorityText(value: string | null) {
  if (value === "high") return "Yüksek";
  if (value === "medium") return "Orta";
  if (value === "low") return "Düşük";

  return "Belirsiz";
}

function getImpactText(value: string | null) {
  if (value === "high") return "Yüksek";
  if (value === "medium") return "Orta";
  if (value === "low") return "Düşük";

  return "Belirsiz";
}

function getEffortText(value: string | null) {
  if (value === "high") return "Yüksek";
  if (value === "medium") return "Orta";
  if (value === "low") return "Düşük";

  return "Belirsiz";
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

function FindingCard({
  index,
  title,
  evidence,
  action,
}: {
  index: number;
  title: string;
  evidence: string;
  action: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white">
          {index}
        </div>
        <p className="font-semibold text-slate-950">{title}</p>
      </div>

      <div className="space-y-3 text-sm leading-6 text-slate-600">
        <p>
          <span className="font-semibold text-slate-950">Kanıt: </span>
          {evidence}
        </p>
        <p>
          <span className="font-semibold text-slate-950">Aksiyon: </span>
          {action}
        </p>
      </div>
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
    .select("id, name, website_url, industry, country, language")
    .eq("id", audit.brand_id)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: score } = await supabase
    .from("audit_scores")
    .select(
      "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, citation_score, competitor_gap_score, opportunity_score"
    )
    .eq("audit_id", audit.id)
    .maybeSingle();

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("id, category, title, description, priority, effort, impact")
    .eq("audit_id", audit.id)
    .order("created_at", { ascending: true });

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

  const { data: websiteSnapshots } = await supabase
    .from("brand_website_snapshots")
    .select(
      "id, website_url, title, meta_description, word_count, content_score, service_signals_json, trust_signals_json, created_at"
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
      competitor_id: snapshot.competitor_id,
      competitor_name: competitor?.name ?? "Rakip",
      website_url: snapshot.website_url,
      content_score: Number(snapshot.content_score ?? 0),
      word_count: Number(snapshot.word_count ?? 0),
      service_signals_json: snapshot.service_signals_json,
      trust_signals_json: snapshot.trust_signals_json,
      created_at: snapshot.created_at,
    };
  });

  const visibilityScore = Math.round(Number(score?.visibility_score ?? 0));
  const shareOfVoice = Math.round(Number(score?.share_of_voice ?? 0));
  const positiveSentimentRate = Math.round(
    Number(score?.positive_sentiment_rate ?? 0)
  );
  const citationScore = Math.round(Number(score?.citation_score ?? 0));
  const averageRank = score?.average_rank ?? null;

  const visibleAnalyses =
    analyses?.filter((analysis) => analysis.brand_mentioned) ?? [];

  const invisibleAnalyses =
    analyses?.filter((analysis) => !analysis.brand_mentioned) ?? [];

  const competitorStatsMap = new Map<
    string,
    {
      name: string;
      mentionCount: number;
      rankSum: number;
      rankCount: number;
    }
  >();

  (analyses ?? []).forEach((analysis) => {
    const competitors = Array.isArray(analysis.competitors_json)
      ? (analysis.competitors_json as CompetitorVisibility[])
      : [];

    competitors.forEach((competitor) => {
      if (!competitor.mentioned) return;

      const current = competitorStatsMap.get(competitor.name) ?? {
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

      competitorStatsMap.set(competitor.name, current);
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

  const brandWebsiteScore = websiteSnapshot
    ? Math.round(Number(websiteSnapshot.content_score ?? 0))
    : null;

  const competitorAverageWebsiteScore = getAverageScore(
    latestCompetitorWebsiteSnapshots.map((snapshot) => snapshot.content_score)
  );

  const foundServiceSignals = websiteSnapshot
    ? getFoundSignals(websiteSnapshot.service_signals_json)
    : [];

  const foundTrustSignals = websiteSnapshot
    ? getFoundSignals(websiteSnapshot.trust_signals_json)
    : [];

  const missingServiceSignals = websiteSnapshot
    ? getMissingSignals(websiteSnapshot.service_signals_json)
    : [];

  const missingTrustSignals = websiteSnapshot
    ? getMissingSignals(websiteSnapshot.trust_signals_json)
    : [];

  const topRecommendations = (recommendations ?? []).slice(0, 4);
  const strongestCompetitor = competitorStats[0] ?? null;

  const topFindings = [
    {
      title:
        invisibleAnalyses.length === 0
          ? "AI görünürlüğü güçlü"
          : "Bazı AI cevaplarında görünürlük açığı var",
      evidence:
        invisibleAnalyses.length === 0
          ? `${brand.name}, analiz edilen ${audit.total_prompts} sorunun tamamında görünür durumda. Ortalama sıra ${averageRank ?? "-"} olarak ölçüldü.`
          : `${brand.name}, ${audit.total_prompts} sorunun ${invisibleAnalyses.length} tanesinde görünmedi.`,
      action:
        invisibleAnalyses.length === 0
          ? "Mevcut görünürlüğü korumak için kategori içerikleri ve rakip karşılaştırma içerikleri düzenli güncellenmeli."
          : "Markanın görünmediği soru niyetleri için hizmet sayfaları, SSS ve karşılaştırma içerikleri hazırlanmalı.",
    },
    {
      title: "Rakipler aynı cevaplarda güçlü şekilde yer alıyor",
      evidence: strongestCompetitor
        ? `${strongestCompetitor.name}, ${strongestCompetitor.mentionCount}/${audit.completed_prompts} cevapta görünerek en görünür rakip oldu.`
        : "Analiz edilen cevaplarda belirgin rakip görünürlüğü tespit edilmedi.",
      action:
        "Rakiplerin öne çıktığı cevap tipleri incelenerek markanın farklılaşma mesajları ve kategori otoritesi güçlendirilmeli.",
    },
    {
      title: "Website sinyallerinde iyileştirme alanı var",
      evidence:
        brandWebsiteScore !== null
          ? `Marka website skoru ${brandWebsiteScore}/100. Rakip website ortalaması ${
              competitorAverageWebsiteScore ?? "-"
            }/100.`
          : "Marka website analizi henüz yapılmamış.",
      action:
        "Ana sayfa başlıkları, hizmet açıklamaları, güven unsurları ve SSS alanları daha net hale getirilmeli.",
    },
  ];

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
            <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white">            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />

            <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  AI Görünürlük Ön Teşhis Raporu
                </p>

                <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-tight">
                  {brand.name}
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  Bu rapor; AI cevap görünürlüğü, rakip görünürlüğü, website
                  içerik sinyalleri ve uygulanabilir aksiyon alanlarını yönetici
                  özeti formatında sunar.
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                    {brand.industry ?? "Sektör belirtilmedi"}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                    {brand.country ?? "TR"}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                    {brand.language ?? "tr"}
                  </span>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur">
                <p className="text-sm text-slate-300">Genel görünürlük skoru</p>
                <p className="mt-3 text-7xl font-bold">{visibilityScore}</p>
                <p className="mt-1 text-2xl font-semibold text-cyan-200">/100</p>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
                    style={{ width: `${Math.min(visibilityScore, 100)}%` }}
                  />
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-300">
                  Durum:{" "}
                  <span className="font-semibold text-white">
                    {getScoreLevel(visibilityScore)}
                  </span>
                </p>

                <p className="mt-6 text-xs leading-5 text-slate-400">
                  Analiz tarihi: {formatDate(audit.created_at)}
                </p>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle
              eyebrow="01 - Yönetici Özeti"
              title="Karar verici özeti"
              description="Bu bölüm raporun tamamından çıkan en önemli sonuçları kısa ve anlaşılır şekilde özetler."
            />

            <div className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
              <p className="text-lg leading-8 text-slate-700">
                {getScoreComment(visibilityScore, brand.name)}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <MetricBox
                label="AI Görünürlük"
                value={`${visibilityScore}/100`}
                helper="Markanın AI cevaplarında görünme gücü"
                tone="blue"
              />

              <MetricBox
                label="Görünürlük Payı"
                value={`${shareOfVoice}%`}
                helper="Rakiplere göre marka payı"
                tone="purple"
              />

              <MetricBox
                label="Ortalama Sıra"
                value={averageRank ?? "-"}
                helper="Marka geçtiğinde yaklaşık konum"
                tone="green"
              />

             <MetricBox
                    label="Kaynak Skoru"
                    value={`${citationScore}/100`}
                    helper="Grounding kaynak kullanım gücü"
                    tone="orange"
                    />
            </div>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-950">Skorlar nasıl okunmalı?</h3>

            <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-4">
                <p>
                <span className="font-semibold text-slate-950">
                    AI Görünürlük Skoru:
                </span>{" "}
                Markanın analiz edilen test sorularının kaçında AI cevabında geçtiğini
                gösterir.
                </p>

                <p>
                <span className="font-semibold text-slate-950">
                    Görünürlük Payı:
                </span>{" "}
                Marka ve takip edilen rakiplerin toplam görünürlüğü içinde markanın payını
                gösterir.
                </p>

                <p>
                <span className="font-semibold text-slate-950">
                    Ortalama Sıra:
                </span>{" "}
                Marka cevapta geçtiğinde rakiplere göre yaklaşık kaçıncı sırada
                göründüğünü gösterir.
                </p>
                <p>
  <span className="font-semibold text-slate-950">
    Kaynak Skoru:
  </span>{" "}
  Gemini grounding çıktısında web kaynakları dönüp dönmediğini ve markanın
  kendi web sitesinin kaynaklar arasında yer alıp almadığını gösterir.
</p>
            </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {topFindings.map((finding, index) => (
                <FindingCard
                  key={finding.title}
                  index={index + 1}
                  title={finding.title}
                  evidence={finding.evidence}
                  action={finding.action}
                />
              ))}
            </div>
          </section>

          <section className="print:break-after-page">
            <SectionTitle
              eyebrow="02 - Rakip Görünürlüğü"
              title="AI cevaplarında rakip karşılaştırması"
              description="Analiz edilen AI cevaplarında markanın ve rakiplerin ne kadar sık geçtiğini gösterir."
            />

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Marka / Rakip</th>
                    <th className="px-5 py-4 font-semibold">Görünme</th>
                    <th className="px-5 py-4 font-semibold">Ortalama sıra</th>
                    <th className="px-5 py-4 font-semibold">Yorum</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-indigo-50">
                    <td className="px-5 py-4 font-semibold text-indigo-900">
                      {brand.name}
                    </td>
                    <td className="px-5 py-4">
                      {visibleAnalyses.length}/{audit.completed_prompts}
                    </td>
                    <td className="px-5 py-4">{averageRank ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-600">
                      Takip edilen ana marka
                    </td>
                  </tr>

                  {competitorStats.map((competitor) => (
                    <tr key={competitor.name} className="border-b last:border-0">
                      <td className="px-5 py-4 font-medium">{competitor.name}</td>
                      <td className="px-5 py-4">
                        {competitor.mentionCount}/{audit.completed_prompts}
                      </td>
                      <td className="px-5 py-4">
                        {competitor.averageRank ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        AI cevaplarında takip edilen rakip
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="print:break-after-page">
            <SectionTitle
              eyebrow="03 - Website Sinyalleri"
              title="Marka ve rakip website karşılaştırması"
              description="Ana sayfa içerik sinyalleri üzerinden marka ve rakiplerin görünürlük destekleyici sinyalleri karşılaştırılır."
            />

            <div className="grid gap-4 md:grid-cols-3">
              <MetricBox
                label="Marka Website Skoru"
                value={brandWebsiteScore !== null ? `${brandWebsiteScore}/100` : "-"}
                helper="Ana sayfa içerik sinyali"
                tone="blue"
              />

              <MetricBox
                label="Rakip Ortalaması"
                value={
                  competitorAverageWebsiteScore !== null
                    ? `${competitorAverageWebsiteScore}/100`
                    : "-"
                }
                helper="Analiz edilen rakiplerin ortalaması"
                tone="purple"
              />

              <MetricBox
                label="Analiz Edilen Rakip"
                value={latestCompetitorWebsiteSnapshots.length}
                helper="Website analizi bulunan rakip sayısı"
                tone="green"
              />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-950">
                  Bulunan sektör / hizmet sinyalleri
                </h3>

                <div className="mt-4 flex flex-wrap gap-2">
                  {foundServiceSignals.length > 0 ? (
                    foundServiceSignals.map((signal, index) => (
                      <span
                        key={signal.keyword}
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${getBadgeColor(
                          index
                        )}`}
                      >
                        {signal.keyword}: {signal.count}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Hizmet sinyali bulunamadı.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-950">
                  Bulunan güven sinyalleri
                </h3>

                <div className="mt-4 flex flex-wrap gap-2">
                  {foundTrustSignals.length > 0 ? (
                    foundTrustSignals.map((signal, index) => (
                      <span
                        key={signal.keyword}
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${getBadgeColor(
                          index + 2
                        )}`}
                      >
                        {signal.keyword}: {signal.count}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Güven sinyali bulunamadı.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                <h3 className="font-semibold text-rose-900">
                  Eksik görünen hizmet sinyalleri
                </h3>

                <div className="mt-4 flex flex-wrap gap-2">
                  {missingServiceSignals.slice(0, 12).map((signal) => (
                    <span
                      key={signal.keyword}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200"
                    >
                      {signal.keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-semibold text-amber-900">
                  Eksik görünen güven sinyalleri
                </h3>

                <div className="mt-4 flex flex-wrap gap-2">
                  {missingTrustSignals.slice(0, 12).map((signal) => (
                    <span
                      key={signal.keyword}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
                    >
                      {signal.keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Rakip</th>
                    <th className="px-5 py-4 font-semibold">Website</th>
                    <th className="px-5 py-4 font-semibold">Website skoru</th>
                    <th className="px-5 py-4 font-semibold">Kelime</th>
                  </tr>
                </thead>
                <tbody>
                  {latestCompetitorWebsiteSnapshots
                    .sort((a, b) => b.content_score - a.content_score)
                    .map((snapshot) => (
                      <tr key={snapshot.id} className="border-b last:border-0">
                        <td className="px-5 py-4 font-medium">
                          {snapshot.competitor_name}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {snapshot.website_url}
                        </td>
                        <td className="px-5 py-4 font-semibold">
                          {snapshot.content_score}/100
                        </td>
                        <td className="px-5 py-4">{snapshot.word_count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="print:break-after-page">
            <SectionTitle
              eyebrow="04 - Aksiyon Planı"
              title="Öncelikli iyileştirme önerileri"
              description="Bu bölüm analiz edilen AI cevapları, website sinyalleri ve rakip karşılaştırmasına göre uygulanabilir aksiyonları özetler."
            />

            <div className="grid gap-4">
              {topRecommendations.length > 0 ? (
                topRecommendations.map((recommendation, index) => (
                  <div
                    key={recommendation.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                        {index + 1}. aksiyon
                      </span>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
                        Öncelik: {getPriorityText(recommendation.priority)}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                        Etki: {getImpactText(recommendation.impact)}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                        Efor: {getEffortText(recommendation.effort)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-950">
                      {recommendation.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {recommendation.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                  Henüz aksiyon önerisi bulunmuyor.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-950">Metodoloji notu</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Bu rapor; Gemini tabanlı AI cevap testi, ana sayfa website
                sinyalleri ve analiz edilen rakip website verileri üzerinden
                hazırlanmış bir ön teşhis raporudur. Google yorumları,
                backlinkler, tüm site crawl verisi ve canlı harita verisi bu MVP
                kapsamına dahil değildir.
              </p>
            </div>
          </section>
          <section>
  <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-7 text-white">
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Sonraki Adım
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight">
          Bu ön teşhisi detaylı aksiyon planına dönüştürelim
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Bu rapor bir ön analizdir. Bir sonraki adımda markanın görünmediği
          sorular, rakiplerin öne çıktığı alanlar ve website içerik eksikleri
          üzerinden uygulanabilir 30 günlük aksiyon planı çıkarılabilir.
        </p>
      </div>

      <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/20">
        <p className="text-sm text-slate-300">Önerilen görüşme</p>
        <p className="mt-1 text-2xl font-bold">15 dakika</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Raporun sonuçlarını birlikte yorumlamak ve ilk aksiyonları belirlemek
          için kısa bir görüşme planlanabilir.
        </p>

        <a
          href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ""}?subject=${encodeURIComponent(
            `${brand.name} AI görünürlük raporu görüşmesi`
          )}`}
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Görüşme talep et
        </a>
      </div>
    </div>
  </div>
</section>
          <section>
            <SectionTitle
              eyebrow="05 - Ek"
              title="Analiz edilen test soruları"
              description="Bu bölüm ham test sorularını ve markanın bu sorularda görünüp görünmediğini gösterir. Yönetici özeti için değil, detay inceleme içindir."
            />

            <div className="grid gap-3 lg:grid-cols-2">
                    {(analyses ?? []).slice(0, 12).map((analysis, index) => {
                const run = getNestedRun(analysis.audit_runs);

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
                        {analysis.brand_mentioned ? "Göründü" : "Görünmedi"}
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

                    <p className="mt-2 leading-6 text-slate-600">
                      {analysis.summary}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}