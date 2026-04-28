"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, Crown, Users } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<{ isFirstUser: boolean; userCount: number } | null>(null);

  useEffect(() => {
    fetch("/api/setup-status")
      .then((r) => r.json())
      .then(setSetupStatus);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      inviteCode: (formData.get("inviteCode") as string) || "first-user",
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Registration failed");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    router.push("/");
    router.refresh();
  }

  if (!setupStatus) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdminSetup = setupStatus.isFirstUser;

  return (
    <div className="w-full max-w-md fade-up">
      {/* Admin setup banner */}
      {isAdminSetup ? (
        <div className="mb-8 border-l-2 border-accent pl-4 py-2 bg-accent/5">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-3.5 w-3.5 text-accent" />
            <p className="text-xs tracking-[0.15em] uppercase text-accent font-medium">
              Founding Keeper
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You&apos;re the first here. This account will be the{" "}
            <em className="text-foreground font-medium">admin</em> — you&apos;ll
            configure maps, invite family, and run the hub.
          </p>
        </div>
      ) : (
        <div className="mb-8 flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Joining a family</span>
          <span className="text-accent">· {setupStatus.userCount} {setupStatus.userCount === 1 ? "member" : "members"} already</span>
        </div>
      )}

      <div className="mb-10">
        <h2 className="font-display text-5xl leading-[0.95] tracking-tight text-balance">
          {isAdminSetup ? (
            <>
              Begin your
              <br />
              <em className="text-accent">collection.</em>
            </>
          ) : (
            <>
              Pull up a
              <br />
              <em className="text-accent">chair.</em>
            </>
          )}
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          {isAdminSetup
            ? "A few details to set up your hub."
            : "A few details and you're in."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="border-l-2 border-destructive pl-4 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs tracking-[0.15em] uppercase text-muted-foreground">
            Your name
          </Label>
          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
          />
        </div>

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
            minLength={6}
            autoComplete="new-password"
            className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
          />
          <p className="text-xs text-muted-foreground">At least 6 characters</p>
        </div>

        {!isAdminSetup && (
          <div className="space-y-2">
            <Label htmlFor="inviteCode" className="text-xs tracking-[0.15em] uppercase text-muted-foreground">
              Invite Code
            </Label>
            <Input
              id="inviteCode"
              name="inviteCode"
              required
              defaultValue={searchParams.get("code") || ""}
              placeholder="From your family admin"
              className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
          </div>
        )}

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
              {isAdminSetup ? "Open the hub" : "Join the family"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-10 pt-8 border-t border-foreground/10">
        <p className="text-sm text-muted-foreground">
          Already a keeper?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4 decoration-accent decoration-2 hover:text-accent transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background">
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

        <div className="relative z-10 max-w-lg">
          <p className="text-xs tracking-[0.25em] uppercase opacity-60 mb-8">
            — Home, organised
          </p>
          <h1 className="font-display text-6xl xl:text-7xl leading-[0.95] tracking-tight mb-8">
            For all
            <br />
            <em className="font-light">the family</em>
            <br />
            keeps.
          </h1>
          <p className="text-base leading-relaxed opacity-70 max-w-md">
            The biryani spot dad brings up every family dinner. The Zomato
            coupon that expires Sunday. The Amazon code mum forgot about.
            One quiet hub for all of it.
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

      <main className="flex items-center justify-center p-6 lg:p-10">
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}>
          <RegisterForm />
        </Suspense>
      </main>
    </div>
  );
}
