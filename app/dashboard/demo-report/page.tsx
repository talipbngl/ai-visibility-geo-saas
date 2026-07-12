import { DemoReportContent } from "@/features/demo/components/DemoReportContent";

export default function DashboardDemoReportPage() {
  return (
    <DemoReportContent
      backHref="/dashboard"
      backLabel="Dashboard’a dön"
      primaryHref="/dashboard/brands/new"
      primaryLabel="Yeni marka ekle"
    />
  );
}