import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

export const RegisterPage: React.FC = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", displayName: "", password: "" });
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/register", form);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[rgba(99,102,241,0.06)] rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-[10px] bg-[#6366f1] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" strokeWidth={2.5} stroke="white" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-[#f1f5f9]">
            Stock<span className="text-[#818cf8]">Lens</span>
          </span>
        </div>

        <div className="glass-card p-8">
          <h1 className="text-xl font-bold text-center mb-1">Create your account</h1>
          <p className="text-sm text-[#94a3b8] text-center mb-6">
            Start paper trading with ₹10,00,000 virtual cash
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-[10px] bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] text-[#f43f5e] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Full name</label>
              <input
                id="register-name"
                type="text"
                placeholder="Rahul Sharma"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Email address</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Password</label>
              <input
                id="register-password"
                type="password"
                placeholder="Min. 8 characters, upper + lower + number"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
              Create account
            </Button>
          </form>

          <div className="mt-4 p-3 rounded-[8px] bg-[#111827] border border-[#1f2d45]">
            <p className="text-[11px] text-[#475569] text-center leading-relaxed">
              By registering you acknowledge this is a simulated trading platform. 
              No real money is involved. AI analysis is informational only.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-[#94a3b8] mt-6">
          Already have an account?{" "}
          <Link to="/" className="text-[#818cf8] hover:text-[#6366f1] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
