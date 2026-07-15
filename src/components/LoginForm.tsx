"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import { brand } from "@/lib/brand";
import { BrandLogo } from "@/components/BrandLogo";

interface LoginFormProps {
  initialError?: string;
  isDev?: boolean;
}

export default function LoginForm({ initialError = "", isDev = false }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.redirect) {
          router.push(data.redirect);
          router.refresh();
          return;
        }
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <BrandLogo variant="light" className="h-9 w-auto max-w-[200px]" />
          </div>
          <h1 className="sr-only">{brand.displayName}</h1>
          <p className="text-sm text-slate-500 mt-1">{brand.tagline}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Sign in to your account</h2>

          {(error || initialError) && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-600 mb-6">
              {error || initialError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 transition"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Demo credentials - only in development */}
          {isDev && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-3">Demo accounts (password: <code className="text-brand-600">password123</code>)</p>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { email: `alex@${brand.emailDomain}`, role: "Superadmin" },
                  { email: `sarah@${brand.emailDomain}`, role: "Admin" },
                  { email: `marcus@${brand.emailDomain}`, role: "Member" },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => {
                      setEmail(demo.email);
                      setPassword("password123");
                    }}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-slate-100 transition text-left group"
                  >
                    <span className="text-slate-600 group-hover:text-slate-900">{demo.email}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                      {demo.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Built with ❤️ for teams everywhere
        </p>
      </div>
    </div>
  );
}
