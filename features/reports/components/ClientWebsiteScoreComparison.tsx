type ScoreKey = "technical" | "structure" | "content" | "trust";

type CompetitorScore = {
  id: string;
  name: string;
  scoresValue: unknown;
};

type ClientWebsiteScoreComparisonProps = {
  brandName: string;
  brandScoresValue: unknown;
  competitors: CompetitorScore[];
};

const scoreItems: Array<{
  key: ScoreKey;
  label: string;
  action: string;
}> = [
  {
    key: "technical",
    label: "Teknik",
    action:
      "Taramada sorun görülen URL’ler için robots/noindex, canonical ve JSON-LD kontrollerini ayrı ayrı tamamlayın; yeniden analizde teknik hata sayısını sıfıra indirin.",
  },
  {
    key: "structure",
    label: "Sayfa yapısı",
    action:
      "H1 sayısı 1 olmayan ve meta açıklaması bulunmayan taranmış URL’leri düzeltin; her sayfada tek H1, özgün başlık ve 140-160 karakterlik açıklama kullanın.",
  },
  {
    key: "content",
    label: "İçerik",
    action:
      "Raporda markanın görünmediği en yüksek öncelikli soru için tek bir karar sayfası yayınlayın; doğrudan cevap, karşılaştırma tablosu, kanıtlar ve SSS bölümlerini aynı URL’de toplayın.",
  },
  {
    key: "trust",
    label: "Güven",
    action:
      "`/hakkimizda/guven-ve-kalite` sayfasında şirket unvanı, doğrulanabilir iletişim kanalları, politika bağlantıları, sertifikalar ve tarihli müşteri kanıtlarını tek yerde yayınlayın.",
  },
];

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getScore(value: unknown, key: ScoreKey | "overall") {
  const record = toRecord(value);
  const score = Number(record[key] ?? 0);

  if (!Number.isFinite(score)) return 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasDetailedScores(value: unknown) {
  const record = toRecord(value);

  return scoreItems.some(({ key }) =>
    Number.isFinite(Number(record[key]))
  );
}

function formatDifference(value: number) {
  if (value > 0) return `+${value}`;

  return String(value);
}

export function ClientWebsiteScoreComparison({
  brandName,
  brandScoresValue,
  competitors,
}: ClientWebsiteScoreComparisonProps) {
  const analyzedCompetitors = competitors.filter((competitor) =>
    hasDetailedScores(competitor.scoresValue)
  );

  const brandHasScores = hasDetailedScores(brandScoresValue);

  if (!brandHasScores || analyzedCompetitors.length === 0) {
    return null;
  }

  function getCompetitorAverage(key: ScoreKey | "overall") {
    const total = analyzedCompetitors.reduce(
      (sum, competitor) => sum + getScore(competitor.scoresValue, key),
      0
    );

    return Math.round(total / analyzedCompetitors.length);
  }

  const rows = scoreItems.map((item) => {
    const brandScore = getScore(brandScoresValue, item.key);
    const competitorAverage = getCompetitorAverage(item.key);

    return {
      ...item,
      brandScore,
      competitorAverage,
      difference: brandScore - competitorAverage,
    };
  });

  const brandOverall = getScore(brandScoresValue, "overall");
  const competitorOverall = getCompetitorAverage("overall");
  const overallDifference = brandOverall - competitorOverall;

  const gaps = [...rows]
    .filter((row) => row.difference < 0)
    .sort((first, second) => first.difference - second.difference)
    .slice(0, 3);

  return (
    <section className="website-score-comparison report-page">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
        Ek analiz · Web sitesi kıyası
      </p>

      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
        Marka ve rakip web sitesi karşılaştırması
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {brandName} ile tam kapsamlı analizi bulunan{" "}
        {analyzedCompetitors.length} rakibin teknik, yapısal, içerik ve güven
        puanlarını karşılaştırır.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Karşılaştırmaya dahil edilen siteler:{" "}
        {analyzedCompetitors
          .map((competitor) => competitor.name)
          .join(", ")}
      </p>

      <div className="print-avoid mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-700">
            Marka genel puanı
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {brandOverall}/100
          </p>
        </div>

        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
          <p className="text-sm font-medium text-violet-700">
            Rakip ortalaması
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {competitorOverall}/100
          </p>
          <p className="mt-2 text-xs leading-5 text-violet-700">
            {analyzedCompetitors.length} tam kapsamlı rakip analizi
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-600">
            Genel puan farkı
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {formatDifference(overallDifference)}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-5 py-4 font-semibold">Kategori</th>
              <th className="px-5 py-4 text-right font-semibold">
                Marka
              </th>
              <th className="px-5 py-4 text-right font-semibold">
                Rakip ortalaması
              </th>
              <th className="px-5 py-4 text-right font-semibold">
                Fark
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="px-5 py-4 font-medium">
                  {row.label}
                </td>
                <td className="px-5 py-4 text-right">
                  {row.brandScore}/100
                </td>
                <td className="px-5 py-4 text-right">
                  {row.competitorAverage}/100
                </td>
                <td
                  className={`px-5 py-4 text-right font-semibold ${
                    row.difference < 0
                      ? "text-rose-700"
                      : row.difference > 0
                        ? "text-emerald-700"
                        : "text-slate-600"
                  }`}
                >
                  {formatDifference(row.difference)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-avoid mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
        <h3 className="font-semibold text-rose-900">
          Öncelikli geliştirme alanları
        </h3>

        {gaps.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {gaps.map((gap, index) => (
              <div
                key={gap.key}
                className="rounded-2xl border border-rose-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-slate-950">
                    {index + 1}. {gap.label}
                  </p>

                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                    {formatDifference(gap.difference)} puan
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {gap.action}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Marka analiz edilen kategorilerde rakip ortalamasının gerisinde
            görünmüyor.
          </p>
        )}
      </div>
    </section>
  );
}