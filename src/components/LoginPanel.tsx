import { useNavigate, useRouter } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/user-facing-error";
import { PasswordInput } from "@/components/settings/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { createFirstAdminFn } from "@/lib/request-functions";

export function LoginPanel({ needsBootstrap }: { needsBootstrap: boolean }) {
  const navigate = useNavigate();
  const router = useRouter();
  const { login, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (needsBootstrap) {
        await createFirstAdminFn({ data: { name, email, password } });
        await refresh();
        await router.invalidate();
        toast.success("IT admin account created");
        await navigate({ to: "/dashboard" });
      } else {
        const next = await login(email, password);
        toast.success("Signed in");
        await navigate({ to: next.mustChangePassword ? "/settings" : "/dashboard" });
      }
    } catch (error) {
      toastError(error, "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-3 py-5 sm:px-6 sm:py-16">
      <div className="w-full max-w-none rounded-2xl border-2 border-border bg-card p-5 sm:max-w-[26rem] sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-12">
            <Shield className="size-5 sm:size-6" />
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight sm:mt-4">
            {needsBootstrap ? "Create the first IT Admin" : "IT Department"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {needsBootstrap
              ? "No IT accounts exist yet. Create the administrator who can add the rest of the team."
              : "Sign in with your IT account to open the dashboard, requests, and tracker."}
          </p>
        </div>

        <form className="mt-5 space-y-3.5 sm:mt-7 sm:space-y-4" onSubmit={(event) => void submit(event)}>
          {needsBootstrap && (
            <div className="space-y-1.5">
              <Label htmlFor="it-name">Full name</Label>
              <Input
                id="it-name"
                className="h-10"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="it-email">Email</Label>
            <Input
              id="it-email"
              type="email"
              className="h-10"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="it-password">Password</Label>
            <PasswordInput
              id="it-password"
              className="h-10"
              autoComplete={needsBootstrap ? "new-password" : "current-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={needsBootstrap ? 10 : 1}
              required
            />
            {needsBootstrap ? <p className="text-xs text-muted-foreground">At least 10 characters.</p> : null}
          </div>
          <Button type="submit" className="mt-2 h-10 w-full rounded-full" disabled={busy}>
            {busy ? "Please wait…" : needsBootstrap ? "Create admin" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
