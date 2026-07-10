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