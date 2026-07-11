"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendDataPoint = {
  date: string;
  visibilityScore: number;
  shareOfVoice: number;
  opportunityScore: number;
};

type VisibilityTrendChartProps = {
  data: TrendDataPoint[];
};

export function VisibilityTrendChart({ data }: VisibilityTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">Grafik için yeterli veri yok</p>
        <p className="mt-1 text-sm text-muted-foreground">
          En az bir analiz edilmiş ölçüm olduğunda trend grafiği burada
          görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickMargin={8} />
          <YAxis domain={[0, 100]} tickMargin={8} />
          <Tooltip />
          <Legend />

          <Line
            type="monotone"
            dataKey="visibilityScore"
            name="Görünürlük Skoru"
            stroke="#2563eb"
            strokeWidth={2}
            dot
          />

          <Line
            type="monotone"
            dataKey="shareOfVoice"
            name="Görünürlük Payı"
            stroke="#16a34a"
            strokeWidth={2}
            dot
          />

          <Line
            type="monotone"
            dataKey="opportunityScore"
            name="Fırsat Skoru"
            stroke="#f59e0b"
            strokeWidth={2}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}