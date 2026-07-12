import Link from "next/link";
import { notFound } from "next/navigation";

import { getIntentLabel, getPriorityLabel } from "@/lib/ui/labels";
import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, MetricCard, PageHeader } from "@/features/ui/components";

const intentOptions = [
  "buying_intent",
  "comparison",
  "local_recommendation",
  "problem_solution",
  "alternative_search",
  "budget_friendly",
  "premium_choice",
  "trust_reputation",
];

type PromptsPageProps = {
  params: Promise<{
    brandId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function PromptsPage({
  params,
  searchParams,
}: PromptsPageProps) {
  const { brandId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, industry, country, language")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: promptSets } = await supabase
    .from("prompt_sets")
    .select(
      `
      id,
      name,
      description,
      created_at,
      prompts (
        id,
        text,
        intent,
        priority,
        language,
        country,
        city,
        is_active,
        is_archived,
        archived_at,
        created_at
      )
    `
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: true });

  const firstPromptSetId = promptSets?.[0]?.id;

 const allPrompts =
  promptSets?.flatMap((set) => set.prompts ?? []) ?? [];

const visiblePrompts = allPrompts.filter((prompt) => !prompt.is_archived);

  const activePromptCount = visiblePrompts.filter(
  (prompt) => prompt.is_active
).length;

const passivePromptCount = visiblePrompts.filter(
  (prompt) => !prompt.is_active
).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Test Soruları"
        title={`${brand.name} ölçüm soruları`}
        description="AI görünürlük ölçümünde kullanılacak test sorularını hazırla. Sadece aktif sorular yeni ölçümlere dahil edilir."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}`}>
                Marka detayına dön
              </Link>
            </Button>
            <Button asChild variant="outline">
  <Link href={`/dashboard/brands/${brand.id}/prompts/archived`}>
    Arşivlenenler
  </Link>
</Button>

            <form action={`/api/brands/${brand.id}/audits`} method="post">
              <Button type="submit">Ölçüm başlat</Button>
            </form>
          </>
        }
      />

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Soru Setleri"
          description="Gruplanmış test sorusu seti"
          value={promptSets?.length ?? 0}
        />

        <MetricCard
          title="Aktif Sorular"
          description="Yeni ölçümlere dahil edilir"
          value={activePromptCount}
        />

        <MetricCard
          title="Pasif Sorular"
          description="Ölçüme dahil edilmez"
          value={passivePromptCount}
        />
      </section>

      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader>
          <CardTitle>Bu sayfada ne yapacaksın?</CardTitle>
          <CardDescription>
            Önce soru seti oluştur, sonra AI ile soru üret veya manuel soru ekle.
            Hazır olduğunda ölçümü başlat.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">1. Soru seti oluştur</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Satın alma, karşılaştırma veya yerel öneri gibi gruplar aç.
              </p>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">2. Test sorularını hazırla</p>
              <p className="mt-1 text-sm text-muted-foreground">
                AI ile otomatik üret veya elle soru ekle.
              </p>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">3. Ölçüm başlat</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktif sorular üzerinden AI görünürlük raporu oluştur.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>AI ile Test Sorusu Üret</CardTitle>
              <CardDescription>
                Marka ve rakip bilgilerine göre otomatik test soruları oluştur.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                action={`/api/brands/${brand.id}/prompts/generate`}
                method="post"
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="promptCount">Test sorusu sayısı</Label>
                  <Input
                    id="promptCount"
                    name="promptCount"
                    type="number"
                    min="5"
                    max="30"
                    defaultValue="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    İlk test için 10 soru yeterli. Maliyet kontrolü için üst
                    limit 30.
                  </p>
                </div>

                <Button type="submit" className="w-full">
                  AI ile test sorusu üret
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Yeni Soru Seti</CardTitle>
              <CardDescription>
                Test sorularını konu veya niyete göre grupla.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                action={`/api/brands/${brand.id}/prompt-sets`}
                method="post"
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="setName">Set adı *</Label>
                  <Input
                    id="setName"
                    name="name"
                    placeholder="Satın alma soruları"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setDescription">Açıklama</Label>
                  <Textarea
                    id="setDescription"
                    name="description"
                    placeholder="Yüksek satın alma niyetli AI soruları"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Soru setini kaydet
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Manuel Test Sorusu Ekle</CardTitle>
              <CardDescription>
                Belirli bir soruyu doğrudan ölçüme dahil etmek için ekle.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {firstPromptSetId ? (
                <form
                  action={`/api/brands/${brand.id}/prompts`}
                  method="post"
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="promptSetId">Soru seti</Label>
                    <select
                      id="promptSetId"
                      name="promptSetId"
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      defaultValue={firstPromptSetId}
                    >
                      {promptSets?.map((set) => (
                        <option key={set.id} value={set.id}>
                          {set.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="text">Test sorusu *</Label>
                    <Textarea
                      id="text"
                      name="text"
                      placeholder="Türkiye'de alınabilecek en iyi filtre kahve markaları hangileri?"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="intent">Niyet</Label>
                      <select
                        id="intent"
                        name="intent"
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        defaultValue="buying_intent"
                      >
                        {intentOptions.map((intent) => (
                          <option key={intent} value={intent}>
                            {getIntentLabel(intent)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Öncelik</Label>
                      <Input
                        id="priority"
                        name="priority"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue="3"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="language">Dil</Label>
                      <Input
                        id="language"
                        name="language"
                        defaultValue={brand.language || "tr"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Ülke</Label>
                      <Input
                        id="country"
                        name="country"
                        defaultValue={brand.country || "TR"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Şehir</Label>
                      <Input id="city" name="city" placeholder="İstanbul" />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      name="isActive"
                      type="checkbox"
                      defaultChecked
                      className="size-4"
                    />
                    Aktif test sorusu
                  </label>

                  <Button type="submit" className="w-full">
                    Test sorusunu kaydet
                  </Button>
                </form>
              ) : (
                <EmptyState
                  title="Önce soru seti oluştur"
                  description="Manuel test sorusu eklemek için önce bir soru seti gerekir."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Test Sorusu Listesi</CardTitle>
            <CardDescription>
              Aktif sorular yeni ölçümlere dahil edilir. Pasif sorular saklanır
              ama ölçüme girmez.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {promptSets && promptSets.length > 0 ? (
              <div className="space-y-6">
                {promptSets.map((set) => (
                  <div key={set.id} className="space-y-3">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <h3 className="font-semibold">{set.name}</h3>

                      {set.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {set.description}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Açıklama eklenmedi.
                        </p>
                      )}
                    </div>
                     {(() => {
  const setPrompts = (set.prompts ?? []).filter(
    (prompt) => !prompt.is_archived
  );

  return setPrompts.length > 0 ? (
    <div className="space-y-3">
      {setPrompts.map((prompt) => (
        <div
          key={prompt.id}
          className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {getIntentLabel(prompt.intent)}
            </Badge>

            <Badge variant="outline">
              Öncelik: {getPriorityLabel(prompt.priority)}
            </Badge>

            <Badge variant={prompt.is_active ? "default" : "outline"}>
              {prompt.is_active ? "Aktif" : "Pasif"}
            </Badge>
          </div>

          <p className="text-sm font-medium leading-6">{prompt.text}</p>

          <div className="mt-3 flex flex-col justify-between gap-3 border-t pt-3 md:flex-row md:items-center">
            <p className="text-xs text-muted-foreground">
              {prompt.country || "TR"} / {prompt.language || "tr"}
              {prompt.city ? ` / ${prompt.city}` : ""}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/prompts/${prompt.id}/edit`}>
                  Düzenle
                </Link>
              </Button>

              <form action={`/api/prompts/${prompt.id}/toggle`} method="post">
                <Button type="submit" variant="outline" size="sm">
                  {prompt.is_active ? "Pasifleştir" : "Aktifleştir"}
                </Button>
              </form>

              <form action={`/api/prompts/${prompt.id}/archive`} method="post">
                <Button type="submit" variant="outline" size="sm">
                  Arşivle
                </Button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState
      title="Bu sette aktif test sorusu yok"
      description="AI ile soru üret veya manuel olarak test sorusu ekle."
    />
  );
})()}
                    {set.prompts && set.prompts.length > 0 ? (
                      <div className="space-y-3">
                        {set.prompts.map((prompt) => (
                          <div
                            key={prompt.id}
                            className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                          >
                            <div className="mb-3 flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                {getIntentLabel(prompt.intent)}
                              </Badge>

                              <Badge variant="outline">
                                Öncelik: {getPriorityLabel(prompt.priority)}
                              </Badge>

                              <Badge
                                variant={
                                  prompt.is_active ? "default" : "outline"
                                }
                              >
                                {prompt.is_active ? "Aktif" : "Pasif"}
                              </Badge>
                            </div>

                            <p className="text-sm font-medium leading-6">
                              {prompt.text}
                            </p>

                            <div className="mt-3 flex flex-col justify-between gap-3 border-t pt-3 md:flex-row md:items-center">
                              <p className="text-xs text-muted-foreground">
                                {prompt.country || "TR"} /{" "}
                                {prompt.language || "tr"}
                                {prompt.city ? ` / ${prompt.city}` : ""}
                              </p>
                               <Button asChild variant="outline" size="sm">
  <Link href={`/dashboard/prompts/${prompt.id}/edit`}>
    Düzenle
  </Link>
</Button>
                              <form
                                action={`/api/prompts/${prompt.id}/toggle`}
                                method="post"
                              >
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                >
                                  {prompt.is_active
                                    ? "Pasifleştir"
                                    : "Aktifleştir"}
                                </Button>
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="Bu sette henüz test sorusu yok"
                        description="AI ile soru üret veya manuel olarak test sorusu ekle."
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henüz soru seti yok"
                description="İlk ölçüm için önce bir soru seti oluştur."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}