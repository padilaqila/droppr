"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardBase } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ButtonPrimary } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <CardBase className="p-8 shadow-elevation-2 space-y-6">
      <div>
        <h1 className="text-heading-2 font-semibold text-text-primary">
          Daftar Akun Baru
        </h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Buat workspace personal untuk melacak seluruh aktivitas airdropmu.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-md bg-badge-bg-overdue border border-status-overdue text-status-overdue text-body-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg ? (
        <div className="space-y-4">
          <div className="p-4 rounded-md bg-badge-bg-completed border border-status-completed text-status-completed text-body-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
          <div className="text-center pt-2">
            <Link href="/login">
              <ButtonPrimary className="w-full">Kembali ke Login</ButtonPrimary>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="nama@email.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Kata Sandi"
            type="password"
            name="password"
            placeholder="Minimal 6 karakter"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Konfirmasi Kata Sandi"
            type="password"
            name="confirmPassword"
            placeholder="Ulangi kata sandi"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />

          <div className="pt-2">
            <ButtonPrimary
              type="submit"
              className="w-full flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                <span>Buat Akun Droppr</span>
              )}
            </ButtonPrimary>
          </div>
        </form>
      )}

      <div className="border-t border-border-hairline pt-4 text-center text-body-sm text-text-secondary">
        Sudah memiliki akun?{" "}
        <Link
          href="/login"
          className="text-link-teal hover:underline font-medium"
        >
          Masuk di sini
        </Link>
      </div>
    </CardBase>
  );
}
