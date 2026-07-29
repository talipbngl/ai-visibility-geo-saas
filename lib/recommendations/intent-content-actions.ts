export type IntentContentPlan = {
  label: string;
  title: string;
  action: string;
};

const intentContentPlans: Record<string, IntentContentPlan> = {
  buying_intent: {
    label: "satın alma niyeti",
    title: "Satın alma kararını destekleyen içerik hazırla",
    action:
      "Ürün veya hizmet seçeneklerini, fiyat bilgisini, temel avantajları, kullanım alanlarını ve satın alma adımlarını açıkça anlatan bir karar sayfası hazırlanmalı.",
  },
  comparison: {
    label: "karşılaştırma",
    title: "Karşılaştırma sorularına özel içerik hazırla",
    action:
      "Markanın seçeneklerini rakiplerden ayıran özellikleri, kullanım senaryolarını, avantajları ve sınırlamaları objektif biçimde karşılaştıran bir sayfa hazırlanmalı.",
  },
  local_recommendation: {
    label: "yerel öneri",
    title: "Yerel aramalara özel sayfalar oluştur",
    action:
      "Hizmet verilen şehirler, ilçeler, şubeler, adresler, çalışma saatleri ve bölgesel avantajlar için açıklayıcı yerel sayfalar hazırlanmalı.",
  },
  problem_solution: {
    label: "sorun ve çözüm",
    title: "Müşteri sorunlarını yanıtlayan rehberler oluştur",
    action:
      "Müşterilerin karşılaştığı temel sorunları, olası nedenleri, çözüm adımlarını ve markanın bu süreçte nasıl yardımcı olduğunu anlatan rehber ve sık sorulan sorular içerikleri hazırlanmalı.",
  },
  alternative_search: {
    label: "alternatif arama",
    title: "Alternatif arayan kullanıcılar için içerik hazırla",
    action:
      "Kullanıcıların neden farklı bir seçenek arayabileceğini ve markanın hangi ihtiyaçlarda güçlü bir alternatif olduğunu açıklayan tarafsız içerikler hazırlanmalı.",
  },
  budget_friendly: {
    label: "uygun fiyat",
    title: "Fiyat ve değer avantajını görünür hâle getir",
    action:
      "Fiyat seçenekleri, paketler, kampanyalar, toplam kullanım değeri ve bütçeye göre tercih edilebilecek seçenekler açık biçimde anlatılmalı.",
  },
  premium_choice: {
    label: "üst segment tercih",
    title: "Kalite ve uzmanlık kanıtlarını güçlendir",
    action:
      "Ürün kalitesi, kullanılan malzemeler, uzmanlık, üretim süreci, özel hizmetler ve üst segment tercihi destekleyen kanıtlar ayrı bir içerikte anlatılmalı.",
  },
  trust_reputation: {
    label: "güven ve itibar",
    title: "Güven ve marka itibarı içeriği oluştur",
    action:
      "Müşteri yorumları, referanslar, uzmanlık geçmişi, sertifikalar, açık iletişim bilgileri ve güvence politikaları daha görünür hâle getirilmeli.",
  },
};

export function getIntentContentPlan(
  intent: string | null | undefined
): IntentContentPlan | null {
  if (!intent) return null;

  const normalizedIntent = intent.trim().toLowerCase();

  if (
    !Object.prototype.hasOwnProperty.call(
      intentContentPlans,
      normalizedIntent
    )
  ) {
    return null;
  }

  return {
    ...intentContentPlans[normalizedIntent],
  };
}