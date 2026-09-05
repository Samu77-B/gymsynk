import { AppNav } from "@/components/app-nav";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-10">
        <LoginForm />
      </main>
    </>
  );
}
