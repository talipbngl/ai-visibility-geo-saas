export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Bekliyor",
    running: "Çalışıyor",
    completed: "Tamamlandı",
    failed: "Başarısız",
  };

  return labels[status] ?? status;
}

export function getIntentLabel(intent: string) {
  const labels: Record<string, string> = {
    buying_intent: "Satın Alma Niyeti",
    comparison: "Karşılaştırma",
    local_recommendation: "Yerel Öneri",
    problem_solution: "Problem / Çözüm",
    alternative_search: "Alternatif Arama",
    budget_friendly: "Uygun Fiyat",
    premium_choice: "Premium Tercih",
    trust_reputation: "Güven / İtibar",
  };

  return labels[intent] ?? intent;
}

export function getSentimentLabel(sentiment: string | null) {
  if (!sentiment) return "-";

  const labels: Record<string, string> = {
    positive: "Olumlu",
    neutral: "Nötr",
    negative: "Olumsuz",
  };

  return labels[sentiment] ?? sentiment;
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

  return labels[priority] ?? String(priority);
}

export function getRecommendationPriorityLabel(priority: string | null) {
  if (!priority) return "-";

  const labels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
  };

  return labels[priority] ?? priority;
}

export function getImpactLabel(impact: string | null) {
  if (!impact) return "-";

  const labels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
  };

  return labels[impact] ?? impact;
}

export function getEffortLabel(effort: string | null) {
  if (!effort) return "-";

  const labels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
  };

  return labels[effort] ?? effort;
}

export function getCategoryLabel(category: string | null) {
  if (!category) return "-";
  if (category === "website") return "Website";
if (category === "content") return "İçerik";
if (category === "trust") return "Güven";
if (category === "competitor") return "Rakip";
if (category === "measurement") return "Takip";

  const labels: Record<string, string> = {
    content: "İçerik",
    competitor: "Rakip",
    authority: "Otorite",
    brand: "Marka",
    geo: "AI Görünürlük",
    monitoring: "Takip",
  };

  return labels[category] ?? category;
}