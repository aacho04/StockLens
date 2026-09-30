import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@stocklens/validators";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

export const LoginPage: React.FC = () => {
  const [error, setError] = useState("");
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setError("");
    try {
      const res = await apiClient.post("/auth/login", data);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[rgba(99,102,241,0.06)] rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Logo */}
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

        {/* Card */}
        <div className="glass-card p-8">
          <h1 className="text-xl font-bold text-center mb-1">Welcome back</h1>
          <p className="text-sm text-[#94a3b8] text-center mb-6">
            Sign in to your StockLens account
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-[10px] bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] text-[#f43f5e] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-[#f43f5e]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-[#f43f5e]">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} size="lg" className="mt-2">
              Sign in
            </Button>
          </form>

          {/* Disclaimer */}
          <div className="mt-4 p-3 rounded-[8px] bg-[#111827] border border-[#1f2d45]">
            <p className="text-[11px] text-[#475569] text-center leading-relaxed">
              ⚠️ StockLens simulates trading with virtual currency only. Not a real brokerage. 
              AI analysis is informational only.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-[#94a3b8] mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-[#818cf8] hover:text-[#6366f1] font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};
