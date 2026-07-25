import Link from "next/link";

type BrandSection =
  | "overview"
  | "website"
  | "competitors"
  | "prompts"
  | "history";

type BrandSectionNavProps = {
  brandId: string;
  active: BrandSection;
};

const sections: Array<{
  key: BrandSection;
  label: string;
  getHref: (brandId: string) => string;
}> = [
  {
    key: "overview",
    label: "Genel Bakış",
    getHref: (brandId) =>
      `/dashboard/brands/${brandId}`,
  },
  {
    key: "website",
    label: "Web Sitesi",
    getHref: (brandId) =>
      `/dashboard/brands/${brandId}/website`,
  },
  {
    key: "competitors",
    label: "Rakipler",
    getHref: (brandId) =>
      `/dashboard/brands/${brandId}/competitors`,
  },
  {
    key: "prompts",
    label: "Test Soruları",
    getHref: (brandId) =>
      `/dashboard/brands/${brandId}/prompts`,
  },
  {
    key: "history",
    label: "Geçmiş",
    getHref: (brandId) =>
      `/dashboard/brands/${brandId}/history`,
  },
];

export function BrandSectionNav({
  brandId,
  active,
}: BrandSectionNavProps) {
  return (
    <nav
      aria-label="Marka bölümleri"
      className="overflow-x-auto rounded-xl border bg-card p-1"
    >
      <div className="flex min-w-max items-center gap-1">
        <Link
          href="/dashboard/brands"
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Tüm Markalar
        </Link>

        <span
          aria-hidden="true"
          className="mx-1 h-6 w-px bg-border"
        />

        {sections.map((section) => {
          const isActive =
            section.key === active;

          return (
            <Link
              key={section.key}
              href={section.getHref(brandId)}
              aria-current={
                isActive ? "page" : undefined
              }
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}