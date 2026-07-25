import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI Görünürlük | Marka Takip Paneli",
    template: "%s | AI Görünürlük",
  },
  description:
    "Markanızın yapay zekâ cevaplarındaki görünürlüğünü ölçün, rakiplerle karşılaştırın ve gelişim fırsatlarını keşfedin.",
  applicationName: "AI Görünürlük",
  keywords: [
    "AI görünürlük",
    "yapay zekâ görünürlüğü",
    "marka analizi",
    "rakip analizi",
    "GEO analizi",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}