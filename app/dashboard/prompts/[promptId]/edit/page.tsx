import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getIntentLabel } from "@/lib/ui/labels";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { PageHeader } from "@/features/ui/components";

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

type EditPromptPageProps = {
  params: Promise<{
    promptId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditPromptPage({
  params,
  searchParams,
}: EditPromptPageProps) {
  const { promptId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: prompt } = await supabase
    .from("prompts")
    .select(
      "id, brand_id, prompt_set_id, text, intent, priority, language, country, city, is_active"
    )
    .eq("id", promptId)
    .maybeSingle();

  if (!prompt) {
    notFound();
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, language, country")
    .eq("id", prompt.brand_id)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: promptSets } = await supabase
    .from("prompt_sets")
    .select("id, name")
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Test Sorusu Düzenleme"
        title="Test sorusunu düzenle"
        description={`${brand.name} için kullanılan test sorusunu güncelle. Bu değişiklik yeni ölçümlerde kullanılır, eski raporlar etkilenmez.`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/dashboard/brands/${brand.id}/prompts`}>
              Test sorularına dön
            </Link>
          </Button>
        }
      />

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle>Düzenleme notu</CardTitle>
            <CardDescription>
              Test sorusu düzenlemek sadece bundan sonra oluşturulacak ölçümleri
              etkiler.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">Öncelik 1-5 arasıdır</p>
              <p className="mt-1 text-muted-foreground">
                5 en yüksek önceliktir. Ölçüm oluşturulurken yüksek öncelikli
                sorular önce seçilir.
              </p>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">Pasif sorular ölçüme girmez</p>
              <p className="mt-1 text-muted-foreground">
                Soruyu silmek yerine pasif yaparak daha sonra tekrar
                kullanabilirsin.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Soru Bilgileri</CardTitle>
            <CardDescription>
              Soru metni, niyet, öncelik ve lokasyon bilgilerini düzenle.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              action={`/api/prompts/${prompt.id}`}
              method="post"
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="promptSetId">Soru seti</Label>
                <select
                  id="promptSetId"
                  name="promptSetId"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  defaultValue={prompt.prompt_set_id}
                  required
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
                  defaultValue={prompt.text}
                  rows={5}
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
                    defaultValue={prompt.intent}
                    required
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
                    defaultValue={prompt.priority ?? 3}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="language">Dil</Label>
                  <Input
                    id="language"
                    name="language"
                    defaultValue={prompt.language || brand.language || "tr"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Ülke</Label>
                  <Input
                    id="country"
                    name="country"
                    defaultValue={prompt.country || brand.country || "TR"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Şehir</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={prompt.city ?? ""}
                    placeholder="İstanbul"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={prompt.is_active}
                  className="size-4"
                />
                Aktif test sorusu
              </label>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <Button asChild variant="outline">
                  <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                    Vazgeç
                  </Link>
                </Button>

                <Button type="submit">Değişiklikleri kaydet</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}