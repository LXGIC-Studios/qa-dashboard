"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Zap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split("@")[0],
          },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  };

  const inputClass =
    "w-full bg-surface border border-card-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 min-h-[44px]";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4">
            <Zap size={28} className="text-black" />
          </div>
          <h1 className="text-xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
            SDN
          </h1>
          <p className="text-xs text-muted mt-1 uppercase tracking-widest">
            LXGIC Studios
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-5 md:p-6">
          <h2 className="text-sm font-semibold font-[family-name:var(--font-heading)] mb-4">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-xs text-accent-pink bg-accent-pink/10 border border-accent-pink/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-xs text-muted hover:text-accent transition-colors min-h-[44px]"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
