"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  username: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const result = await signIn("credentials", { ...values, redirect: false });
    if (result?.error) {
      toast.error("Invalid username or password.");
      return;
    }
    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Enter username</Label>
        <Input id="username" placeholder="e.g. school_user" {...register("username")} />
        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-600" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Login"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-50">
      <div className="w-full max-w-md mt-10 rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
        <AppHeader className="rounded-t-2xl" />
        <CardContent className="pt-6 pb-8 px-6">
          <p className="text-xs font-semibold tracking-wide text-sky-600 mb-1">INQUI-LAB · THINK & MAKE</p>
          <CardHeader className="px-0 pt-0 pb-4">
            <CardTitle className="text-base">THINK & MAKE 2026-27</CardTitle>
          </CardHeader>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </div>
    </div>
  );
}
