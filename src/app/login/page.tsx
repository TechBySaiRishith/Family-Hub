"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Those details don't match what we have on file.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Left — Editorial side */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-feature text-feature-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border border-background/30 flex items-center justify-center">
            <span className="font-display text-lg italic">F</span>
          </div>
          <span className="text-xs tracking-[0.2em] uppercase opacity-60">Est. 2026</span>
        </div>

        <div className="relative z-10 max-w-lg fade-up">
          <p className="text-xs tracking-[0.25em] uppercase opacity-60 mb-8">
            — Home, organised
          </p>
          <h1 className="font-display text-6xl xl:text-7xl leading-[0.95] tracking-tight mb-8">
            Everything
            <br />
            the family
            <br />
            <em className="font-light">keeps.</em>
          </h1>
          <p className="text-base leading-relaxed opacity-70 max-w-md">
            Places worth remembering. Coupons before they expire. The little
            things, in one quiet hub — kept together so nothing slips.
          </p>
        </div>

        <div className="relative z-10 flex items-end justify-between">
          <div className="text-xs tracking-[0.2em] uppercase opacity-40">
            <span className="block mb-1">N° 001</span>
            <span>Private Edition</span>
          </div>
          <div className="font-display italic text-2xl opacity-40">FamilyHub</div>
        </div>
      </aside>

      {/* Right — Form */}
      <main className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md fade-up">
          <div className="mb-10">
            <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
              Welcome back
            </p>
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight text-balance">
              Sign in to your
              <br />
              <em className="text-accent">family hub.</em>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="border-l-2 border-destructive pl-4 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs tracking-[0.15em] uppercase text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
                placeholder="you@family.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs tracking-[0.15em] uppercase text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="accent"
              size="lg"
              className="w-full mt-8 group"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Enter the hub
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-foreground/10">
            <p className="text-sm text-muted-foreground">
              First time here?{" "}
              <Link href="/register" className="text-foreground underline underline-offset-4 decoration-accent decoration-2 hover:text-accent transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
