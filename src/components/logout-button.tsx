"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-white/20 bg-transparent text-white hover:bg-white/10"
      onClick={() => void handleLogout()}
    >
      Log out
    </Button>
  );
}
