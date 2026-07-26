import {
  getCategoryLabel,
  getEffortLabel,
  getImpactLabel,
  getRecommendationPriorityLabel,
} from "@/lib/ui/labels";

type ActionPlanRecommendation = {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string | null;
  effort: string | null;
  impact: string | null;
};

type ThirtyDayActionPlanProps = {
  recommendations: ActionPlanRecommendation[];
};

type ActionPlanWeek = {
  week: number;
  title: string;
  description: string;
  actions: ActionPlanRecommendation[];
};

const priorityWeights: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const impactWeights: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const executionWeeks: Omit<ActionPlanWeek, "actions">[] = [
  {
    week: 1,
    title: "Öncelikli başlangıç",
    description:
      "En yüksek öncelikli sorunları giderin ve sonraki çalışmaların temelini hazırlayın.",
  },
  {
    week: 2,
    title: "Uygulama ve içerik geliştirme",
    description:
      "Önerilen sayfa, içerik ve güven iyileştirmelerini uygulayın.",
  },
  {
    week: 3,
    title: "Güçlendirme ve tamamlama",
    description:
      "Kalan aksiyonları tamamlayın ve rakiplere karşı zayıf alanları güçlendirin.",
  },
];

function sortRecommendations(
  recommendations: ActionPlanRecommendation[]
) {
  return [...recommendations].sort((first, second) => {
    const priorityDifference =
      (priorityWeights[second.priority ?? ""] ?? 0) -
      (priorityWeights[first.priority ?? ""] ?? 0);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return (
      (impactWeights[second.impact ?? ""] ?? 0) -
      (impactWeights[first.impact ?? ""] ?? 0)
    );
  });
}

export function ThirtyDayActionPlan({
  recommendations,
}: ThirtyDayActionPlanProps) {
  if (recommendations.length === 0) return null;

  const plannedRecommendations =
    sortRecommendations(recommendations).slice(0, 8);

  const weeks: ActionPlanWeek[] = executionWeeks.map(
    (week) => ({
      ...week,
      actions: [],
    })
  );

  plannedRecommendations.forEach(
    (recommendation, index) => {
      const weekIndex = Math.min(
        2,
        Math.floor(
          (index * executionWeeks.length) /
            plannedRecommendations.length
        )
      );

      weeks[weekIndex].actions.push(recommendation);
    }
  );

  const visibleWeeks = weeks.filter(
    (week) => week.actions.length > 0
  );

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          30 günlük uygulama planı
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Önerileri hangi sırayla uygulamalısınız?
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Aksiyonlar öncelik ve beklenen etkiye göre sıralanmıştır.
          İlk üç hafta uygulama, son hafta yeniden ölçüm için
          ayrılmıştır.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleWeeks.map((week) => (
          <div
            key={week.week}
            className="rounded-3xl border bg-background p-5 shadow-sm print:break-inside-avoid"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white">
                {week.week}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  {week.week}. hafta
                </p>

                <h3 className="mt-1 font-semibold">
                  {week.title}
                </h3>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {week.description}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {week.actions.map((action, index) => (
                <div
                  key={action.id}
                  className="rounded-2xl border bg-muted/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                      {index + 1}
                    </span>

                    <div>
                      <p className="font-medium leading-6">
                        {action.title}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {action.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                          {getCategoryLabel(action.category)}
                        </span>

                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
                          Öncelik:{" "}
                          {getRecommendationPriorityLabel(
                            action.priority
                          )}
                        </span>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                          Etki: {getImpactLabel(action.impact)}
                        </span>

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          Efor: {getEffortLabel(action.effort)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm print:break-inside-avoid">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white">
              4
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                4. hafta
              </p>

              <h3 className="mt-1 font-semibold text-slate-950">
                Kontrol ve yeniden ölçüm
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                Yapılan değişikliklerin etkisini görmek için aynı soru
                setiyle yeni bir AI görünürlük ölçümü başlatın.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4">
            <p className="font-medium text-slate-950">
              Karşılaştırılacak sonuçlar
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>AI görünürlük skoru değişimi</li>
              <li>Görünürlük payı değişimi</li>
              <li>Ortalama sıra değişimi</li>
              <li>Soru niyetlerindeki gelişim</li>
              <li>Rakiplere karşı kapanan farklar</li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Plan mevcut ölçüm ve web sitesi analizlerinden üretilmiştir.
        Uygulama süresi markanın teknik ve içerik kaynaklarına göre
        değişebilir.
      </p>
    </section>
  );
}