import {
  buildPromptVisibilityComparison,
  type PromptVisibilityInput,
} from "@/lib/reports/prompt-comparison";

type PromptVisibilityChangesProps = {
  currentResults: PromptVisibilityInput[];
  previousResults: PromptVisibilityInput[];
};

export function PromptVisibilityChanges({
  currentResults,
  previousResults,
}: PromptVisibilityChangesProps) {
  const comparison = buildPromptVisibilityComparison(
    currentResults,
    previousResults
  );

  if (
    comparison.currentUniqueCount === 0 ||
    comparison.previousUniqueCount === 0
  ) {
    return null;
  }

  const allGainedVisibility =
    comparison.gainedVisibility;
  const allLostVisibility =
    comparison.lostVisibility;
  const gainedVisibility =
    allGainedVisibility.slice(0, 3);
  const lostVisibility =
    allLostVisibility.slice(0, 3);

  const reliabilityClassName = {
    high: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    low: "bg-rose-50 text-rose-700",
  }[comparison.reliability.level];

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Soru bazlı değişim
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Hangi sorularda görünürlük değişti?
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Güncel ve önceki ölçümde ortak kullanılan test
          sorularının sonuçları karşılaştırılmıştır.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${reliabilityClassName}`}
          >
            Karşılaştırma güveni:{" "}
            {comparison.reliability.label}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            Ortak soru: {comparison.comparablePromptCount}/
            {comparison.largestPromptSetSize} · %
            {comparison.coverageRate}
          </span>
        </div>
      </div>

      {comparison.comparablePromptCount === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          İki ölçüm arasında ortak test sorusu bulunamadığı
          için soru bazlı görünürlük değişimi hesaplanamadı.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                Karşılaştırılan soru
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {comparison.comparablePromptCount}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">
                Görünürlük kazanılan
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">
                {allGainedVisibility.length}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">
                Görünürlük kaybedilen
              </p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">
                {allLostVisibility.length}
              </p>
            </div>
          </div>

          {comparison.reliability.level === "low" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Ortak soru sayısı veya soru seti kapsamı düşük
              olduğu için bu değişimler genel görünürlük
              gelişimi olarak yorumlanmamalıdır.
            </div>
          ) : null}

          {gainedVisibility.length === 0 &&
          lostVisibility.length === 0 ? (
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              Ortak test sorularında markanın görünürlük
              durumu değişmedi.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {gainedVisibility.length > 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <h3 className="font-semibold text-emerald-950">
                    Görünürlük kazanılan sorular
                  </h3>

                  <div className="mt-4 space-y-3">
                    {gainedVisibility.map((result) => (
                      <div
                        key={result.promptKey}
                        className="rounded-xl border border-emerald-200 bg-white p-4"
                      >
                        <p className="text-sm font-medium leading-6 text-slate-950">
                          {result.promptText}
                        </p>

                        <p className="mt-2 text-xs text-emerald-700">
                          Önceki ölçümde görünmüyordu, şimdi
                          görünüyor
                          {result.currentRank !== null
                            ? ` · Sıra: ${result.currentRank}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {lostVisibility.length > 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <h3 className="font-semibold text-rose-950">
                    Görünürlük kaybedilen sorular
                  </h3>

                  <div className="mt-4 space-y-3">
                    {lostVisibility.map((result) => (
                      <div
                        key={result.promptKey}
                        className="rounded-xl border border-rose-200 bg-white p-4"
                      >
                        <p className="text-sm font-medium leading-6 text-slate-950">
                          {result.promptText}
                        </p>

                        <p className="mt-2 text-xs text-rose-700">
                          Önceki ölçümde görünüyordu, şimdi
                          görünmüyor
                          {result.previousRank !== null
                            ? ` · Önceki sıra: ${result.previousRank}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        Karşılaştırma yalnızca iki ölçümde de bulunan
        benzersiz test sorularına dayanır.
      </p>
    </section>
  );
}