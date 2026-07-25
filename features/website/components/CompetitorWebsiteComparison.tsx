import { CompetitorScoreComparison } from "@/features/website/components/CompetitorScoreComparison";

type BrandWebsiteSnapshot = {
  category_scores_json: unknown;
} | null;

type CompetitorWebsiteSnapshot = {
  id: string;
  competitor_name: string;
  category_scores_json: unknown;
};

type CompetitorWebsiteComparisonProps = {
  brandName: string;
  brandSnapshot: BrandWebsiteSnapshot;
  competitorSnapshots: CompetitorWebsiteSnapshot[];
};

export function CompetitorWebsiteComparison({
  brandName,
  brandSnapshot,
  competitorSnapshots,
}: CompetitorWebsiteComparisonProps) {
  return (
    <CompetitorScoreComparison
      brandName={brandName}
      brandScoresValue={
        brandSnapshot?.category_scores_json ?? null
      }
      competitors={competitorSnapshots.map((snapshot) => ({
        id: snapshot.id,
        name: snapshot.competitor_name,
        scoresValue: snapshot.category_scores_json,
      }))}
    />
  );
}