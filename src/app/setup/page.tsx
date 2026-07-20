"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, AlertCircle, CheckCircle, User, Mail, Lock, Shield } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    teamName: "",
  });

  const validateForm = () => {
    if (!formData.name.trim()) return "Name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!formData.email.includes("@")) return "Invalid email format";
    if (formData.password.length < 8) return "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    if (!formData.teamName.trim()) return "Team name is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          teamName: formData.teamName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Setup failed. Please try again.");
        setLoading(false);
        return;
      }

      setStep("success");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-surface-card/50 border border-border-default rounded-2xl p-8 backdrop-blur-sm">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">Setup Complete!</h1>
              <p className="text-text-dim mb-6">
                Your Vellum workspace has been created successfully. Redirecting to login...
              </p>
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/20 mb-4">
            <Shield className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to Vellum</h1>
          <p className="text-text-dim">Set up your workspace and create the first superadmin account</p>
        </div>

        <div className="bg-surface-card/50 border border-border-default rounded-2xl p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-surface-strong/50 border border-border-subtle rounded-xl p-4 mb-2">
              <div className="flex items-center gap-3 text-text-dim text-sm mb-3">
                <Shield className="w-5 h-5 text-brand-400" />
                <span className="font-medium text-text-muted">Superadmin Account</span>
              </div>
              <p className="text-xs text-text-dim">
                This account will have full access to manage users, teams, and all projects.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-text-muted mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim" />
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-overlay-5 px-10 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                    placeholder="Alex Morgan"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-muted mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-overlay-5 px-10 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                    placeholder="alex@company.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim" />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-overlay-5 px-10 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={8}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-muted mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-overlay-5 px-10 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-text-muted mb-1.5">
                Team Name
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim" />
                <input
                  id="teamName"
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-overlay-5 px-10 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  placeholder="Engineering"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-text-dim mt-1.5">Your first team will be created automatically</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-text-primary hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-card disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Create Workspace
                </>
              )}
            </button>

            <p className="text-center text-xs text-text-dim">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="text-brand-400 hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="text-brand-400 hover:underline">Privacy Policy</a>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-text-dim mt-8">
          Built with ❤️ for teams everywhere
        </p>
      </div>
    </div>
  );
}