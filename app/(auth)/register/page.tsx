"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ButtonPrimary } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  Mail, 
  Eye,
  EyeOff,
  ArrowRight,
  Flame 
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal harus 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Gagal mendaftarkan akun baru.");
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Auto-confirmed, session already active
        router.push("/dashboard");
        router.refresh();
      } else {
        // Confirmation email required
        setSuccessMsg(
          "Pendaftaran berhasil! Silakan cek kotak masuk email Anda untuk mengonfirmasi pendaftaran akun."
        );
        setLoading(false);
      }
    } catch {
      setErrorMsg("Terjadi kesalahan sistem saat mendaftarkan akun.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative group">
      {/* Subtle Outer Card Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/30 to-link-teal/20 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none" />

      {/* Frosted Glass Register Card */}
      <div className="relative rounded-2xl bg-[#0f1420]/50 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_0_rgba(255,255,255,0.2),0_0_35px_-5px_rgba(139,127,232,0.25)] p-6 sm:p-8 space-y-5 text-left">
        
        {/* Card Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-3 shadow-sm">
            <Flame className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold font-sans text-text-primary tracking-tight">
            Daftar Akun Droppr
          </h2>
          <p className="text-body-sm text-text-secondary font-sans">
            Mulai kelola seluruh airdrop dalam satu workspace personal.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-badge-bg-overdue/80 border border-status-overdue text-status-overdue text-body-sm flex items-start gap-2.5 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg ? (
          <div className="space-y-4 font-sans">
            <div className="p-4 rounded-xl bg-badge-bg-completed/80 border border-status-completed text-status-completed text-body-sm flex items-start gap-3 backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
            <div className="text-center pt-2">
              <Link href="/login">
                <ButtonPrimary className="w-full rounded-xl">Lanjut ke Login</ButtonPrimary>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-caption font-semibold text-text-secondary font-sans">
                Email
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  name="email"
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full h-11 bg-[#101522] hover:bg-[#151c2c] focus:bg-[#151c2c] text-text-primary text-body-sm pl-10 pr-4 rounded-xl border border-white/15 focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none transition-all placeholder:text-text-tertiary disabled:opacity-50"
                />
                <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-caption font-semibold text-text-secondary font-sans">
                Kata Sandi
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Minimal 6 karakter"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full h-11 bg-[#101522] hover:bg-[#151c2c] focus:bg-[#151c2c] text-text-primary text-body-sm pl-10 pr-12 rounded-xl border border-white/15 focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none transition-all placeholder:text-text-tertiary disabled:opacity-50"
                />
                <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 active:scale-95 transition-all z-20 cursor-pointer flex items-center justify-center"
                  tabIndex={-1}
                  title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-accent" />
                  ) : (
                    <Eye className="w-4 h-4 text-text-secondary" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1.5">
              <label className="block text-caption font-semibold text-text-secondary font-sans">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Ulangi kata sandi"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full h-11 bg-[#101522] hover:bg-[#151c2c] focus:bg-[#151c2c] text-text-primary text-body-sm pl-10 pr-12 rounded-xl border border-white/15 focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none transition-all placeholder:text-text-tertiary disabled:opacity-50"
                />
                <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 active:scale-95 transition-all z-20 cursor-pointer flex items-center justify-center"
                  tabIndex={-1}
                  title={showConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-accent" />
                  ) : (
                    <Eye className="w-4 h-4 text-text-secondary" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <ButtonPrimary
                type="submit"
                className="w-full h-11 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(240,169,59,0.35)] hover:shadow-[0_4px_28px_rgba(240,169,59,0.5)] transition-all font-semibold rounded-xl"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Buat Akun Droppr</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </ButtonPrimary>
            </div>
          </form>
        )}

        {/* Footer Link */}
        <div className="border-t border-white/10 pt-4 text-center text-body-sm text-text-secondary font-sans">
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="text-link-teal hover:underline font-semibold"
          >
            Masuk di sini
          </Link>
        </div>

      </div>
    </div>
  );
}
