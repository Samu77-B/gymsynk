import { EmbedPackagesView } from "@/components/embed-packages-view";

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    theme?: string;
    hideBook?: string;
    bookUrl?: string;
  }>;
};

export default async function EmbedPackagesPage({
  params,
  searchParams,
}: PageProps) {
  const { tenant } = await params;
  const query = await searchParams;

  const theme =
    query.theme === "dark" || query.theme === "reset" || query.theme === "light"
      ? query.theme
      : "reset";

  return (
    <main>
      <EmbedPackagesView
        tenant={tenant}
        theme={theme}
        hideBookButton={query.hideBook === "true"}
        bookUrlOverride={query.bookUrl}
      />
    </main>
  );
}
