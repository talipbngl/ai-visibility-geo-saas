import {
  CheckCircle2,
  CircleAlert,
  FileText,
  Target,
} from "lucide-react";

import {
  type ClientActionBrief,
  type ClientEvidenceItem,
} from "@/lib/reports/client-action-briefs";
import { getIntentLabel } from "@/lib/ui/labels";

type ClientEvidenceActionPlanProps = {
  brandName: string;
  evidenceItems: ClientEvidenceItem[];
  actionBriefs: ClientActionBrief[];
};

function getStatusPresentation(
  status: ClientEvidenceItem["status"]
) {
  if (status === "missing") {
    return {
      label: "Marka görünmedi",
      className:
        "bg-rose-50 text-rose-700 ring-rose-200",
    };
  }

  if (status === "low_rank") {
    return {
      label: "Marka alt sırada",
      className:
        "bg-amber-50 text-amber-700 ring-amber-200",
    };
  }

  return {
    label: "Marka görünür",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
}

function EvidenceCard({
  item,
}: {
  item: ClientEvidenceItem;
}) {
  const status = getStatusPresentation(item.status);

  return (
    <article className="print-avoid rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.className}`}
        >
          {status.label}
        </span>

        {item.promptIntent ? (
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
            {getIntentLabel(item.promptIntent)}
          </span>
        ) : null}

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {item.engineLabel}
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold leading-6 text-slate-950">
        {item.promptText}
      </h3>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          AI cevabından kısa kanıt
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          “{item.answerExcerpt}”
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p>
          <span className="font-semibold text-slate-950">
            Marka sırası:
          </span>{" "}
          {item.brandRank ?? "Cevapta yok"}
        </p>

        <p>
          <span className="font-semibold text-slate-950">
            Takip edilen rakip eşleşmesi:
          </span>{" "}
          {item.mentionedCompetitors.length > 0
            ? item.mentionedCompetitors.join(", ")
            : "Yok"}
        </p>
      </div>
    </article>
  );
}

function ActionBriefCard({
  action,
}: {
  action: ClientActionBrief;
}) {
  return (
    <article className="print-avoid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-indigo-500 text-sm font-bold">
              {action.week}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
                {action.week}. hafta teslimatı
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Öncelik: {action.priority}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/20">
            {action.deliverable}
          </span>
        </div>

        <h3 className="mt-4 text-xl font-semibold leading-7">
          {action.title}
        </h3>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Neden bu aksiyon?
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {action.reason}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
              Hedef soru
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-indigo-950">
              {action.targetPrompt}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
              Önerilen adres
            </p>
            <p className="mt-2 break-all font-mono text-sm text-cyan-950">
              {action.suggestedPath}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <FileText
              className="size-4 text-indigo-600"
              aria-hidden="true"
            />
            <p className="font-semibold text-slate-950">
              Teslimatta bulunması gerekenler
            </p>
          </div>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {action.requiredSections.map((section) => (
              <li
                className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-700"
                key={section}
              >
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                {section}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <Target
              className="size-4 text-emerald-700"
              aria-hidden="true"
            />
            <p className="font-semibold text-emerald-950">
              Başarı ölçütü
            </p>
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            {action.successMetric}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ClientEvidenceActionPlan({
  brandName,
  evidenceItems,
  actionBriefs,
}: ClientEvidenceActionPlanProps) {
  return (
    <>
      {evidenceItems.length > 0 ? (
        <section>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              03 - Kararı Destekleyen Kanıtlar
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              AI cevaplarında tam olarak ne görüldü?
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Aşağıdaki kartlar yorum değil; ölçümde kullanılan gerçek
              soruların cevaplarından alınan kısa kanıtları, marka konumunu
              ve görünen rakipleri birlikte gösterir.
            </p>
          </div>

          <div className="grid gap-4">
            {evidenceItems.map((item) => (
              <EvidenceCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="report-page">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            04 - Uygulama Planı
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            {brandName} hangi işi, hangi sırayla yapmalı?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Her aksiyon bir hedef soruya, somut teslimata, önerilen sayfa
            adresine ve yeniden ölçülebilir başarı kriterine bağlanmıştır.
          </p>
        </div>

        {actionBriefs.length > 0 ? (
          <div className="grid gap-5">
            {actionBriefs.map((action) => (
              <ActionBriefCard action={action} key={action.id} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2">
              <CircleAlert
                className="size-5 text-amber-700"
                aria-hidden="true"
              />
              <p className="font-semibold text-amber-950">
                Nokta atışı aksiyon üretmek için veri yetersiz
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              En az bir tamamlanmış AI cevabı veya ayrıntılı web sitesi
              taraması bulunmadığı için genel bir tavsiye gösterilmedi.
            </p>
          </div>
        )}

        <div className="print-avoid mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            4. hafta · Yeniden ölçüm
          </p>
          <h3 className="mt-2 font-semibold text-emerald-950">
            Aynı soru setini değiştirmeden yeniden çalıştırın
          </h3>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            Yayınlanan sayfaların etkisini ölçmek için aynı sorular, aynı
            rakip listesi ve aynı AI motoru kullanılmalıdır. Karşılaştırmada
            görünürlük oranı, marka sırası, kaynak seçimi ve rakip farkı
            birlikte değerlendirilmelidir.
          </p>
        </div>
      </section>
    </>
  );
}