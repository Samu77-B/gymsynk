import { EmbedScheduleView } from "@/components/embed-schedule-view";

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    theme?: string;
    hideBook?: string;
    bookUrl?: string;
  }>;
};

export default async function EmbedSchedulePage({
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
    <main className="m-0 p-0">
      <EmbedScheduleView
        tenant={tenant}
        theme={theme}
        hideBookButton={query.hideBook === "true"}
        bookUrlOverride={query.bookUrl}
      />
    </main>
  );
}
