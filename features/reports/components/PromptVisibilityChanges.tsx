type PromptVisibilityResult = {
  promptText: string;
  mentioned: boolean;
  rank: number | null;
};

type PromptVisibilityChangesProps = {
  currentResults: PromptVisibilityResult[];
  previousResults: PromptVisibilityResult[];
};

function normalizePromptText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

export function PromptVisibilityChanges({
  currentResults,
  previousResults,
}: PromptVisibilityChangesProps) {
  if (
    currentResults.length === 0 ||
    previousResults.length === 0
  ) {
    return null;
  }

  const previousResultMap = new Map(
    previousResults.map((result) => [
      normalizePromptText(result.promptText),
      result,
    ])
  );

  const comparableResults = currentResults
    .map((currentResult) => {
      const previousResult = previousResultMap.get(
        normalizePromptText(currentResult.promptText)
      );

      if (!previousResult) return null;

      return {
        promptText: currentResult.promptText,
        currentMentioned: currentResult.mentioned,
        previousMentioned: previousResult.mentioned,
        currentRank: currentResult.rank,
        previousRank: previousResult.rank,
      };
    })
    .filter(
      (
        result
      ): result is NonNullable<typeof result> =>
        result !== null
    );

  const gainedVisibility = comparableResults
    .filter(
      (result) =>
        !result.previousMentioned &&
        result.currentMentioned
    )
    .slice(0, 3);

  const lostVisibility = comparableResults
    .filter(
      (result) =>
        result.previousMentioned &&
        !result.currentMentioned
    )
    .slice(0, 3);

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
      </div>

      {comparableResults.length === 0 ? (
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
                {comparableResults.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">
                Görünürlük kazanılan
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">
                {gainedVisibility.length}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">
                Görünürlük kaybedilen
              </p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">
                {lostVisibility.length}
              </p>
            </div>
          </div>

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
                        key={result.promptText}
                        className="rounded-xl border border-emerald-200 bg-white p-4"
                      >
                        <p className="text-sm font-medium leading-6 text-slate-950">
                          {result.promptText}
                        </p>

                        <p className="mt-2 text-xs text-emerald-700">
                          Önceki ölçümde görünmüyordu, şimdi
                          görünüyor
                          {result.currentRank
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
                        key={result.promptText}
                        className="rounded-xl border border-rose-200 bg-white p-4"
                      >
                        <p className="text-sm font-medium leading-6 text-slate-950">
                          {result.promptText}
                        </p>

                        <p className="mt-2 text-xs text-rose-700">
                          Önceki ölçümde görünüyordu, şimdi
                          görünmüyor
                          {result.previousRank
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
        Karşılaştırma yalnızca iki ölçümde de aynı metinle
        bulunan test sorularına dayanır.
      </p>
    </section>
  );
}