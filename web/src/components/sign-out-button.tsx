"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      onClick={() => signOut({ callbackUrl: "/login" })}
      aria-label="Sign out"
    >
      <LogOut className="size-4" />
    </Button>
  );
}
