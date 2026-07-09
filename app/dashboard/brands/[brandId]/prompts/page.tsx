import Link from "next/link";
import { notFound } from "next/navigation";

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
        created_at
      )
    `
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: true });

  const firstPromptSetId = promptSets?.[0]?.id;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
        <div>
          <p className="text-sm text-muted-foreground">Prompt yönetimi</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {brand.name} promptları
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI görünürlük auditinde çalıştırılacak soruları burada hazırlıyoruz.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
  <Button asChild variant="outline">
    <Link href={`/dashboard/brands/${brand.id}`}>Marka detayına dön</Link>
  </Button>

  <form action={`/api/brands/${brand.id}/audits`} method="post">
    <Button type="submit">Audit başlat</Button>
  </form>
</div>
      </section>

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Yeni Prompt Seti</CardTitle>
              <CardDescription>
                Promptları satın alma, karşılaştırma veya yerel öneri gibi gruplara ayır.
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
                    placeholder="Satın alma promptları"
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
                  Prompt setini kaydet
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
  <CardHeader>
    <CardTitle>AI ile Prompt Üret</CardTitle>
    <CardDescription>
      Marka ve rakip bilgilerine göre otomatik prompt önerileri oluştur.
    </CardDescription>
  </CardHeader>

  <CardContent>
    <form
      action={`/api/brands/${brand.id}/prompts/generate`}
      method="post"
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="promptCount">Prompt sayısı</Label>
        <Input
          id="promptCount"
          name="promptCount"
          type="number"
          min="5"
          max="30"
          defaultValue="10"
        />
        <p className="text-xs text-muted-foreground">
          İlk test için 10 prompt yeterli. Maliyet kontrolü için üst limit 30.
        </p>
      </div>

      <Button type="submit" className="w-full">
        AI ile prompt üret
      </Button>
    </form>
  </CardContent>
</Card>

          <Card>
            <CardHeader>
              <CardTitle>Yeni Prompt Ekle</CardTitle>
              <CardDescription>
                Önce en az bir prompt seti oluşturmalısın.
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
                    <Label htmlFor="promptSetId">Prompt seti</Label>
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
                    <Label htmlFor="text">Prompt *</Label>
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
                      <Label htmlFor="intent">Intent</Label>
                      <select
                        id="intent"
                        name="intent"
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        defaultValue="buying_intent"
                      >
                        {intentOptions.map((intent) => (
                          <option key={intent} value={intent}>
                            {intent}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
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
                    Aktif prompt
                  </label>

                  <Button type="submit" className="w-full">
                    Promptu kaydet
                  </Button>
                </form>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="font-medium">Önce prompt seti oluştur</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Prompt eklemek için bir set gerekir.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Prompt Listesi</CardTitle>
            <CardDescription>
              Audit çalıştırırken bu aktif promptlar kullanılacak.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {promptSets && promptSets.length > 0 ? (
              <div className="space-y-6">
                {promptSets.map((set) => (
                  <div key={set.id} className="space-y-3">
                    <div>
                      <h3 className="font-semibold">{set.name}</h3>
                      {set.description ? (
                        <p className="text-sm text-muted-foreground">
                          {set.description}
                        </p>
                      ) : null}
                    </div>

                    {set.prompts && set.prompts.length > 0 ? (
                      <div className="space-y-3">
                        {set.prompts.map((prompt) => (
                          <div
                            key={prompt.id}
                            className="rounded-lg border p-4"
                          >
                            <div className="mb-2 flex flex-wrap gap-2">
                              <Badge variant="secondary">{prompt.intent}</Badge>
                              <Badge variant="outline">
                                Priority {prompt.priority}
                              </Badge>
                              <Badge variant={prompt.is_active ? "default" : "outline"}>
                                {prompt.is_active ? "Aktif" : "Pasif"}
                              </Badge>
                            </div>

                            <p className="text-sm font-medium">{prompt.text}</p>

                            <p className="mt-2 text-xs text-muted-foreground">
                              {prompt.country || "TR"} / {prompt.language || "tr"}
                              {prompt.city ? ` / ${prompt.city}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Bu sette henüz prompt yok.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Henüz prompt seti yok</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  İlk audit için önce prompt seti oluştur.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}