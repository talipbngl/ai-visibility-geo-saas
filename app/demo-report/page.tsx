import { DemoReportContent } from "@/features/demo/components/DemoReportContent";

export default function PublicDemoReportPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <DemoReportContent
          backHref="/"
          backLabel="Ana sayfaya dön"
          primaryHref="/register"
          primaryLabel="Ücretsiz başla"
        />
      </div>
    </main>
  );
}