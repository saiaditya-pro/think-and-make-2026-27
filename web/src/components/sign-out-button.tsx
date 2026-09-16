"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      size="icon"
      variant="secondary"
      className="bg-white/10 hover:bg-white/20 text-white"
      onClick={() => signOut({ callbackUrl: "/login" })}
      aria-label="Sign out"
    >
      <LogOut className="size-4" />
    </Button>
  );
}
