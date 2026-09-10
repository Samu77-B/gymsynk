import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

type PageProps = {
  searchParams: Promise<{ tenant?: string; redirect?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;

  return (
    <AuthShell hideLoginLink>
      <LoginForm
        initialTenantSlug={query.tenant}
        redirectTo={query.redirect}
      />
    </AuthShell>
  );
}
