import { AppNav } from "@/components/app-nav";
import { JoinForm } from "@/components/join-form";
import { getDefaultTenantSlug } from "@/lib/membership-provision";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  const tenantSlug = params.tenant ?? (await getDefaultTenantSlug());

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <JoinForm
          tenantSlug={tenantSlug}
          cancelled={params.cancelled === "1"}
        />
      </main>
    </>
  );
}
