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
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-8 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full sm:max-w-[26rem] sm:rounded-2xl sm:border-2 sm:border-border sm:bg-card sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-12">
            <Shield className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-xl">
            {needsBootstrap ? "Create the first IT Admin" : "IT Department"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {needsBootstrap
              ? "No IT accounts exist yet. Create the administrator who can add the rest of the team."
              : "Sign in with your IT account to open the dashboard, requests, and tracker."}
          </p>
        </div>

        <form className="mt-6 space-y-4 sm:mt-7" onSubmit={(event) => void submit(event)}>
          {needsBootstrap && (
            <div className="space-y-1.5">
              <Label htmlFor="it-name">Full name</Label>
              <Input
                id="it-name"
                className="h-12 rounded-lg sm:h-10 sm:rounded-md"
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
              className="h-12 rounded-lg sm:h-10 sm:rounded-md"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
              className="h-12 rounded-lg sm:h-10 sm:rounded-md"
              autoComplete={needsBootstrap ? "new-password" : "current-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={needsBootstrap ? 10 : 1}
              required
            />
            {needsBootstrap ? <p className="text-xs text-muted-foreground">At least 10 characters.</p> : null}
          </div>
          <Button type="submit" className="mt-2 h-12 w-full rounded-full sm:h-10" disabled={busy}>
            {busy ? "Please wait…" : needsBootstrap ? "Create admin" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
