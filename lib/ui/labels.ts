export function getStatusLabel(status: string | null | undefined) {
  if (!status) return "Durum belirtilmedi";

  const labels: Record<string, string> = {
    pending: "Bekliyor",
    queued: "Sırada",
    running: "Çalışıyor",
    processing: "İşleniyor",
    completed: "Tamamlandı",
    partial: "Kısmen tamamlandı",
    failed: "Başarısız",
    cancelled: "İptal edildi",
    canceled: "İptal edildi",
    draft: "Taslak",
    active: "Aktif",
    inactive: "Pasif",
    archived: "Arşivlendi",
    new: "Yeni",
    contacted: "İletişime geçildi",
    qualified: "Uygun",
    closed: "Kapatıldı",
    rejected: "Reddedildi",
    stale: "Zaman aşımına uğradı",
  };

  return labels[status.toLowerCase()] ?? "Bilinmeyen durum";
}

export function getIntentLabel(intent: string | null | undefined) {
  if (!intent) return "Niyet belirtilmedi";

  const labels: Record<string, string> = {
    buying_intent: "Satın Alma Niyeti",
    comparison: "Karşılaştırma",
    local_recommendation: "Yerel Öneri",
    problem_solution: "Sorun ve Çözüm",
    alternative_search: "Alternatif Arama",
    budget_friendly: "Uygun Fiyat",
    premium_choice: "Üst Segment Tercih",
    trust_reputation: "Güven ve İtibar",
  };

  return labels[intent.toLowerCase()] ?? "Diğer";
}

export function getSentimentLabel(sentiment: string | null | undefined) {
  if (!sentiment) return "-";

  const labels: Record<string, string> = {
    positive: "Olumlu",
    neutral: "Nötr",
    negative: "Olumsuz",
    mixed: "Karma",
    unknown: "Belirsiz",
  };

  return labels[sentiment.toLowerCase()] ?? "Belirsiz";
}

export function getPriorityLabel(priority: number | null | undefined) {
  if (!priority) return "-";

  const labels: Record<number, string> = {
    1: "Düşük",
    2: "Orta-Düşük",
    3: "Orta",
    4: "Yüksek",
    5: "Çok Yüksek",
  };

  return labels[priority] ?? "Belirtilmedi";
}

export function getRecommendationPriorityLabel(
  priority: string | null | undefined
) {
  if (!priority) return "Belirtilmedi";

  const labels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    critical: "Kritik",
  };

  return labels[priority.toLowerCase()] ?? "Belirtilmedi";
}

export function getImpactLabel(impact: string | null | undefined) {
  if (!impact) return "Belirtilmedi";

  const labels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    critical: "Kritik",
  };

  return labels[impact.toLowerCase()] ?? "Belirtilmedi";
}

export function getEffortLabel(effort: string | null | undefined) {
  if (!effort) return "Belirtilmedi";

  const labels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
  };

  return labels[effort.toLowerCase()] ?? "Belirtilmedi";
}

export function getCategoryLabel(category: string | null | undefined) {
  if (!category) return "Kategori belirtilmedi";

  const labels: Record<string, string> = {
    website: "Web Sitesi",
    content: "İçerik",
    trust: "Güven",
    competitor: "Rakip",
    measurement: "Ölçüm",
    authority: "Otorite",
    brand: "Marka",
    geo: "AI Görünürlüğü",
    monitoring: "Takip",
    technical: "Teknik",
    seo: "Arama Motoru Optimizasyonu",
  };

  return labels[category.toLowerCase()] ?? "Diğer";
}