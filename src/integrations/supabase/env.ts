function readEnv(name: string): string {
  const fromVite =
    typeof import.meta !== "undefined" && import.meta.env
      ? String((import.meta.env as Record<string, unknown>)[name] ?? "")
      : "";
  const fromProcess =
    typeof process !== "undefined" && process.env ? String(process.env[name] ?? "") : "";
  return (fromVite || fromProcess).trim();
}

export function supabaseUrl(): string {
  return readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
}

/** Publishable/anon key. Lovable Cloud may inject either name. */
export function supabasePublishableKey(): string {
  return (
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    readEnv("SUPABASE_PUBLISHABLE_KEY") ||
    readEnv("VITE_SUPABASE_ANON_KEY") ||
    readEnv("SUPABASE_ANON_KEY")
  );
}

export function hasSupabaseBrowserConfig(): boolean {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}
