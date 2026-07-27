"use client";

import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={() => window.print()}
      >
        Profesyonel PDF oluştur
      </Button>
      <p className="max-w-sm text-right text-xs leading-5 text-muted-foreground">
        Yazdırma penceresinde “Üstbilgiler ve altbilgiler” seçeneğini kapatın.
        Böylece tarih, sayfa adresi ve tarayıcı başlığı PDF’ye eklenmez.
      </p>
    </div>
  );
}